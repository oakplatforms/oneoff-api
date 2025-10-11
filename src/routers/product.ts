import { Prisma } from '@prisma/client'
import express from 'express'
import { getPrismaClient, generatePrismaError } from '../utils/prismaHelpers'

const prisma = getPrismaClient()
export const productRouter = express.Router()

/**
 * @openapi
 * /product/update-price:
 *   put:
 *     tags:
 *       - Product
 *     summary: Update product price by entity ID
 *     description: Updates the price of a product associated with a specific entity. Requires admin authentication.
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - entityId
 *               - price
 *             properties:
 *               entityId:
 *                 type: string
 *                 description: The ID of the entity whose product price should be updated
 *                 example: "clx1234567890abcdef"
 *               price:
 *                 type: number
 *                 format: decimal
 *                 description: The new price for the product
 *                 example: 29.99
 *                 minimum: 0
 *     responses:
 *       '200':
 *         description: Successfully updated the product price
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 id:
 *                   type: string
 *                   description: The product ID
 *                 entityId:
 *                   type: string
 *                   description: The entity ID
 *                 price:
 *                   type: number
 *                   format: decimal
 *                   description: The updated price
 *                 updatedAt:
 *                   type: string
 *                   format: date-time
 *                   description: When the product was last updated
 *       '400':
 *         description: Bad request (invalid input or missing required fields)
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 errorMessage:
 *                   type: string
 *                   example: Invalid input provided
 *       '401':
 *         description: Unauthorized (admin role required)
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 errorMessage:
 *                   type: string
 *                   example: Admin role required
 *       '404':
 *         description: Product not found for the given entity ID
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 errorMessage:
 *                   type: string
 *                   example: Product not found for entity ID
 *       '500':
 *         description: Internal server error during product update
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 errorMessage:
 *                   type: string
 *                   example: Unexpected error occurred
 */
productRouter.put('/product/update-price', async (req, res) => {
  const { entityId, price } = req.body

  try {
    if (!entityId) {
      throw new Error('Entity ID is required')
    }

    if (price === undefined || price === null) {
      throw new Error('Price is required')
    }

    const numericPrice = Number(price)
    if (isNaN(numericPrice) || numericPrice <= 0) {
      throw new Error('Price must be a valid number greater than 0')
    }

    const updatedProduct = await prisma.product.update({
      where: { entityId },
      data: { price: numericPrice },
      select: {
        id: true,
        entityId: true,
        price: true,
        updatedAt: true
      }
    })

    res.json(updatedProduct)
  } catch (error) {
    const { statusCode, prismaError, customError } = generatePrismaError(error as Prisma.PrismaClientKnownRequestError)
    console.error('UPDATE_PRODUCT_PRICE_ERROR:', prismaError || customError)
    res.status(statusCode).send({ errorMessage: customError || 'Failed to update product price.' })
  }
})
