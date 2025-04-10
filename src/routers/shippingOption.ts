import { Prisma } from '@prisma/client'
import express from 'express'
import { generateIncludes } from '../utils/generateIncludes'
import { getPrismaClient, generatePrismaError } from '../utils/prismaHelpers'

const prisma = getPrismaClient()
export const shippingOptionRouter = express.Router()

/**
 * @openapi
 * /shipping-options:
 *   get:
 *     tags:
 *       - Shipping Option
 *     summary: Retrieve a list of shipping options
 *     description: Fetches a list of shipping options, with optional standalone filtering.
 *     parameters:
 *       - name: isStandalone
 *         in: query
 *         description: Filter shipping options by standalone status.
 *         required: false
 *         schema:
 *           type: boolean
 *       - name: include
 *         in: query
 *         description: Optional query parameter to include related data.
 *         schema:
 *           type: string
 *     responses:
 *       '200':
 *         description: Successfully retrieved the list of shipping options.
 *         content:
 *           application/json:
 *             schema:
 *               type: array
 *               items:
 *                 $ref: '#/components/schemas/ShippingOption'
 */
shippingOptionRouter.get('/shipping-options', async (req, res) => {
  const { include, isStandalone } = req.query

  try {
    const shippingOptions = await prisma.shippingOption.findMany({
      where: isStandalone !== undefined ? { isStandalone: isStandalone === 'true' } : undefined,
      include: generateIncludes(include),
    })
    res.json(shippingOptions)
  } catch (error) {
    const { statusCode, errorMessage } = generatePrismaError(error as Prisma.PrismaClientKnownRequestError)
    res.status(statusCode).send({ errorMessage })
  }
})

/**
 * @openapi
 * /shipping-option:
 *   post:
 *     tags:
 *       - Shipping Option
 *     summary: Create a new shipping option
 *     description: Creates a new standalone shipping option.
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               name:
 *                 type: string
 *               displayName:
 *                 type: string
 *               description:
 *                 type: string
 *               rate:
 *                 type: number
 *               maxWeight:
 *                 type: number
 *               maxQuantity:
 *                 type: integer
 *               isStandalone:
 *                 type: boolean
 *             required:
 *               - name
 *               - rate
 *     responses:
 *       '200':
 *         description: Successfully created the shipping option.
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/ShippingOption'
 */
shippingOptionRouter.post('/shipping-option', async (req, res) => {
  const {
    name,
    displayName,
    description,
    maxQuantity,
    maxWeight,
    rate,
    isStandalone,
    createdById,
  } = req.body

  try {
    const shippingOption = await prisma.shippingOption.create({
      data: {
        name,
        displayName,
        description,
        maxQuantity,
        maxWeight,
        rate,
        isStandalone,
        createdById
      },
    })
    res.json(shippingOption)
  } catch (error) {
    const { statusCode, errorMessage } = generatePrismaError(error as Prisma.PrismaClientKnownRequestError)
    res.status(statusCode).send({ errorMessage })
  }
})

/**
 * @openapi
 * /shipping-option/{id}:
 *   put:
 *     tags:
 *       - Shipping Option
 *     summary: Update a shipping option
 *     description: Updates an existing shipping option by ID.
 *     parameters:
 *       - name: id
 *         in: path
 *         description: ID of the shipping option to update.
 *         required: true
 *         schema:
 *           type: string
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             description: Fields to update
 *             properties:
 *               name:
 *                 type: string
 *               displayName:
 *                 type: string
 *               description:
 *                 type: string
 *               rate:
 *                 type: number
 *               maxWeight:
 *                 type: number
 *               maxQuantity:
 *                 type: integer
 *               isStandalone:
 *                 type: boolean
 *     responses:
 *       '200':
 *         description: Successfully updated the shipping option.
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/ShippingOption'
 */
shippingOptionRouter.put('/shipping-option/:id', async (req, res) => {
  const { id } = req.params
  const {
    name,
    displayName,
    description,
    maxQuantity,
    maxWeight,
    rate,
    isStandalone,
    lastModifiedById,
  } = req.body

  try {
    const shippingOption = await prisma.shippingOption.update({
      where: { id },
      data: {
        name,
        displayName,
        description,
        maxQuantity,
        maxWeight,
        rate,
        isStandalone,
        lastModifiedById
      },
    })
    res.json(shippingOption)
  } catch (error) {
    const { statusCode, errorMessage } = generatePrismaError(error as Prisma.PrismaClientKnownRequestError)
    res.status(statusCode).send({ errorMessage })
  }
})

/**
 * @openapi
 * /shipping-option/{id}:
 *   get:
 *     tags:
 *       - Shipping Option
 *     summary: Get a shipping option by ID
 *     description: Retrieves a specific shipping option by its ID.
 *     parameters:
 *       - name: id
 *         in: path
 *         description: The ID of the shipping option.
 *         required: true
 *         schema:
 *           type: string
 *       - name: include
 *         in: query
 *         description: Optional query parameter to include related data.
 *         schema:
 *           type: string
 *     responses:
 *       '200':
 *         description: Successfully retrieved the shipping option.
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/ShippingOption'
 */
shippingOptionRouter.get('/shipping-option/:id', async (req, res) => {
  const { id } = req.params
  const { include } = req.query

  try {
    const shippingOption = await prisma.shippingOption.findUnique({
      where: { id },
      include: generateIncludes(include),
    })
    res.json(shippingOption)
  } catch (error) {
    const { statusCode, errorMessage } = generatePrismaError(error as Prisma.PrismaClientKnownRequestError)
    res.status(statusCode).send({ errorMessage })
  }
})

/**
 * @openapi
 * /shipping-option/{id}:
 *   delete:
 *     tags:
 *       - Shipping Option
 *     summary: Delete a shipping option by ID
 *     description: Deletes a shipping option by its ID.
 *     parameters:
 *       - name: id
 *         in: path
 *         description: The ID of the shipping option to delete.
 *         required: true
 *         schema:
 *           type: string
 *     responses:
 *       '200':
 *         description: Successfully deleted the shipping option.
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/ShippingOption'
 */
shippingOptionRouter.delete('/shipping-option/:id', async (req, res) => {
  const { id } = req.params

  try {
    const shippingOption = await prisma.shippingOption.delete({
      where: { id },
    })
    res.json(shippingOption)
  } catch (error) {
    const { statusCode, errorMessage } = generatePrismaError(error as Prisma.PrismaClientKnownRequestError)
    res.status(statusCode).send({ errorMessage })
  }
})
