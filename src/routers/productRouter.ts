
import { PrismaClient } from '@prisma/client'
import express from 'express'
const prisma = new PrismaClient()
export const productRouter = express.Router()

productRouter.get('/:tcgName/list/products', async (req, res) => {
  const { tcgName } = req.params

  const products = await prisma.product.findMany({
    where: {
      tcgName: { contains: tcgName as string }
    }
  })

  res.json(products)
})

productRouter.post(`/:tcgName/product`, async (req, res) => {
  const { tcgName } = req.params
  const { name, type, displayName, description, sku } = req.body
  const result = await prisma.product.create({
    data: {
      name,
      type,
      displayName,
      description,
      sku,
      tcg: { connect: { name: tcgName } }
    },
  })
  res.json(result)
})

productRouter.get('/:tcgName/product/:id', async (req, res) => {
  const { tcgName, id } = req.params

  const products = await prisma.product.findUnique({
    where: {
      id,
      tcgName: tcgName
    }
  })

  res.json(products)
})

productRouter.put('/:tcgName/card/:id/views', async (req, res) => {
  const { id, tcgName } = req.params
  try {
    const card = await prisma.product.update({
      where: { id: id },
      data: {
        counter: {
          increment: 1,
        },
        tcg: { connect: { name: tcgName } },
      },
    })

    res.json(card)
  } catch (error) {
    res.json({ error: `card with ID ${id} does not exist in the database` })
  }
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
