
import { PrismaClient, Prisma } from '@prisma/client'
import express from 'express'
import { generateIncludes } from '../utils/generateIncludes'
import { generatePrismaError } from '../utils/generatePrismaError'

const prisma = new PrismaClient()
export const collectionRouter = express.Router()

collectionRouter.post(`/:marketplaceName/:brandName/collection`, async (req, res) => {
  const { name, type, displayName, description, products, brandCategoryId } = req.body

  try {
    const productData = products?.map((product: Prisma.ProductCreateInput) => {
      return {
        ...product,
        brandCategory: { connect: { id: brandCategoryId }
      }}
    })
    
    const result = await prisma.collection.create({
      data: {
        name,
        displayName,
        description,
        type,
        products: {
          create: productData,
        },
        brandCategory: { connect: { id: brandCategoryId } },
      },
    })
    res.json(result)
  } catch (error) {
    const { statusCode, errorMessage } = generatePrismaError(error as Prisma.PrismaClientKnownRequestError)
    res.status(statusCode).send({ errorMessage })
  }
})

collectionRouter.get('/:marketplaceName/:brandName/collection/:id', async (req, res) => {
  const { id } = req.params
  const { include } = req.query

  try {
    const collection = await prisma.collection.findUnique({
      where: { id },
      include: generateIncludes(include)
    })
  
    res.json(collection || { errorMessage: 'Something went wrong: No Collection ID found' })
  } catch (error) {
    console.log('error')
    const { statusCode, errorMessage } = generatePrismaError(error as Prisma.PrismaClientKnownRequestError)
    res.status(statusCode).send({ errorMessage })
  }
})

collectionRouter.delete(`/:marketplaceName/:brandName/collection/:id`, async (req, res) => {
  const { id } = req.params
  try {
    const collection = await prisma.collection.delete({
      where: {
        id: id
      },
    })
    res.json(collection || { errorMessage: 'Something went wrong: No Collection ID found' })
  } catch (error) {
    const { statusCode, errorMessage } = generatePrismaError(error as Prisma.PrismaClientKnownRequestError)
    res.status(statusCode).send({ errorMessage })
  }
})
