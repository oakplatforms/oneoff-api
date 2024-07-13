import { PrismaClient, Prisma } from '@prisma/client'
import express from 'express'
import { generateIncludes } from '../utils/generateIncludes'
import { generatePrismaError } from '../utils/generatePrismaError'

const prisma = new PrismaClient()
export const productRouter = express.Router()

productRouter.get('/:marketplaceName/:brandName/list/products', async (req, res) => {
  const { brandName } = req.params
  const { include, category } = req.query

  try {
    const brandCategory = await prisma.brandCategory.findFirstOrThrow({
      where: {
        brandName: brandName,
        categoryName: category as string || ''
      }
    })
    if (brandCategory) {
      const categories = await prisma.product.findMany({
        where: {
          brandCategoryId: brandCategory.id as string
        },
        include: generateIncludes(include)
      })
      res.json(categories)
    }
  } catch (error) {
    const { statusCode, errorMessage } = generatePrismaError(error as Prisma.PrismaClientKnownRequestError)
    res.status(statusCode).send({ errorMessage })
  }
})

productRouter.post(`/:marketplaceName/:brandName/product`, async (req, res) => {
  const { name, type, displayName, description, sku, card, brandCategoryId, setId, productImage, price, releaseDate } = req.body

  try {
    const result = await prisma.product.create({
      data: {
        name,
        type,
        displayName,
        description,
        sku,
        price,
        productImage,
        releaseDate,
        card: {
          create: {
            ...card,
            brandCategory: { connect: { id: brandCategoryId }
          }},
        },
        set: { connect: { id: setId } },
        brandCategory: { connect: { id: brandCategoryId } }
      },
    })
    res.json(result)
  } catch (error) {
    const { statusCode, errorMessage } = generatePrismaError(error as Prisma.PrismaClientKnownRequestError)
    res.status(statusCode).send({ errorMessage })
  }
})

productRouter.get('/:marketplaceName/:brandName/product/:id', async (req, res) => {
  const { id } = req.params
  const { include } = req.query

  try {
    const product = await prisma.product.findUnique({
      where: {
        id
      },
      include: generateIncludes(include)
    })
  
    res.json(product || { errorMessage: 'Something went wrong: No Product ID found' })
  } catch (error) {
    const { statusCode, errorMessage } = generatePrismaError(error as Prisma.PrismaClientKnownRequestError)
    res.status(statusCode).send({ errorMessage })
  }
})

productRouter.delete(`/:marketplaceName/:brandName/product/:id`, async (req, res) => {
  const { id } = req.params

  try {
    const product = await prisma.product.delete({
      where: {
        id: id
      },
    })
    res.json(product || { errorMessage: 'Something went wrong: No Product ID found' })
  } catch (error) {
    const { statusCode, errorMessage } = generatePrismaError(error as Prisma.PrismaClientKnownRequestError)
    res.status(statusCode).send({ errorMessage })
  }
})
