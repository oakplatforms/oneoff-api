
import { PrismaClient, Prisma } from '@prisma/client'
import express from 'express'
import { generateIncludes } from '../utils/generateIncludes'
import { generatePrismaError } from '../utils/generatePrismaError'

const prisma = new PrismaClient()
export const tagRouter = express.Router()

tagRouter.get('/:marketplaceName/list/tags', async (req, res) => {
  const { marketplaceName } = req.params
  const { include } = req.query

  try {
    const tags = await prisma.tag.findMany({
      where: {
        marketplaceName: { contains: marketplaceName as string }
      },
      include: generateIncludes(include)
    })
  
    res.json(tags)
  } catch (error) {
    const { statusCode, errorMessage } = generatePrismaError(error as Prisma.PrismaClientKnownRequestError)
    res.status(statusCode).send({ errorMessage })
  }
})

tagRouter.post(`/:marketplaceName/tag`, async (req, res) => {
  const { marketplaceName } = req.params
  const { name, displayName, supportedTagValues } = req.body
  
  try {
    const result = await prisma.tag.create({
      data: {
        name,
        displayName,
        supportedTagValues: {
          create: supportedTagValues,
        },
        marketplace: { connect: { name: marketplaceName } }
      },
    })
    res.json(result)
  } catch (error) {
    const { statusCode, errorMessage } = generatePrismaError(error as Prisma.PrismaClientKnownRequestError)
    res.status(statusCode).send({ errorMessage })
  }
})

tagRouter.get('/:marketplaceName/tag/:id', async (req, res) => {
  const { id } = req.params
  const { include } = req.query

  try {
    const tag = await prisma.tag.findUnique({
      where: {
        id,
      },
      include: generateIncludes(include)
    })
  
    res.json(tag || { errorMessage: 'Something went wrong: No Tag ID found' })
  } catch (error) {
    const { statusCode, errorMessage } = generatePrismaError(error as Prisma.PrismaClientKnownRequestError)
    res.status(statusCode).send({ errorMessage })
  }
})

tagRouter.delete(`/:marketplaceName/tag/:id`, async (req, res) => {
  const { id } = req.params

  try {
    const tag = await prisma.tag.delete({
      where: {
        id: id,
      },
    })
    res.json(tag || { errorMessage: 'Something went wrong: No Tag ID found' })
  } catch (error) {
    const { statusCode, errorMessage } = generatePrismaError(error as Prisma.PrismaClientKnownRequestError)
    res.status(statusCode).send({ errorMessage })
  }
})
