# Oneoff API

REST API backend for the Oneoff marketplace. Built with Express, TypeScript, and deployed as AWS Lambda functions via Serverless Framework.

## Tech Stack

- **Runtime:** Node.js 20, TypeScript
- **Framework:** Express 4 on AWS Lambda (via @vendia/serverless-express)
- **Database:** PostgreSQL with Prisma ORM (PrismaPg adapter)
- **Deployment:** Serverless Framework 3, esbuild bundling, arm64 Lambda
- **Auth:** AWS Cognito (consumer + admin pools), JWT validation via custom Lambda authorizer; guest tokens via HS256 `tempJwtSecret` from Secrets Manager
- **Payments:** Stripe
- **Storage:** AWS S3, image processing via Sharp (Lambda layer)
- **Events:** AWS EventBridge, Step Functions
- **Secrets:** AWS Secrets Manager (30-min cache TTL)

## Project Structure

```
src/
├── index.ts            # Express app setup
├── localhost.ts        # Local dev server entry point
├── routers/            # Route handlers (25+ modules, REST endpoints)
│   └── all_routes.ts   # Route aggregator
├── services/           # Business logic (invoice, payout)
├── utils/              # Helpers (prisma, stripe, s3, cognito, pagination, etc.)
├── validation/         # Input validation functions per resource
├── webhooks/           # Stripe webhook processor
├── constants/          # App constants
└── generated/          # Generated types from Prisma JSON schema

lambdas/                # Lambda handler entry points
├── apiHandler.ts       # Main API handler
├── authorizerHandler.ts # JWT authorizer (supports consumer + admin Cognito pools)
├── guestTokenHandler.ts
└── stripeWebhookHandler.ts

prisma/
├── schema.prisma       # Database schema (20+ models)
└── migrations/         # Migration history
```

## Commands

- `npm run dev` — Local dev server
- `npm test` — Run Jest tests (uses Docker PostgreSQL on port 5433)
- `npm run lint` / `npm run lint:fix` — ESLint
- `npm run deploy:dev` — Deploy to dev stage

## Code Style

- No semicolons
- Single quotes
- 2-space indentation
- Line comments only (no block comments)
- ESLint flat config (`eslint.config.mjs`)

## Key Patterns

- **Auth Flow:** Cognito issues JWT → Lambda authorizer validates → user data passed via custom headers (`x-authorizer-role`, `x-authorizer-principalid`, `x-authorizer-userpool`) → Express middleware sets `req.user`. Guest tokens (HS256) are issued for unauthenticated browsing (GET only, 15-min expiry).
- **Admin Auth:** Admin users authenticate via `ADMIN_USER_POOL_ID` Cognito pool. The authorizer assigns `role = 'admin'` based on the `cognito:groups` claim. Admin routes check `req.user.role === 'admin'` via `validateRole()` in `src/validation/user.ts`.
- **Route Handlers:** Feature-based modules in `src/routers/`. RESTful patterns (`/users`, `/accounts/:id`). Aggregated in `all_routes.ts`.
- **Database:** Prisma for type-safe queries. `prismaHelpers.ts` manages client initialization and error translation. `paginatePrisma.ts` for pagination. `generateIncludes.ts` for dynamic relation loading via query params (e.g., `?include=entity&include=entityTags.tag`).
- **Error Handling:** `generatePrismaError` translates Prisma errors to HTTP responses. Try-catch in route handlers with contextual console logging (e.g., `"GET_ENTITIES_ERROR"`).
- **Validation:** Dedicated functions in `validation/` directory, called in route handlers before database operations.
- **Webhooks:** External handlers in `lambdas/`, processing logic in `src/webhooks/`. Validate events then update database.
- **Image Upload:** Multer for multipart handling, Sharp (Lambda layer) for processing, S3 for storage.
- **Secrets:** `secretsManager.ts` fetches from AWS Secrets Manager with 30-min TTL cache. Secret key: `oneoff-credentials-{stage}`. Stores DB credentials, `stripeSecretKey`, `stripeWebhookSecret`, `tempJwtSecret`.

## Database

- Prisma schema at `prisma/schema.prisma`
- Migrations in `prisma/migrations/`
- Models: PascalCase (User, Account, Admin, Entity, Order, etc.)
- Enums: SCREAMING_SNAKE_CASE (ACTIVE, DELETED, IN_REVIEW)
- Connection uses PrismaPg adapter with SSL (RDS cert bundle at `certs/global-bundle.pem`)

## Testing

- Jest 29 with ts-jest, supertest for HTTP testing
- Test database: PostgreSQL 14 via Docker (`docker-compose.yml`, port 5433)
- Tests located alongside routers: `src/routers/*.test.ts`

## Deployment

GitHub Actions deploys on push to `dev`, `stage`, `prod` branches. Uses IAM credentials for AWS auth. Pipeline runs Prisma migrations, generates Prisma client, then deploys via Serverless Framework.
