
import { PrismaClient, Prisma } from '@prisma/client'
import express from 'express'
import { generateIncludes } from '../utils/generateIncludes'
import { getPrismaClient, generatePrismaError } from '../utils/prismaHelpers'

const prisma = getPrismaClient()
export const brandRouter = express.Router()

/**
 * @openapi
 * /{marketplaceName}/brands:
 *   get:
 *     summary: Retrieve a list of brands
 *     tags: 
 *       - Brand
 *     responses:
 *       '200':
 *         description: A list of brands
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Brand'                      
 */
brandRouter.get('/:marketplaceName/brands', async (req, res) => {
  const { marketplaceName } = req.params
  const { include } = req.query

  try {
    const brands = await prisma.brand.findMany({
      where: {
        marketplaceName: { contains: marketplaceName as string }
      },
      include: generateIncludes(include)
    })
    res.json(brands)
  } catch (error) {
    const { statusCode, errorMessage } = generatePrismaError(error as Prisma.PrismaClientKnownRequestError)
    res.status(statusCode).send({ errorMessage })
  }
})

/**
 * @openapi
 * /{marketplaceName}/brand:
 *   post:
 *     summary: Create a brand
 *     tags: 
 *       - Brand
 *     responses:
 *       '200':
 *         description: created brand response
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Brand'                      
 */
brandRouter.post(`/:marketplaceName/brand`, async (req, res) => {
  const { marketplaceName } = req.params
  const { name, displayName } = req.body

  try {
    const result = await prisma.brand.create({
      data: {
        name,
        displayName,
        marketplace: { connect: { name: marketplaceName } }
      },
    })
    res.json(result)
  } catch (error) {
    const { statusCode, errorMessage } = generatePrismaError(error as Prisma.PrismaClientKnownRequestError)
    res.status(statusCode).send({ errorMessage })
  }
})

brandRouter.get('/:marketplaceName/brand/:id', async (req, res) => {
  const { marketplaceName, id } = req.params
  const { include } = req.query

  try {
    const brand = await prisma.brand.findUnique({
      where: {
        id,
        marketplaceName: marketplaceName
      },
      include: generateIncludes(include)
    })
  
    res.json(brand || { errorMessage: 'Something went wrong: No Brand ID found' })
  } catch (error) {
    const { statusCode, errorMessage } = generatePrismaError(error as Prisma.PrismaClientKnownRequestError)
    res.status(statusCode).send({ errorMessage })
  }
})

brandRouter.delete(`/:marketplaceName/brand/:id`, async (req, res) => {
  const { marketplaceName, id } = req.params

  try {
    const brand = await prisma.brand.delete({
      where: {
        id: id,
        marketplaceName: { contains: marketplaceName as string }
      },
    })
    res.json(brand || { errorMessage: 'Something went wrong: No Brand ID found' })
  } catch (error) {
    const { statusCode, errorMessage } = generatePrismaError(error as Prisma.PrismaClientKnownRequestError)
    res.status(statusCode).send({ errorMessage })
  }
})
