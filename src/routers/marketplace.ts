import { Prisma } from '@prisma/client'
import express from 'express'
import { generateIncludes } from '../utils/generateIncludes'
import { getPrismaClient, generatePrismaError } from '../utils/prismaHelpers'

const prisma = getPrismaClient()
export const marketplaceRouter = express.Router()

/**
 * @openapi
 * /marketplaces:
 *   get:
 *     tags:
 *       - Marketplace
 *     summary: Retrieve a list of marketplaces
 *     description: Fetches a list of all marketplaces with optional inclusion of related data.
 *     parameters:
 *       - name: include
 *         in: query
 *         description: Optional query parameter to include related data.
 *         schema:
 *           type: string
 *     responses:
 *       '200':
 *         description: Successfully retrieved the list of marketplaces.
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Marketplace'
 *       '400':
 *         description: Bad request, typically due to invalid parameters.
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 errorMessage:
 *                   type: string
 *                   description: Description of the error that occurred.
 *       '500':
 *         description: Internal server error, typically due to database issues or unexpected errors.
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 errorMessage:
 *                   type: string
 *                   description: Description of the error that occurred.
 */

marketplaceRouter.get('/marketplaces', async (req, res) => {
  const { include } = req.query
  try {
    const marketplaces = await prisma.marketplace.findMany({
      include: generateIncludes(include)
    })
    res.json(marketplaces)
  } catch (error) {
    const { statusCode, errorMessage } = generatePrismaError(error as Prisma.PrismaClientKnownRequestError)
    res.status(statusCode).send({ errorMessage })
  }
})

/**
 * @openapi
 * /marketplace:
 *   post:
 *     tags:
 *       - Marketplace
 *     summary: Create a new marketplace
 *     description: Creates a new marketplace with associated brands.
 *     requestBody:
 *       description: The details of the marketplace to create, including optional brands.
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               name:
 *                 type: string
 *                 description: The name of the marketplace.
 *                 example: "MarketplaceName"
 *               displayName:
 *                 type: string
 *                 description: The display name of the marketplace.
 *                 example: "Marketplace Display Name"
 *               brands:
 *                 type: array
 *                 items:
 *                   type: object
 *                   properties:
 *                     name:
 *                       type: string
 *                       description: The name of the brand.
 *                       example: "BrandName"
 *                     otherProperty:
 *                       type: string
 *                       description: Additional brand properties.
 *                       example: "OtherPropertyValue"
 *                 description: A list of brands associated with the marketplace.
 *     responses:
 *       '200':
 *         description: Successfully created the marketplace.
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Marketplace'
 *       '400':
 *         description: Bad request, typically due to missing or invalid input data.
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 errorMessage:
 *                   type: string
 *                   description: Description of the error that occurred.
 *       '500':
 *         description: Internal server error, typically due to database issues or unexpected errors.
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 errorMessage:
 *                   type: string
 *                   description: Description of the error that occurred.
 */
marketplaceRouter.post(`/marketplace`, async (req, res) => {
  const { name, displayName, brands, createdById } = req.body

  const brandData = brands?.map((brand: Prisma.BrandCreateInput) => {
    return { ...brand, marketplaceName: name }
  })

  try {
    const marketplace = await prisma.marketplace.create({
      data: {
        name,
        displayName,
        createdBy: { connect: { id: createdById } },
        brands: {
          create: brandData,
        },
      },
    })
    res.json(marketplace)
  } catch (error) {
    const { statusCode, errorMessage } = generatePrismaError(error as Prisma.PrismaClientKnownRequestError)
    res.status(statusCode).send({ errorMessage })
  }
})
