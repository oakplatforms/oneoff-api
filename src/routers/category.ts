
import { PrismaClient } from '@prisma/client'
import express from 'express'
import { generateIncludes } from '../utils/generateIncludes'

const prisma = new PrismaClient()
export const categoryRouter = express.Router()

categoryRouter.get('/:marketplaceName/list/categories', async (req, res) => {
  const { marketplaceName } = req.params
  const { include } = req.query
  const categories = await prisma.category.findMany({
    where: {
      marketplaceName: { contains: marketplaceName as string }
    },
    include: generateIncludes(include)
  })

  res.json(categories)
})

categoryRouter.post(`/:marketplaceName/category`, async (req, res) => {
  const { marketplaceName } = req.params
  const { name, displayName, type } = req.body

  const result = await prisma.category.create({
    data: {
      name,
      displayName,
      type,
      marketplace: { connect: { name: marketplaceName } }
    },
  })
  res.json(result)
})

categoryRouter.get('/:marketplaceName/category/:id', async (req, res) => {
  const { id } = req.params
  const { include } = req.query
  const category = await prisma.category.findUnique({
    where: {
      id,
    },
    include: generateIncludes(include)
  })

  res.json(category)
})

categoryRouter.delete(`/:marketplaceName/category/:id`, async (req, res) => {
  const { id } = req.params
  const category = await prisma.category.delete({
    where: {
      id: id,
    },
  })
  res.json(category)
})
