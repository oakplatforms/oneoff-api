
import { PrismaClient, Prisma } from '@prisma/client'
import express from 'express'
import { generateIncludes } from '../utils/generateIncludes'

const prisma = new PrismaClient()
export const marketplaceRouter = express.Router()

marketplaceRouter.get('/list/marketplaces', async (req, res) => {
  const { include } = req.query
  const result = await prisma.marketplace.findMany({
    include: generateIncludes(include)
  })
  res.json(result)
})

marketplaceRouter.post(`/marketplace`, async (req, res) => {
  const { name, displayName, brands } = req.body

  const brandData = brands?.map((brand: Prisma.BrandCreateInput) => {
    return { ...brand, marketplaceName: name }
  })

  const result = await prisma.marketplace.create({
    data: {
      name,
      displayName,
      brands: {
        create: brandData,
      },
    },
  })
  res.json(result)
})
