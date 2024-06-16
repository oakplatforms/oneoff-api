
import { PrismaClient, Prisma } from '@prisma/client'
import express from 'express'
const prisma = new PrismaClient()
export const tcgRouter = express.Router()

tcgRouter.get('/list/tcgs', async (req, res) => {
  const result = await prisma.tcg.findMany()
  res.json(result)
})

tcgRouter.post(`/tcg`, async (req, res) => {
  const { name, displayName, type, products } = req.body

  const productData = products?.map((product: Prisma.ProductCreateInput) => {
    return { ...product, tcgName: name }
  })

  const result = await prisma.tcg.create({
    data: {
      name,
      displayName,
      type,
      products: {
        create: productData,
      },
    },
  })
  res.json(result)
})
