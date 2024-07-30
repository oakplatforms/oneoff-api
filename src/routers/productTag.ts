
import { PrismaClient, Prisma } from '@prisma/client'
import express from 'express'
import { generateIncludes } from '../utils/generateIncludes'
import { generatePrismaError } from '../utils/generatePrismaError'

const prisma = new PrismaClient()
export const productTagRouter = express.Router()

productTagRouter.post('/:marketplaceName/product-tag', async (req, res) => {
  const { productId, tagName, tagValue } = req.body

  try {
    const result = await prisma.productTag.create({
      data: {
        tagValue,
        tag: { connect: { name: tagName } },
        product: { connect: { id: productId } }
      },
    })
    res.json(result)
  } catch (error) {
    const { statusCode, errorMessage } = generatePrismaError(error as Prisma.PrismaClientKnownRequestError)
    res.status(statusCode).send({ errorMessage })
  }
})

productTagRouter.get('/:marketplaceName/product-tag/:id', async (req, res) => {
  const { id } = req.params
  const { include } = req.query

  try {
    const productTag = await prisma.productTag.findUnique({
      where: {
        id
      },
      include: generateIncludes(include)
    })
  
    res.json(productTag || { errorMessage: 'Something went wrong: No Product Tag ID found' })
  } catch (error) {
    const { statusCode, errorMessage } = generatePrismaError(error as Prisma.PrismaClientKnownRequestError)
    res.status(statusCode).send({ errorMessage })
  }
})

productTagRouter.delete('/:marketplaceName/:brandName/brand-category/:id', async (req, res) => {
  const { id } = req.params

  try {
    const productTag = await prisma.productTag.delete({
      where: {
        id: id
      },
    })
    res.json(productTag || { errorMessage: 'Something went wrong: No Product Tag ID found' })
  } catch (error) {
    const { statusCode, errorMessage } = generatePrismaError(error as Prisma.PrismaClientKnownRequestError)
    res.status(statusCode).send({ errorMessage })
  }
})
