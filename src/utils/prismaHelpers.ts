import { Prisma, PrismaClient } from '@prisma/client'
import { PrismaPg } from '@prisma/adapter-pg'
import { Pool } from 'pg'

let prisma: PrismaClient

export const getPrismaClient = () => {
  if (!prisma) {
    try {
      console.log('Initializing Prisma client with client engine')
      console.log('DATABASE_URL exists:', !!process.env.DATABASE_URL)
      console.log('DATABASE_URL length:', process.env.DATABASE_URL?.length || 0)
      
      const pool = new Pool({ connectionString: process.env.DATABASE_URL })
      const adapter = new PrismaPg(pool)
      
      prisma = new PrismaClient({
        adapter,
        log: ['error'],
        errorFormat: 'pretty'
      })
      
      console.log('Prisma client created successfully')
    } catch (error) {
      console.error('Prisma client initialization error:', error)
      console.error('Error details:', {
        name: (error as Error)?.name,
        message: (error as Error)?.message,
        stack: (error as Error)?.stack,
        code: (error as Error & { code?: string })?.code
      })
      throw error
    }
  }
  return prisma
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
