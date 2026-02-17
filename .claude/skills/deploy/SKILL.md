---
name: deploy
description: Serverless Framework and GitHub Actions deployment workflow for oneoff-api. Use when deploying the API, adding Lambda functions, managing environment variables per stage, or understanding how the CI/CD pipeline works.
disable-model-invocation: true
---

# Deployment Workflow — oneoff-api

## Triggering a deploy

Deployments are fully automated via GitHub Actions. Push to the target branch:

| Branch | Stage | Workflow |
|--------|-------|----------|
| `dev`  | dev   | `.github/workflows/deploy-dev.yml` |
| `stage` | stage | `.github/workflows/deploy-stage.yml` |
| `prod` | prod  | `.github/workflows/deploy-prod.yml` |

There is no local deploy script for stage or prod — those go through CI only.

## Local deploy (dev only)

```bash
npm run deploy:dev
```

This reads environment variables from `.env.dev` (not committed — you need this file locally).

## What the GitHub Actions pipeline does

1. `npm ci` — install dependencies
2. `npx prisma migrate deploy` — apply any pending migrations (uses `DATABASE_URL` secret)
3. `npx prisma generate` — regenerate the Prisma client
4. Configure AWS credentials via **IAM keys** (`AWS_ACCESS_KEY_ID` + `AWS_SECRET_ACCESS_KEY` repo secrets)
5. `serverless deploy --stage {stage}` — package and deploy all Lambda functions

## AWS authentication (IAM keys)

oneoff-api uses static IAM access keys stored as repository secrets:
- `secrets.AWS_ACCESS_KEY_ID`
- `secrets.AWS_SECRET_ACCESS_KEY`

## Environment variables per stage

Lambda environment variables are defined in `serverless.yml` under each function's `environment:` block and reference `${env:VAR_NAME}`. The values are passed in from GitHub Actions `env:` blocks.

**dev stage env vars** (from GitHub repo secrets):
- `DATABASE_URL` — `secrets.DATABASE_URL`
- `STRIPE_SECRET_KEY` — `secrets.STRIPE_SECRET_KEY`
- `STRIPE_WEBHOOK_SECRET` — `secrets.STRIPE_WEBHOOK_SECRET`
- `TEMP_JWT_SECRET` — `secrets.TEMP_JWT_SECRET`
- `CONSUMER_USER_POOL_ID` — `secrets.CONSUMER_USER_POOL_ID`

**prod stage adds:**
- `DATABASE_URL` — `secrets.DATABASE_URL_PROD`
- `ADMIN_USER_POOL_ID` — `secrets.ADMIN_USER_POOL_ID_PROD`
- `PRICING_ENGINE_ARN` — `secrets.PRICING_ENGINE_ARN_PROD`
- Shippo keys: `SHIPPO_SECRET_KEY_PROD`, `SHIPPO_WEBHOOK_SECRET_PROD`, carrier account secrets

## Adding a new environment variable

1. Add it to the function's `environment:` block in `serverless.yml`:
   ```yaml
   functions:
     api:
       environment:
         NEW_VAR: ${env:NEW_VAR}
   ```

2. Add the value as a GitHub **Actions secret** in the repo settings (Settings → Secrets and variables → Actions)

3. Pass it in the `env:` block of the deploy step in each workflow file that needs it:
   ```yaml
   - name: Deploy to Dev
     run: serverless deploy --stage dev --verbose
     env:
       NEW_VAR: ${{ secrets.NEW_VAR }}
   ```

4. Repeat step 3 for all stages (deploy-dev.yml, deploy-stage.yml, deploy-prod.yml)

## Adding a new Lambda function

1. Create the handler file in `lambdas/`, e.g. `lambdas/myHandler.ts`:
   ```typescript
   export const handler = async (event: any) => {
     // handler logic
   }
   ```

2. Add the function to `serverless.yml` under `functions:`:
   ```yaml
   functions:
     myFunction:
       name: oneoff-api-my-function-${sls:stage}
       handler: lambdas/myHandler.handler
       memorySize: 1024
       events:
         - schedule: rate(1 day)   # for cron jobs
   ```

3. Set any function-specific IAM permissions in the `iam.role.statements` section if needed

## Serverless Framework configuration

Config file: `serverless.yml`
- **Stages:** dev, stage, prod (via `${opt:stage, 'dev'}`)
- **Architecture:** arm64 (cost optimized)
- **Bundler:** esbuild (fast, tree-shaken)
- **Sharp layer:** `arn:aws:lambda:us-east-1:992382609315:layer:sharp-arm64:1` (for image processing)
- **Plugins:** `serverless-dotenv-plugin`, `serverless-esbuild`

## Checking a deployment

After deploying, check the AWS Lambda console or CloudWatch logs. The API Gateway endpoint is printed by Serverless after a successful deploy.
