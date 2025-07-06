# CodePipeline Setup Guide

## Prerequisites

1. **AWS CLI configured** with appropriate permissions
2. **GitHub repository** with dev, stage, and main branches
3. **GitHub token** for AWS CodeStar connection

## Step 1: Create GitHub Connection

1. Go to [AWS CodeStar Console](https://console.aws.amazon.com/codesuite/codestar/home)
2. Click "Connections" in the left sidebar
3. Click "Create connection"
4. Select "GitHub" as the provider
5. Click "Connect to GitHub"
6. Authorize AWS to access your GitHub account
7. Copy the **Connection ARN** (looks like: `arn:aws:codestar-connections:us-east-1:123456789012:connection/abc123`)

## Step 2: Update Connection ARN

Edit `serverless-pipeline.yml` and replace all instances of:
```yaml
ConnectionArn: !Sub 'arn:aws:codestar-connections:${AWS::Region}:${AWS::AccountId}:connection/your-connection-id'
```

With your actual connection ARN:
```yaml
ConnectionArn: 'arn:aws:codestar-connections:us-east-1:123456789012:connection/abc123'
```

## Step 3: Deploy Pipeline

```bash
chmod +x deploy-pipeline.sh
./deploy-pipeline.sh
```

## Step 4: Verify Deployment

Check the CloudFormation stack status:
```bash
aws cloudformation describe-stacks --stack-name tcgx-pipeline
```

## Troubleshooting

### Common Issues:

1. **Stack creation fails with "Connection ARN not found"**
   - Make sure you've updated the ConnectionArn in the template
   - Verify the connection exists in CodeStar console

2. **Bucket name already exists**
   - The template now includes region in bucket name to avoid conflicts
   - If still failing, manually delete the existing bucket

3. **IAM permissions insufficient**
   - Ensure your AWS user has CloudFormation, IAM, CodeBuild, and CodePipeline permissions
   - Or use an admin user for initial deployment

4. **GitHub connection pending**
   - Go to CodeStar console and complete the GitHub authorization
   - The connection must be in "Available" status

## Pipeline Behavior

- **dev branch** → deploys to dev environment
- **stage branch** → deploys to stage environment  
- **main branch** → deploys to prod environment

## Files Created

- `tcgx-pipeline-dev` - Dev environment pipeline
- `tcgx-pipeline-stage` - Stage environment pipeline
- `tcgx-pipeline-prod` - Prod environment pipeline
- `tcgx-build-dev` - Dev build project
- `tcgx-build-stage` - Stage build project
- `tcgx-build-prod` - Prod build project 