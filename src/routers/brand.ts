
import { PrismaClient } from '@prisma/client'
import express from 'express'
import { generateIncludes } from '../utils/generateIncludes'

const prisma = new PrismaClient()
export const brandRouter = express.Router()

brandRouter.get('/:marketplaceName/list/brands', async (req, res) => {
  const { marketplaceName } = req.params
  const { include } = req.query
  const brands = await prisma.brand.findMany({
    where: {
      marketplaceName: { contains: marketplaceName as string }
    },
    include: generateIncludes(include)
  })

  res.json(brands)
})

brandRouter.post(`/:marketplaceName/brand`, async (req, res) => {
  const { marketplaceName } = req.params
  const { name, displayName } = req.body

  const result = await prisma.brand.create({
    data: {
      name,
      displayName,
      marketplace: { connect: { name: marketplaceName } }
    },
  })
  res.json(result)
})

brandRouter.get('/:marketplaceName/brand/:id', async (req, res) => {
  const { marketplaceName, id } = req.params
  const { include } = req.query
  const brand = await prisma.brand.findUnique({
    where: {
      id,
      marketplaceName: marketplaceName
    },
    include: generateIncludes(include)
  })

  res.json(brand)
})

brandRouter.delete(`/:marketplaceName/brand/:id`, async (req, res) => {
  const { marketplaceName, id } = req.params
  const brand = await prisma.brand.delete({
    where: {
      id: id,
      marketplaceName: { contains: marketplaceName as string }
    },
  })
  res.json(brand)
})
