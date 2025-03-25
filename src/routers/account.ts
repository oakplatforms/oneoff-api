import { Prisma } from '@prisma/client'
import express from 'express'
import { generateIncludes } from '../utils/generateIncludes'
import { getPrismaClient, generatePrismaError } from '../utils/prismaHelpers'

const prisma = getPrismaClient()
export const accountRouter = express.Router()

accountRouter.get('/accounts', async (req, res) => {
  const { include } = req.query

  try {
    const accounts = await prisma.account.findMany({
      include: generateIncludes(include)
    })
    res.json(accounts)
  } catch (error) {
    const { statusCode, errorMessage } = generatePrismaError(error as Prisma.PrismaClientKnownRequestError)
    res.status(statusCode).send({ errorMessage })
  }
})
