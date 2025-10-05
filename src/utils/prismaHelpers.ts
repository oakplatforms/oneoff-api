import { Prisma, PrismaClient } from '@prisma/client'
import { withAccelerate } from '@prisma/extension-accelerate'

let prisma: PrismaClient
let prismaAccelerate: PrismaClient

const createAccelerateClient = () => {
  if (process.env.PRISMA_ACCELERATE_URL) {
    console.log('Using Accelerate client')
    return new PrismaClient({
      datasourceUrl: process.env.PRISMA_ACCELERATE_URL,
    }).$extends(withAccelerate())
  } else {
    console.log('Using regular client in accelerate mode')
    return new PrismaClient()
  }
}

export const getPrismaClient = () => {
  if (!prisma) {
    try {
      console.log('Using regular client')
      prisma = new PrismaClient()
    } catch (error) {
      console.error('Prisma client initialization error:', error)
      throw error
    }
  }
  return prisma
}

export const getPrismaAccelerateClient = () => {
  if (!prismaAccelerate) {
    try {
      prismaAccelerate = createAccelerateClient() as PrismaClient
    } catch (error) {
      console.error('Prisma Accelerate client initialization error:', error)
      throw error
    }
  }
  return prismaAccelerate
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
