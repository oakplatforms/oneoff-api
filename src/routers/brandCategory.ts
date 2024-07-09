
import { PrismaClient } from '@prisma/client'
import express from 'express'
import { generateIncludes } from '../utils/generateIncludes'

const prisma = new PrismaClient()
export const brandCategoryRouter = express.Router()


brandCategoryRouter.post('/:marketplaceName/:brandName/:categoryName/brand-category', async (req, res) => {
  const { brandName, categoryName } = req.params

  const result = await prisma.brandCategory.create({
    data: {
      brand: { connect: { name: brandName } },
      category: { connect: { name: categoryName } }
    },
  })
  res.json(result)
})

brandCategoryRouter.get('/:marketplaceName/:brandName/:categoryName/brand-category/:id', async (req, res) => {
  const { brandName, categoryName, id } = req.params
  const { include } = req.query
  const brandCategory = await prisma.brandCategory.findUnique({
    where: {
      id,
      brandName: brandName,
      categoryName: categoryName
    },
    include: generateIncludes(include)
  })

  res.json(brandCategory)
})

brandCategoryRouter.delete('/:marketplaceName/:brandName/:categoryName/brand-category/:id', async (req, res) => {
  const { brandName, categoryName, id } = req.params
  const brandCategory = await prisma.brandCategory.delete({
    where: {
      id: id,
      brandName: { contains: brandName as string },
      categoryName: { contains: categoryName as string }
    },
  })
  res.json(brandCategory)
})
