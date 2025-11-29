import { PrismaClient } from '@prisma/client'
import { PrismaPg } from '@prisma/adapter-pg'
import { Pool } from 'pg'

const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
})

const adapter = new PrismaPg(pool)
const prisma = new PrismaClient({ adapter })

/**
 * Create a test user and associated account
 */
export async function createTestUserAndAccount() {
  const user = await prisma.user.create({
    data: {
      authId: `test-auth-${Math.random().toString(36).substring(7)}`,
    },
  })

  const account = await prisma.account.create({
    data: {
      userId: user.id,
    },
  })

  return { user, account }
}

/**
 * Clean up all test data
 */
export async function cleanTestDatabase() {
  await prisma.brand.deleteMany()
  await prisma.account.deleteMany()
  await prisma.user.deleteMany()
}
