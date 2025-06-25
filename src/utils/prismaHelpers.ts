import { Prisma, PrismaClient } from '@prisma/client'

let prisma: PrismaClient

export const getPrismaClient = (): PrismaClient => {
  if (!prisma) {
    prisma = new PrismaClient()
  }
  return prisma
}

export const generatePrismaError = (err: Prisma.PrismaClientKnownRequestError) => {
  switch (err.code) {
  case 'P2002':
    return {
      statusCode: 400,
      prismaError: `Duplicate field value: ${err.meta?.target}`,
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
      prismaError: `Unexpected database error: ${err.message}`,
    }
  }
}
