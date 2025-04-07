import { execSync } from 'child_process'

export default async () => {
  console.log('🚀 Global Setup: Resetting test database...')

  execSync(`PGPASSWORD=postgres psql -h localhost -p 5433 -U postgres -c "DROP DATABASE IF EXISTS testdb;"`, { stdio: 'inherit' })
  execSync(`PGPASSWORD=postgres psql -h localhost -p 5433 -U postgres -c "CREATE DATABASE testdb;"`, { stdio: 'inherit' })

  execSync('DATABASE_URL="postgresql://postgres:postgres@localhost:5433/testdb" npx prisma db push', { stdio: 'inherit' })
}
