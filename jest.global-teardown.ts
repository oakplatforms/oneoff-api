import { execSync } from 'child_process'
import { PrismaClient } from '@prisma/client'

const prisma = new PrismaClient()

export default async function globalTeardown() {
  console.log('🧹 Global Teardown: Disconnecting and Dropping Test DB...')

  await prisma.$disconnect()

  try {
    execSync(`PGPASSWORD=postgres psql -h localhost -p 5433 -U postgres -c "DROP DATABASE IF EXISTS testdb WITH (FORCE);"`, {
      stdio: 'inherit',
    })
  } catch (error) {
    console.error('Failed to drop test database:', error)
    throw error
  }
}
