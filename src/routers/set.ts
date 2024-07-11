
import { PrismaClient, Prisma } from '@prisma/client'
import express from 'express'
import { generateIncludes } from '../utils/generateIncludes'
import { generatePrismaError } from '../utils/generatePrismaError'

const prisma = new PrismaClient()
export const setRouter = express.Router()

setRouter.post(`/:marketplaceName/:brandName/set`, async (req, res) => {
  const { name, type, displayName, description, products, brandCategoryId } = req.body

  try {
    const productData = products?.map((product: Prisma.ProductCreateInput) => {
      return {
        ...product,
        brandCategory: { connect: { id: brandCategoryId }
      }}
    })
    
    const result = await prisma.set.create({
      data: {
        name,
        displayName,
        description,
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

setRouter.get('/:marketplaceName/:brandName/set/:id', async (req, res) => {
  const { id } = req.params
  const { include } = req.query

  try {
    const set = await prisma.set.findUnique({
      where: { id },
      include: generateIncludes(include)
    })
  
    res.json(set || { errorMessage: 'Something went wrong: No Set ID found' })
  } catch (error) {
    console.log('error')
    const { statusCode, errorMessage } = generatePrismaError(error as Prisma.PrismaClientKnownRequestError)
    res.status(statusCode).send({ errorMessage })
  }
})

setRouter.delete(`/:marketplaceName/:brandName/set/:id`, async (req, res) => {
  const { id } = req.params
  try {
    const set = await prisma.set.delete({
      where: {
        id: id
      },
    })
    res.json(set || { errorMessage: 'Something went wrong: No Set ID found' })
  } catch (error) {
    const { statusCode, errorMessage } = generatePrismaError(error as Prisma.PrismaClientKnownRequestError)
    res.status(statusCode).send({ errorMessage })
  }
})
