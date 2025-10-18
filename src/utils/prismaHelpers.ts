import { Prisma, PrismaClient } from '@prisma/client'

let prisma: PrismaClient

const getDatabaseUrl = () => {
  //Temporarily bypass RDS Proxy to test basic Prisma fix
  //const proxyEndpoint = process.env.RDS_PROXY_ENDPOINT
  const databaseUrl = process.env.DATABASE_URL

  //For now, always use direct connection to test Prisma fix
  console.log('Bypassing RDS Proxy for testing - using direct connection')
  return databaseUrl

  //Original RDS Proxy logic (commented out for testing)
  //if (proxyEndpoint && databaseUrl) {
  //const url = new URL(databaseUrl)
  //url.hostname = proxyEndpoint
  //url.port = '5432'
  //return url.toString()
  //}
}

export const getPrismaClient = () => {
  if (!prisma) {
    try {
      console.log('Initializing Prisma client')
      const databaseUrl = getDatabaseUrl()
      console.log('Using database URL:', databaseUrl?.replace(/\/\/.*@/, '//***:***@'))
      console.log('RDS Proxy endpoint:', process.env.RDS_PROXY_ENDPOINT)
      console.log('Original DATABASE_URL:', process.env.DATABASE_URL?.replace(/\/\/.*@/, '//***:***@'))
      prisma = new PrismaClient({
        log: process.env.NODE_ENV === 'development' ? ['query', 'info', 'warn', 'error'] : ['error'],
        datasources: {
          db: {
            url: databaseUrl
          }
        }
      })
    } catch (error) {
      console.error('Prisma client initialization error:', error)
      throw error
    }
  }
  return prisma
}

export const disconnectPrisma = async () => {
  if (prisma) {
    await prisma.$disconnect()
    prisma = undefined as unknown as PrismaClient
  }
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