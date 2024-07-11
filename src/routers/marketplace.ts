
import { PrismaClient, Prisma } from '@prisma/client'
import express from 'express'
import { generateIncludes } from '../utils/generateIncludes'
import { generatePrismaError } from '../utils/generatePrismaError'

const prisma = new PrismaClient()
export const marketplaceRouter = express.Router()

marketplaceRouter.get('/list/marketplaces', async (req, res) => {
  const { include } = req.query
  try {
    const result = await prisma.marketplace.findMany({
      include: generateIncludes(include)
    })
    res.json(result)
  } catch (error) {
    const { statusCode, errorMessage } = generatePrismaError(error as Prisma.PrismaClientKnownRequestError)
    res.status(statusCode).send({ errorMessage })
  }
})

marketplaceRouter.post(`/marketplace`, async (req, res) => {
  const { name, displayName, brands } = req.body

  const brandData = brands?.map((brand: Prisma.BrandCreateInput) => {
    return { ...brand, marketplaceName: name }
  })

  try {
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
  } catch (error) {
    const { statusCode, errorMessage } = generatePrismaError(error as Prisma.PrismaClientKnownRequestError)
    res.status(statusCode).send({ errorMessage })
  }
})
