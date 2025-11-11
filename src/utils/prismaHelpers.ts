import fs from 'node:fs'
import path from 'node:path'
import { Prisma, PrismaClient } from '@prisma/client'
import { PrismaPg } from '@prisma/adapter-pg'
import { Pool } from 'pg'

let prisma: PrismaClient

export const getPrismaClient = () => {
  if (!prisma) {
    try {
      console.log('Initializing Prisma client with SSL certificate and connection pooling')

      const certPath = path.join(__dirname, '../../certs/global-bundle.pem')
      let sslConfig: { rejectUnauthorized: boolean; ca?: string } | false = false

      if (fs.existsSync(certPath)) {
        const sslCert = fs.readFileSync(certPath, 'utf8')
        sslConfig = {
          rejectUnauthorized: true,
          ca: sslCert,
        }
        console.log('SSL certificate found, using secure connection')
      } else {
        console.log('SSL certificate not found, using connection without SSL verification (local dev)')
        sslConfig = {
          rejectUnauthorized: false,
        }
      }

      const pool = new Pool({
        connectionString: process.env.DATABASE_URL,
        max: 1,
        idleTimeoutMillis: 30000,
        connectionTimeoutMillis: 2000,
        allowExitOnIdle: true,
        ssl: sslConfig,
      })

      const adapter = new PrismaPg(pool)
      prisma = new PrismaClient({
        adapter,
        log: ['error'],
        errorFormat: 'pretty',
      })

      console.log('Prisma client with connection pooling created successfully')
    } catch (error) {
      console.error('Prisma client initialization error:', error)
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