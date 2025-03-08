import { Prisma } from '@prisma/client'
import express from 'express'
import { generateIncludes } from '../utils/generateIncludes'
import { getPrismaClient, generatePrismaError } from '../utils/prismaHelpers'

const prisma = getPrismaClient()
export const shippingCategoryRouter = express.Router()

/**
 * @openapi
 * /{marketplaceName}/shipping-categories:
 *   get:
 *     tags:
 *       - Shipping Category
 *     summary: Retrieve a list of shipping categories for a given marketplace.
 *     description: Fetches a list of shipping categories that belong to the specified marketplace.
 *     parameters:
 *       - name: marketplaceName
 *         in: path
 *         description: The name of the marketplace for which to list shipping categories.
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
 *         description: Successfully retrieved the list of shipping categories.
 *         content:
 *           application/json:
 *             schema:
 *               type: array
 *               items:
 *                 $ref: '#/components/schemas/ShippingCategory'
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
 *         description: Internal server error, often due to database issues or unexpected errors.
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 errorMessage:
 *                   type: string
 *                   description: Description of the error that occurred.
 */
shippingCategoryRouter.get('/:marketplaceName/shipping-categories', async (req, res) => {
  const { marketplaceName } = req.params
  const { include } = req.query
  try {
    const shippingCategories = await prisma.shippingCategory.findMany({
      where: {
        marketplaceName: { contains: marketplaceName as string }
      },
      include: generateIncludes(include)
    })
    res.json(shippingCategories)
  } catch (error) {
    const { statusCode, errorMessage } = generatePrismaError(error as Prisma.PrismaClientKnownRequestError)
    res.status(statusCode).send({ errorMessage })
  }
})

/**
 * @openapi
 * /{marketplaceName}/shipping-category:
 *   post:
 *     tags:
 *       - Shipping Category
 *     summary: Create a new shipping category for a given marketplace.
 *     description: Creates a new shipping category in the specified marketplace with the provided details.
 *     parameters:
 *       - name: marketplaceName
 *         in: path
 *         description: The name of the marketplace where the new shipping category will be created.
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
 *                 description: The name of the shipping category.
 *               displayName:
 *                 type: string
 *                 description: The display name of the shipping category.
 *               description:
 *                 type: string
 *                 description: The updated description of the shipping category.
 *             required:
 *               - name
 *     responses:
 *       '201':
 *         description: Successfully created a new shipping category.
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/ShippingCategory'
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
 *       '500':
 *         description: Internal server error, often due to database issues or unexpected errors.
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 errorMessage:
 *                   type: string
 *                   description: Description of the error that occurred.
 */
shippingCategoryRouter.post(`/:marketplaceName/shipping-category`, async (req, res) => {
  const { marketplaceName } = req.params
  const { name, displayName, shippingOptions, createdById } = req.body

  try {
    const shippingCategory = await prisma.shippingCategory.create({
      data: {
        name,
        displayName,
        createdBy: { connect: { id: createdById } },
        marketplace: { connect: { name: marketplaceName } },
        shippingOptions: shippingOptions?.create?.length
          ? {
            create: shippingOptions.create?.map((shippingOption: Prisma.ShippingOptionCreateInput) => ({
              ...shippingOption
            })),
          }
          : undefined,
      },
    })
    res.json(shippingCategory)
  } catch (error) {
    const { statusCode, errorMessage } = generatePrismaError(error as Prisma.PrismaClientKnownRequestError)
    res.status(statusCode).send({ errorMessage })
  }
})

/**
 * @openapi
 * /{marketplaceName}/shipping-category/{id}:
 *   put:
 *     tags:
 *       - Shipping Category
 *     summary: Update an existing shipping category in the specified marketplace.
 *     description: Updates the details of a shipping category by its ID within the specified marketplace.
 *     parameters:
 *       - name: marketplaceName
 *         in: path
 *         description: The name of the marketplace where the shipping category exists.
 *         required: true
 *         schema:
 *           type: string
 *       - name: id
 *         in: path
 *         description: The unique identifier of the shipping category to update.
 *         required: true
 *         schema:
 *           type: string
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             description: The fields to update in the shipping category.
 *             properties:
 *               name:
 *                 type: string
 *                 description: The updated name of the shipping category.
 *               displayName:
 *                 type: string
 *                 description: The updated display name of the shipping category.
 *               description:
 *                 type: string
 *                 description: The updated description of the shipping category.
 *     responses:
 *       '200':
 *         description: Successfully updated the shipping category.
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/ShippingCategory'
 *       '400':
 *         description: Bad request, typically due to invalid parameters or missing fields.
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 errorMessage:
 *                   type: string
 *                   description: Description of the error that occurred.
 *       '404':
 *         description: Shipping category not found.
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 errorMessage:
 *                   type: string
 *                   description: Error message indicating the shipping category could not be found.
 *       '500':
 *         description: Internal server error, often due to database issues or unexpected errors.
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 errorMessage:
 *                   type: string
 *                   description: Description of the error that occurred.
 */
shippingCategoryRouter.put(`/:marketplaceName/shipping-category/:id`, async (req, res) => {
  const { id } = req.params
  const { shippingOptions } = req.body

  try {
    const shippingCategory = await prisma.shippingCategory.update({
      where: { id },
      data: {
        ...req.body,
        shippingOptions: shippingOptions
          ? {
            create: shippingOptions.create?.map((shippingOption: Prisma.ShippingOptionCreateInput) => ({
              ...shippingOption
            })),
            deleteMany: shippingOptions.delete?.map((shippingOptionId: string) => ({
              id: shippingOptionId
            })),
          }
          : undefined,
      }
    })
    if (shippingCategory) {
      res.json(shippingCategory)
    } else {
      throw new Error('Cannot update shipping category by id')
    }
  } catch (error) {
    const { statusCode, errorMessage } = generatePrismaError(error as Prisma.PrismaClientKnownRequestError)
    res.status(statusCode).send({ errorMessage })
  }
})

/**
 * @openapi
 * /{marketplaceName}/shipping-category/{id}:
 *   get:
 *     tags:
 *       - Shipping Category
 *     summary: Retrieve details of a specific shipping category by its ID.
 *     description: Fetches the details of a single shipping category in the specified marketplace using its unique ID.
 *     parameters:
 *       - name: marketplaceName
 *         in: path
 *         description: The name of the marketplace where the shipping category exists.
 *         required: true
 *         schema:
 *           type: string
 *       - name: id
 *         in: path
 *         description: The unique identifier of the shipping category.
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
 *         description: Successfully retrieved the shipping category.
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/ShippingCategory'
 *       '400':
 *         description: Bad request, typically due to invalid parameters or query syntax.
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 errorMessage:
 *                   type: string
 *                   description: Description of the error that occurred.
 *       '404':
 *         description: Shipping category not found.
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 errorMessage:
 *                   type: string
 *                   description: Error message indicating the shipping category could not be found.
 *       '500':
 *         description: Internal server error, often due to database issues or unexpected errors.
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 errorMessage:
 *                   type: string
 *                   description: Description of the error that occurred.
 */
shippingCategoryRouter.get('/:marketplaceName/shipping-category/:id', async (req, res) => {
  const { id } = req.params
  const { include } = req.query

  try {
    const shippingCategory = await prisma.shippingCategory.findUnique({
      where: {
        id,
      },
      include: generateIncludes(include)
    })
    if (shippingCategory) {
      res.json(shippingCategory)
    } else {
      throw new Error('Cannot update shipping category by id')
    }
  } catch (error) {
    const { statusCode, errorMessage } = generatePrismaError(error as Prisma.PrismaClientKnownRequestError)
    res.status(statusCode).send({ errorMessage })
  }
})

/**
 * @openapi
 * /{marketplaceName}/shipping-category/{id}:
 *   delete:
 *     tags:
 *       - Shipping Category
 *     summary: Delete a specific shipping category by its ID.
 *     description: Deletes a shipping category in the specified marketplace using its unique ID.
 *     parameters:
 *       - name: marketplaceName
 *         in: path
 *         description: The name of the marketplace where the shipping category exists.
 *         required: true
 *         schema:
 *           type: string
 *       - name: id
 *         in: path
 *         description: The unique identifier of the shipping category to delete.
 *         required: true
 *         schema:
 *           type: string
 *     responses:
 *       '200':
 *         description: Successfully deleted the shipping category.
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/ShippingCategory'
 *       '400':
 *         description: Bad request, typically due to invalid parameters or query syntax.
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 errorMessage:
 *                   type: string
 *                   description: Description of the error that occurred.
 *       '404':
 *         description: Shipping category not found.
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 errorMessage:
 *                   type: string
 *                   description: Error message indicating the shipping category could not be found.
 *       '500':
 *         description: Internal server error, often due to database issues or unexpected errors.
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 errorMessage:
 *                   type: string
 *                   description: Description of the error that occurred.
 */
shippingCategoryRouter.delete(`/:marketplaceName/shipping-category/:id`, async (req, res) => {
  const { id } = req.params

  try {
    const shippingCategory = await prisma.shippingCategory.delete({
      where: {
        id: id,
      },
    })
    if (shippingCategory) {
      res.json(shippingCategory)
    } else {
      throw new Error('No shipping category ID found')
    }
  } catch (error) {
    const { statusCode, errorMessage } = generatePrismaError(error as Prisma.PrismaClientKnownRequestError)
    res.status(statusCode).send({ errorMessage })
  }
})
