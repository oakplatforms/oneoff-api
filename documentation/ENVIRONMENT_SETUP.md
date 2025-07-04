# Environment Setup Guide

This project supports three environments: `dev`, `stage`, and `prod`. Each environment has its own set of environment variables and configurations.

## Environment Files

The project includes template files for each environment:
- `env.dev.template` - Development environment variables
- `env.stage.template` - Staging environment variables  
- `env.prod.template` - Production environment variables

## Setup Instructions

1. **Copy the template files** to create your actual environment files:
   ```bash
   cp env.dev.template .env.dev
   cp env.stage.template .env.stage
   cp env.prod.template .env.prod
   ```

2. **Fill in your actual values** in each `.env.{stage}` file with your real credentials and configuration.

3. **Deploy to different stages** using the `--stage` flag:
   ```bash
   # Deploy to development
   serverless deploy --stage dev
   
   # Deploy to staging
   serverless deploy --stage stage
   
   # Deploy to production
   serverless deploy --stage prod
   ```

## Environment Variables

The following environment variables are configured for each stage:

### Database
- `DATABASE_URL` - PostgreSQL connection string

### AWS Services
- `S3_BUCKET_NAME` - S3 bucket name (automatically set based on stage)

### External APIs
- `STRIPE_SECRET_KEY` - Stripe API secret key
- `STRIPE_WEBHOOK_SECRET` - Stripe webhook endpoint secret
- `SHIPPO_SECRET_KEY` - Shippo API secret key
- `SHIPPO_WEBHOOK_SECRET` - Shippo webhook endpoint secret

### Shipping Carrier Accounts
- `SHIPPO_CARRIER_ACCOUNT_USPS` - USPS carrier account ID
- `SHIPPO_CARRIER_ACCOUNT_UPS` - UPS carrier account ID
- `SHIPPO_CARRIER_ACCOUNT_FEDEX` - FedEx carrier account ID
- `SHIPPO_CARRIER_ACCOUNT_DHL` - DHL carrier account ID

## How It Works

The `serverless.yml` file uses the `serverless-dotenv-plugin` to load environment variables based on the stage. The configuration automatically:

1. Loads the appropriate `.env.{stage}` file
2. Maps environment variables to the correct stage-specific values
3. Injects them into your Lambda functions

## Security Notes

- Never commit actual `.env.{stage}` files to version control
- Use AWS Systems Manager Parameter Store or AWS Secrets Manager for production secrets
- Consider using different API keys for each environment (especially Stripe test vs live keys)

## Adding New Environment Variables

To add new environment variables:

1. Add the variable to the appropriate template files (`env.{stage}.template`)
2. Add the variable mapping in the `custom` section of `serverless.yml`
3. Reference the variable in the function's `environment` section

Example:
```yaml
# In custom section
custom:
  newVariable:
    dev: ${env:DEV_NEW_VARIABLE}
    stage: ${env:STAGE_NEW_VARIABLE}
    prod: ${env:PROD_NEW_VARIABLE}

# In function environment section
environment:
  NEW_VARIABLE: ${self:custom.newVariable.${sls:stage}}
``` 