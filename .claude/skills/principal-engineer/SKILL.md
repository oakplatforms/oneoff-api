---
name: principal-engineer
description: Principal-level engineering standards and architecture principles for this codebase. Apply these when designing features, reviewing code, making architectural decisions, or evaluating tradeoffs in oneoff-api.
user-invocable: false
---

# Principal Backend Engineering Standards — oneoff-api

## Architecture principles

- Prefer **event-driven, decoupled design**: use EventBridge for cross-service communication rather than tight coupling between Lambda functions
- Each Lambda handler should do one thing well — thin handler, logic in `src/services/` or `src/utils/`
- Avoid shared mutable state across invocations; Lambda execution environments are ephemeral
- Serverless-first: resist adding EC2/ECS for workloads that fit Lambda's constraints
- Design for **horizontal scalability** from the start — stateless handlers, externalized state in RDS/S3

## TypeScript standards

- Strict typing everywhere — avoid `any`; use `unknown` with narrowing when type is genuinely unknown
- Domain boundaries matter: keep route handler types, Prisma types, and API response types separate
- Prefer explicit return types on exported functions
- No implicit coercion — validate at the boundary (request input), trust internal types

## PostgreSQL & Prisma

**Schema design:**
- Model names: PascalCase. Enum values: SCREAMING_SNAKE_CASE
- Every model needs `id` (uuid), `createdAt`, `updatedAt`
- Add indexes on foreign keys and columns used in `WHERE` clauses on large tables
- Prefer nullable fields over sentinel values (`null` not `""` or `0`)

**Query performance:**
- Use `select` to limit returned columns on large models — never load full rows when only a few fields are needed
- Use `generateIncludes.ts` for dynamic relation loading via query params — don't build ad-hoc includes in handlers
- Paginate all list endpoints using `paginatePrisma.ts`
- Avoid N+1 queries — prefer a single query with nested `include` over multiple sequential queries

**Migration safety:**
- Additive changes (add model, add optional field, add enum value) are safe to deploy
- Destructive changes (rename, delete, make nullable required) need a multi-step migration strategy
- Review generated SQL in `prisma/migrations/<timestamp>/migration.sql` before deploying
- Never edit migration files directly

## Serverless & Lambda architecture

- **Memory sizing**: API function is 1024 MB — higher memory = more CPU, faster cold start
- **Cold starts**: The Sharp layer adds cold start time; keep handler init code (outside the handler function) minimal
- **Ephemeral storage**: 512 MB — use S3 for anything that must persist across invocations
- **Timeouts**: Set appropriate timeouts per function type; webhook handlers need enough time for Stripe retries
- **IAM least privilege**: Each function should only have the permissions it actually needs

## Security standards

- JWT validation happens in the Lambda authorizer (`lambdas/authorizerHandler.ts`) — never re-implement auth logic in route handlers
- Guest tokens (`lambdas/guestTokenHandler.ts`) are HS256-signed, 15-minute TTY, GET-only — validate scope in the authorizer
- Use `req.user` (set by Express middleware from authorizer headers) — never trust user-supplied identity fields in request body
- Secrets live in AWS Secrets Manager — the `DATABASE_URL` and Stripe/Shippo keys in GitHub Actions secrets should eventually migrate there
- S3 objects use presigned URLs for access — never expose bucket names or generate public URLs
- Validate all input at the system boundary using functions in `src/validation/` before touching the database
- RBAC via Cognito groups — check `req.user.role` and `req.user.userPool` for authorization decisions

## API design

- RESTful resource naming: nouns, plural (`/orders`, `/entities/:id`)
- Consistent error responses via `generatePrismaError` — don't invent custom error shapes
- Use HTTP status codes correctly: 200 OK, 201 Created, 400 Bad Request, 401 Unauthorized, 403 Forbidden, 404 Not Found, 409 Conflict, 500 Internal Server Error
- Pagination on all list endpoints — no unbounded queries to the database
- Support `?include=` query params for dynamic relation loading via `generateIncludes.ts`

## Observability & reliability

- Every catch block logs with a contextual error code string, e.g. `console.error('GET_ORDERS_ERROR', error)`
- Structured logging — include enough context (resource ID, user ID) to trace an incident in CloudWatch
- Webhook handlers must be idempotent — Stripe can replay events
- Step Functions handle long-running or retry-sensitive workflows — don't put complex orchestration in a single Lambda

## Code review lens

When reviewing code, ask:
1. Is input validated before it reaches the database?
2. Are all list queries paginated?
3. Does this introduce a new AWS permission that isn't scoped appropriately?
4. Is there a query that could be N+1 at scale?
5. Does a new migration have a destructive step that needs a rollback plan?
6. Is auth enforced at the authorizer layer, not inside the handler?
7. Are secrets accessed securely and not logged or exposed in responses?
