---
name: prisma-migration
description: Prisma migration workflow for oneoff-api. Use when modifying the database schema, adding models, fields, enums, or relations, or when asked about running/creating migrations.
disable-model-invocation: true
---

# Prisma Migration Workflow

Schema file: `prisma/schema.prisma`
Migrations directory: `prisma/migrations/` (never edit these files directly)

## Local development workflow

1. **Start the test database** (PostgreSQL 14 on port 5433):
   ```bash
   npm run docker:test:up
   ```

2. **Modify the schema** in `prisma/schema.prisma`

3. **Create and apply the migration locally:**
   ```bash
   npx prisma migrate dev --name <descriptive-name>
   ```
   This creates a new file in `prisma/migrations/`, applies it to the local DB, and regenerates the Prisma client.

4. **If you only changed the schema without creating a migration, regenerate the client:**
   ```bash
   npx prisma generate
   ```

5. **Reset the local DB** (drops and re-applies all migrations, useful when iterating):
   ```bash
   npx prisma migrate reset
   ```

## Naming conventions

Use kebab-case, descriptive names:
- `add-product-type-field`
- `add-shipment-model`
- `remove-deprecated-status-enum`

## Common schema patterns in this project

**Models** — PascalCase, include `id`, `createdAt`, `updatedAt`:
```prisma
model ExampleModel {
  id        String   @id @default(uuid())
  createdAt DateTime @default(now())
  updatedAt DateTime @updatedAt
}
```

**Enums** — SCREAMING_SNAKE_CASE:
```prisma
enum ExampleStatus {
  ACTIVE
  DELETED
  PENDING
}
```

**Relations** — define both sides with `@relation`:
```prisma
model Order {
  id      String    @id @default(uuid())
  user    User      @relation(fields: [userId], references: [id])
  userId  String
}
```

## Additive vs destructive changes

- **Safe (additive):** Add a model, add an optional field, add an enum value
- **Requires care:** Add a required field to an existing table (needs a default), rename a column (Prisma treats this as drop + add), delete a model or field
- For destructive changes, review the generated SQL in `prisma/migrations/<timestamp>_<name>/migration.sql` before deploying

## CI/CD — how migrations deploy automatically

Migrations run automatically in GitHub Actions on every push to `dev`, `stage`, or `prod`:

```yaml
- name: Deploy Prisma migrations
  run: npx prisma migrate deploy
  env:
    DATABASE_URL: ${{ secrets.DATABASE_URL }}
```

`prisma migrate deploy` only applies pending migrations — it never creates new ones and never resets the database. It is safe to run in production.
