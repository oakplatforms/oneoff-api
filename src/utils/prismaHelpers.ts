import fs from 'node:fs'
import path from 'node:path'
import { Prisma, PrismaClient } from '@prisma/client'
import { PrismaPg } from '@prisma/adapter-pg'
import { Pool, PoolConfig } from 'pg'
import { getDatabaseCredentials, buildDatabaseUrl, clearSecretsCache } from './secretsManager'

let prisma: PrismaClient | null = null
let initPromise: Promise<PrismaClient> | null = null

function getSSLConfig(): PoolConfig['ssl'] {
  const certPath = path.join(process.cwd(), 'certs', 'global-bundle.pem')

  if (fs.existsSync(certPath)) {
    const caCert = fs.readFileSync(certPath, 'utf8')
    return {
      rejectUnauthorized: true,
      ca: caCert,
    }
  }

  return {
    rejectUnauthorized: false,
  }
}

async function getConnectionString(): Promise<string> {
  //Support local development with DATABASE_URL environment variable
  if (process.env.DATABASE_URL) {
    console.log('[PrismaHelper] Using DATABASE_URL from environment')
    const url = new URL(process.env.DATABASE_URL)
    url.searchParams.delete('sslmode')
    return url.toString()
  }

  //Production: fetch credentials from AWS Secrets Manager
  console.log('[PrismaHelper] Fetching credentials from Secrets Manager')
  const secret = await getDatabaseCredentials()
  const databaseUrl = buildDatabaseUrl(secret)

  //Remove sslmode from URL - we configure SSL via pool options
  const url = new URL(databaseUrl)
  url.searchParams.delete('sslmode')
  console.log(`[PrismaHelper] Connecting to: ${url.host}${url.pathname}`)
  return url.toString()
}

async function createPrismaClient(): Promise<PrismaClient> {
  const connectionString = await getConnectionString()

  const pool = new Pool({
    connectionString,
    max: 1,
    idleTimeoutMillis: 30000,
    connectionTimeoutMillis: 2000,
    allowExitOnIdle: true,
    ssl: getSSLConfig(),
  })

  const adapter = new PrismaPg(pool)
  return new PrismaClient({
    adapter,
    log: ['error'],
    errorFormat: 'pretty',
  })
}

//Initialize Prisma client - call this once at Lambda startup
export async function initPrismaClient(): Promise<void> {
  if (!initPromise) {
    initPromise = createPrismaClient()
  }
  prisma = await initPromise
}

//Async getter - ensures client is initialized (use in handlers or when unsure)
export async function getPrismaClient(): Promise<PrismaClient> {
  if (!prisma) {
    await initPrismaClient()
  }
  return prisma!
}

//Sync getter - use in routes after initialization is guaranteed
//Throws if called before initPrismaClient() completes
export function prismaClient(): PrismaClient {
  if (!prisma) {
    throw new Error('PrismaClient not initialized. Ensure initPrismaClient() is called at startup.')
  }
  return prisma
}

//Reset the Prisma client - useful for credential rotation retry logic
export function resetPrismaClient(): void {
  prisma = null
  initPromise = null
  clearSecretsCache()
}

export const generatePrismaError = (err: unknown) => {
  if (err instanceof Prisma.PrismaClientKnownRequestError) {
    switch (err.code) {
    case 'P2002':
      return {
        statusCode: 400,
        customError: `This value already exist: ${err.meta?.target}. Please try another value.`,
      }

    case 'P2014':
      return {
        statusCode: 400,
        prismaError: `Invalid ID or relational constraint: ${err.meta?.target}`,
      }

    case 'P2003':
      return {
        statusCode: 400,
        prismaError: `Invalid relationship reference (foreign key error)`,
      }

    case 'P2021':
      return {
        statusCode: 500,
        prismaError: `Database schema mismatch or missing table/column: ${err.meta?.message || err.message}`,
      }

    default:
      return {
        statusCode: 500,
        prismaError: err.message || 'Unknown Prisma error',
      }
    }
  }

  if (err instanceof Error) {
    return {
      statusCode: 400,
      customError: err.message,
    }
  }

  return {
    statusCode: 500,
    error: 'Unexpected error occurred',
  }
}
