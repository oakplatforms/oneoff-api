
import { PrismaClient, Prisma } from '@prisma/client'
import express from 'express'
import { generateIncludes } from '../utils/generateIncludes'

const prisma = new PrismaClient()
export const setRouter = express.Router()

setRouter.post(`/:marketplaceName/:brandName/set`, async (req, res) => {
  const { name, type, displayName, description, products, brandCategoryId } = req.body

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
})

setRouter.get('/:marketplaceName/:brandName/set/:id', async (req, res) => {
  const { id, brandName } = req.params
  const { include } = req.query
  const set = await prisma.set.findUnique({
    where: {
      id
    },
    include: generateIncludes(include)
  })

  res.json(set)
})

setRouter.delete(`/:marketplaceName/:brandName/set/:id`, async (req, res) => {
  const { id } = req.params
  const set = await prisma.set.delete({
    where: {
      id: id
    },
  })
  res.json(set)
})
