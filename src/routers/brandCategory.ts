
import { PrismaClient, Prisma } from '@prisma/client'
import express from 'express'
import { generateIncludes } from '../utils/generateIncludes'
import { generatePrismaError } from '../utils/generatePrismaError'

const prisma = new PrismaClient()
export const brandCategoryRouter = express.Router()

brandCategoryRouter.post('/:marketplaceName/:brandName/brand-category', async (req, res) => {
  const { brandName } = req.params
  const { categoryName } = req.body

  try {
    const result = await prisma.brandCategory.create({
      data: {
        brand: { connect: { name: brandName } },
        category: { connect: { name: categoryName } }
      },
    })
    res.json(result)
  } catch (error) {
    const { statusCode, errorMessage } = generatePrismaError(error as Prisma.PrismaClientKnownRequestError)
    res.status(statusCode).send({ errorMessage })
  }
})

brandCategoryRouter.get('/:marketplaceName/:brandName/brand-category/:id', async (req, res) => {
  const { brandName, id } = req.params
  const { include } = req.query

  try {
    const brandCategory = await prisma.brandCategory.findUnique({
      where: {
        id,
        brandName: brandName
      },
      include: generateIncludes(include)
    })
  
    res.json(brandCategory || { errorMessage: 'Something went wrong: No Brand Category ID found' })
  } catch (error) {
    const { statusCode, errorMessage } = generatePrismaError(error as Prisma.PrismaClientKnownRequestError)
    res.status(statusCode).send({ errorMessage })
  }
})

brandCategoryRouter.delete('/:marketplaceName/:brandName/brand-category/:id', async (req, res) => {
  const { brandName, id } = req.params
  
  try {
    const brandCategory = await prisma.brandCategory.delete({
      where: {
        id: id,
        brandName: { contains: brandName },
      },
    })
    res.json(brandCategory || { errorMessage: 'Something went wrong: No Brand Category ID found' })
  } catch (error) {
    const { statusCode, errorMessage } = generatePrismaError(error as Prisma.PrismaClientKnownRequestError)
    res.status(statusCode).send({ errorMessage })
  }
})
