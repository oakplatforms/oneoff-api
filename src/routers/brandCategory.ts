
import { PrismaClient, Prisma } from '@prisma/client'
import express from 'express'
import { generateIncludes } from '../utils/generateIncludes'
import { generatePrismaError } from '../utils/generatePrismaError'

const prisma = new PrismaClient()
export const brandCategoryRouter = express.Router()

brandCategoryRouter.post('/:marketplaceName/:brandName/:categoryName/brand-category', async (req, res) => {
  const { brandName, categoryName } = req.params

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

brandCategoryRouter.get('/:marketplaceName/:brandName/:categoryName/brand-category/:id', async (req, res) => {
  const { brandName, categoryName, id } = req.params
  const { include } = req.query

  try {
    const brandCategory = await prisma.brandCategory.findUnique({
      where: {
        id,
        brandName: brandName,
        categoryName: categoryName
      },
      include: generateIncludes(include)
    })
  
    res.json(brandCategory || { errorMessage: 'Something went wrong: No Brand Category ID found' })
  } catch (error) {
    const { statusCode, errorMessage } = generatePrismaError(error as Prisma.PrismaClientKnownRequestError)
    res.status(statusCode).send({ errorMessage })
  }
})

brandCategoryRouter.delete('/:marketplaceName/:brandName/:categoryName/brand-category/:id', async (req, res) => {
  const { brandName, categoryName, id } = req.params
  
  try {
    const brandCategory = await prisma.brandCategory.delete({
      where: {
        id: id,
        brandName: { contains: brandName as string },
        categoryName: { contains: categoryName as string }
      },
    })
    res.json(brandCategory || { errorMessage: 'Something went wrong: No Brand Category ID found' })
  } catch (error) {
    const { statusCode, errorMessage } = generatePrismaError(error as Prisma.PrismaClientKnownRequestError)
    res.status(statusCode).send({ errorMessage })
  }
})
