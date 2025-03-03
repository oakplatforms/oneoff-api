/*eslint-disable @typescript-eslint/no-require-imports*/
const { PrismaClient } = require('@prisma/client')
const { execSync } = require('child_process')

const prisma = new PrismaClient()

beforeAll(async () => {
  execSync('npx prisma migrate reset --force', { stdio: 'inherit' })
  execSync('npx prisma migrate dev', { stdio: 'inherit' })
})

afterAll(async () => {
  await prisma.$disconnect()
})

export { prisma }
