
import { PrismaClient } from '@prisma/client'
import express from 'express'
import { generateIncludes } from '../utils/generateIncludes'

const prisma = new PrismaClient()
export const productRouter = express.Router()

productRouter.get('/:tcgName/list/products', async (req, res) => {
  const { tcgName } = req.params
  const { include } = req.query
  const products = await prisma.product.findMany({
    where: {
      tcgName: { contains: tcgName as string }
    },
    include: generateIncludes(include)
  })

  res.json(products)
})

productRouter.post(`/:tcgName/product`, async (req, res) => {
  const { tcgName } = req.params
  const { name, type, displayName, description, sku, card } = req.body

  const result = await prisma.product.create({
    data: {
      name,
      type,
      displayName,
      description,
      sku,
      card: {
        create: { ...card, tcgName: tcgName },
      },
      tcg: { connect: { name: tcgName } }
    },
  })
  res.json(result)
})

productRouter.get('/:tcgName/product/:id', async (req, res) => {
  const { tcgName, id } = req.params
  const { include } = req.query
  const products = await prisma.product.findUnique({
    where: {
      id,
      tcgName: tcgName
    },
    include: generateIncludes(include)
  })

  res.json(products)
})

productRouter.delete(`/:tcgName/product/:id`, async (req, res) => {
  const { id, tcgName } = req.params
  const product = await prisma.product.delete({
    where: {
      id: id,
      tcgName: { contains: tcgName as string }
    },
  })
  res.json(product)
})
