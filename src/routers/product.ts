import { PrismaClient, Prisma } from '@prisma/client'
import express from 'express'
import { generateIncludes } from '../utils/generateIncludes'
import { generatePrismaError } from '../utils/generatePrismaError'

const prisma = new PrismaClient()
export const productRouter = express.Router()

/**
 * @openapi
 * /{marketplaceName}/{brandName}/list/products:
 *   get:
 *     tags:
 *       - Product
 *     summary: Retrieve a list of products for a specific brand and category.
 *     description: Fetches a list of products that belong to a specified brand and category within a marketplace. Optional query parameters allow for filtering and including related data.
 *     parameters:
 *       - name: marketplaceName
 *         in: path
 *         description: The name of the marketplace.
 *         required: true
 *         schema:
 *           type: string
 *       - name: brandName
 *         in: path
 *         description: The name of the brand.
 *         required: true
 *         schema:
 *           type: string
 *       - name: include
 *         in: query
 *         description: Optional comma-separated list of related entities to include in the response (e.g., "reviews,vendor").
 *         schema:
 *           type: string
 *       - name: category
 *         in: query
 *         description: Optional category name to filter products by.
 *         schema:
 *           type: string
 *     responses:
 *       '200':
 *         description: Successfully retrieved a list of products matching the specified brand and category.
 *         content:
 *           application/json:
 *             schema:
 *               type: array
 *               items:
 *                 $ref: '#/components/schemas/Product'
 *       '400':
 *         description: Bad request, typically due to invalid parameters or missing required fields.
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 errorMessage:
 *                   type: string
 *                   description: Description of the error that occurred.
 *       '404':
 *         description: Not Found. The specified brand or category does not exist.
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 errorMessage:
 *                   type: string
 *                   description: Description of the error that occurred.
 *       '500':
 *         description: Internal Server Error. An error occurred while processing the request.
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 errorMessage:
 *                   type: string
 *                   description: Description of the error that occurred.
 */
productRouter.get('/:marketplaceName/:brandName/list/products', async (req, res) => {
  const { brandName } = req.params
  const { include, category } = req.query

  try {
    const brandCategory = await prisma.brandCategory.findFirstOrThrow({
      where: {
        brandName: brandName,
        categoryName: category as string || ''
      }
    })
    if (brandCategory) {
      const categories = await prisma.product.findMany({
        where: {
          brandCategoryId: brandCategory.id as string
        },
        include: generateIncludes(include)
      })
      res.json(categories)
    }
  } catch (error) {
    const { statusCode, errorMessage } = generatePrismaError(error as Prisma.PrismaClientKnownRequestError)
    res.status(statusCode).send({ errorMessage })
  }
})

/**
 * @openapi
 * /{marketplaceName}/{brandName}/product:
 *   post:
 *     tags:
 *       - Product
 *     summary: Create a new product.
 *     description: Adds a new product to a specified brand and marketplace. The request body must include details of the product, and optional data can be provided for related entities such as cards.
 *     parameters:
 *       - name: marketplaceName
 *         in: path
 *         description: The name of the marketplace.
 *         required: true
 *         schema:
 *           type: string
 *       - name: brandName
 *         in: path
 *         description: The name of the brand.
 *         required: true
 *         schema:
 *           type: string
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               name:
 *                 type: string
 *                 description: Name of the product.
 *               type:
 *                 type: string
 *                 description: Type of the product.
 *               displayName:
 *                 type: string
 *                 description: Display name of the product.
 *               description:
 *                 type: string
 *                 description: Description of the product.
 *               card:
 *                 type: object
 *                 properties:
 *                   number:
 *                     type: string
 *                     description: Card number associated with the product.
 *                   shippingCategory:
 *                     type: string
 *                     description: Shipping category for the card.
 *               brandCategoryId:
 *                 type: string
 *                 description: ID of the brand category associated with the product.
 *               image:
 *                 type: string
 *                 description: URL or path to the image of the product.
 *               price:
 *                 type: number
 *                 format: float
 *                 description: Price of the product.
 *               releaseDate:
 *                 type: string
 *                 format: date-time
 *                 description: Release date of the product.
 *             required:
 *               - name
 *               - brandCategoryId
 *               - price
 *     responses:
 *       '200':
 *         description: Successfully created a new product.
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Product'
 *       '400':
 *         description: Bad request, typically due to invalid request data.
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 errorMessage:
 *                   type: string
 *                   description: Description of the error that occurred.
 *       '500':
 *         description: Internal Server Error. An error occurred while processing the request.
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 errorMessage:
 *                   type: string
 *                   description: Description of the error that occurred.
 */
productRouter.post(`/:marketplaceName/:brandName/product`, async (req, res) => {
  const {
    name,
    type,
    displayName,
    description,
    card,
    brandCategoryId,
    image,
    price,
    releaseDate
  } = req.body

  try {
    const result = await prisma.product.create({
      data: {
        name,
        type,
        displayName,
        description,
        price,
        image,
        releaseDate,
        card: {
          create: {
            ...card,
            brandCategory: { connect: { id: brandCategoryId }
          }},
        },
        brandCategory: { connect: { id: brandCategoryId } }
      },
    })
    res.json(result)
  } catch (error) {
    const { statusCode, errorMessage } = generatePrismaError(error as Prisma.PrismaClientKnownRequestError)
    res.status(statusCode).send({ errorMessage })
  }
})

productRouter.get('/:marketplaceName/:brandName/product/:id', async (req, res) => {
  const { id } = req.params
  const { include } = req.query

  try {
    const product = await prisma.product.findUnique({
      where: {
        id
      },
      include: generateIncludes(include)
    })
  
    res.json(product || { errorMessage: 'Something went wrong: No Product ID found' })
  } catch (error) {
    const { statusCode, errorMessage } = generatePrismaError(error as Prisma.PrismaClientKnownRequestError)
    res.status(statusCode).send({ errorMessage })
  }
})

/**
 * @openapi
 * /{marketplaceName}/{brandName}/product/{id}:
 *   delete:
 *     tags:
 *       - Product
 *     summary: Delete a specific product.
 *     description: Deletes a product specified by its ID from the given brand and marketplace. If the product does not exist or an error occurs, an appropriate message will be returned.
 *     parameters:
 *       - name: marketplaceName
 *         in: path
 *         description: The name of the marketplace.
 *         required: true
 *         schema:
 *           type: string
 *       - name: brandName
 *         in: path
 *         description: The name of the brand.
 *         required: true
 *         schema:
 *           type: string
 *       - name: id
 *         in: path
 *         description: The ID of the product to delete.
 *         required: true
 *         schema:
 *           type: string
 *     responses:
 *       '200':
 *         description: Successfully deleted the product.
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Product'
 *       '404':
 *         description: Product not found. The specified ID does not match any existing product.
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 errorMessage:
 *                   type: string
 *                   description: Description of the error that occurred.
 *       '500':
 *         description: Internal Server Error. An error occurred while processing the request.
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 errorMessage:
 *                   type: string
 *                   description: Description of the error that occurred.
 */
productRouter.delete(`/:marketplaceName/:brandName/product/:id`, async (req, res) => {
  const { id } = req.params

  try {
    const product = await prisma.product.delete({
      where: {
        id: id
      },
    })
    res.json(product || { errorMessage: 'Something went wrong: No Product ID found' })
  } catch (error) {
    const { statusCode, errorMessage } = generatePrismaError(error as Prisma.PrismaClientKnownRequestError)
    res.status(statusCode).send({ errorMessage })
  }
})
