
import { PrismaClient, Prisma } from '@prisma/client'
import express from 'express'
import { generateIncludes } from '../utils/generateIncludes'
import { generatePrismaError } from '../utils/generatePrismaError'

const prisma = new PrismaClient()
export const marketplaceRouter = express.Router()

/**
 * @openapi
 * /list/marketplaces:
 *   get:
 *     summary: Retrieve a list of marketplaces
 *     tags: 
 *       - Marketplace
 *     responses:
 *       '200':
 *         description: A list of marketplaces
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Marketplace'                      
 */
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


/**
 * @openapi
 * /marketplace:
 *   post:
 *     summary: Create a marketplace
 *     tags: 
 *       - Marketplace
 *     responses:
 *       '200':
 *         description: A list of users
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Marketplace'                      
 */
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
