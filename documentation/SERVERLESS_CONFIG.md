# Serverless Configuration

## Overview

The TCGX API is a serverless application built with AWS Lambda and API Gateway, deployed using the Serverless Framework. The service consists of a main API Lambda function and several specialized sub-lambdas that handle specific functionality like webhooks, guest authentication, and authorization.

## Service Architecture

### Main API Lambda
- **Function**: `tcgx-api-{stage}`
- **Handler**: `lambdas/apiHandler.handler`
- **Purpose**: Main API endpoint that handles all authenticated requests
- **Routes**: `/{proxy+}` (catches all API routes)
- **Features**:
  - Sharp image processing layer for image uploads
  - Prisma database integration
  - Stripe payment processing
  - Shippo shipping integration
  - S3 file storage

### Sub-Lambdas

#### 1. Guest Token Lambda
- **Function**: `tcgx-api-guest-token-{stage}`
- **Handler**: `lambdas/guestTokenHandler.handler`
- **Route**: `GET /user/guest-token`
- **Purpose**: Generates short-lived JWT tokens for guest users
- **Authentication**: None (public endpoint)
- **Token Type**: HS256 with temporary secret

#### 2. Stripe Webhook Lambda
- **Function**: `tcgx-api-stripe-webhook-{stage}`
- **Handler**: `lambdas/stripeWebhookHandler.handler`
- **Route**: `POST /webhook/stripe`
- **Purpose**: Processes Stripe webhook events for payment status updates
- **Authentication**: Stripe signature verification
- **Features**:
  - Updates seller account verification status
  - Processes payment confirmations
  - Handles subscription events

#### 3. Shippo Webhook Lambda
- **Function**: `tcgx-api-shippo-webhook-{stage}`
- **Handler**: `lambdas/shippoWebhookHandler.handler`
- **Route**: `POST /webhook/shippo`
- **Purpose**: Processes Shippo webhook events for shipping updates
- **Authentication**: Secret query parameter validation
- **Features**:
  - Updates shipment tracking status
  - Processes label generation events
  - Handles delivery confirmations

#### 4. Lambda Authorizer
- **Function**: `tcgx-api-authorizer-{stage}`
- **Handler**: `lambdas/authorizerHandler.handler`
- **Purpose**: Validates JWT tokens and provides authorization context
- **Token Types Supported**:
  - **Cognito Tokens**: RS256 tokens from AWS Cognito User Pools
    - Admin User Pool: Full admin access
    - Client Apps User Pool: Customer access
  - **Guest Tokens**: HS256 tokens for temporary guest access
- **Features**:
  - Automatic webhook bypass for `/api/v1/webhook/*` routes
  - Role-based access control (admin, customer, guest, webhook)
  - User pool identification and context passing

## Authentication Flow

1. **Guest Users**: Request guest token → Receive HS256 JWT → Access limited endpoints
2. **Authenticated Users**: Login via Cognito → Receive RS256 JWT → Access full features
3. **Webhooks**: Bypass authentication entirely for external service callbacks with signatures

## Environment Variables

### Required for All Environments
- `DATABASE_URL`: Prisma database connection string
- `TEMP_JWT_SECRET`: Secret for guest token generation
- `ADMIN_USER_POOL_ID`: Cognito Admin User Pool ID
- `CLIENT_APPS_USER_POOL_ID`: Cognito Client Apps User Pool ID

### Payment Processing
- `STRIPE_SECRET_KEY`: Stripe API secret key
- `STRIPE_WEBHOOK_SECRET`: Stripe webhook signature verification

### Shipping Integration
- `SHIPPO_SECRET_KEY`: Shippo API secret key
- `SHIPPO_WEBHOOK_SECRET`: Shippo webhook validation secret
- `SHIPPO_CARRIER_ACCOUNT_*`: Carrier account IDs for USPS, UPS, FedEx, DHL

### Storage
- `S3_BUCKET_NAME`: S3 bucket for file uploads (auto-configured per stage)

## Deployment

The service is deployed to three environments:
- **Dev**: `tcgx-api-dev`
- **Stage**: `tcgx-api-stage` 
- **Prod**: `tcgx-api-prod`

Each environment has its own:
- Database instance
- S3 bucket
- Cognito User Pools
- Stripe/Shippo webhook endpoints

## Security Features

- **Lambda Authorizer**: Validates all API requests except webhooks
- **Webhook Security**: Signature verification for Stripe, secret validation for Shippo
- **Guest Token Security**: Short-lived tokens with limited permissions
- **Environment Isolation**: Separate secrets and resources per environment
- **IAM Roles**: Least-privilege access to AWS services

## Monitoring & Logging

- CloudWatch logs for all Lambda functions
- X-Ray tracing for request flow analysis
- Custom logging for authorization decisions
- Error tracking for webhook processing

## Dependencies

- **Serverless Framework**: Infrastructure as code
- **Prisma**: Database ORM and migrations
- **Sharp**: Image processing
- **jsonwebtoken**: JWT token handling
- **jwks-rsa**: Cognito public key verification
- **Stripe SDK**: Payment processing
- **Shippo SDK**: Shipping integration 