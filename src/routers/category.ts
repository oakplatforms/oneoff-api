
import { PrismaClient, Prisma } from '@prisma/client'
import express from 'express'
import { generateIncludes } from '../utils/generateIncludes'
import { generatePrismaError } from '../utils/generatePrismaError'

const prisma = new PrismaClient()
export const categoryRouter = express.Router()

categoryRouter.get('/:marketplaceName/list/categories', async (req, res) => {
  const { marketplaceName } = req.params
  const { include } = req.query

  try {
    const categories = await prisma.category.findMany({
      where: {
        marketplaceName: { contains: marketplaceName as string }
      },
      include: generateIncludes(include)
    })
  
    res.json(categories)
  } catch (error) {
    const { statusCode, errorMessage } = generatePrismaError(error as Prisma.PrismaClientKnownRequestError)
    res.status(statusCode).send({ errorMessage })
  }
})

categoryRouter.post(`/:marketplaceName/category`, async (req, res) => {
  const { marketplaceName } = req.params
  const { name, displayName } = req.body

  try {
    const result = await prisma.category.create({
      data: {
        name,
        displayName,
        marketplace: { connect: { name: marketplaceName } }
      },
    })
    res.json(result)
  } catch (error) {
    const { statusCode, errorMessage } = generatePrismaError(error as Prisma.PrismaClientKnownRequestError)
    res.status(statusCode).send({ errorMessage })
  }
})

categoryRouter.get('/:marketplaceName/category/:id', async (req, res) => {
  const { id } = req.params
  const { include } = req.query

  try {
    const category = await prisma.category.findUnique({
      where: {
        id,
      },
      include: generateIncludes(include)
    })
  
    res.json(category || { errorMessage: 'Something went wrong: No Category ID found' })
  } catch (error) {
    const { statusCode, errorMessage } = generatePrismaError(error as Prisma.PrismaClientKnownRequestError)
    res.status(statusCode).send({ errorMessage })
  }
})

categoryRouter.delete(`/:marketplaceName/category/:id`, async (req, res) => {
  const { id } = req.params

  try {
    const category = await prisma.category.delete({
      where: {
        id: id,
      },
    })
    res.json(category || { errorMessage: 'Something went wrong: No Category ID found' })
  } catch (error) {
    const { statusCode, errorMessage } = generatePrismaError(error as Prisma.PrismaClientKnownRequestError)
    res.status(statusCode).send({ errorMessage })
  }
})
