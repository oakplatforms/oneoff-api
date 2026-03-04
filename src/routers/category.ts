import { Prisma } from '@prisma/client'
import express from 'express'
import { generateIncludes } from '../utils/generateIncludes'
import { prismaClient, generatePrismaError } from '../utils/prismaHelpers'
import { paginatePrisma } from '../utils/paginatePrisma'
import { validateRole, AuthenticatedUser } from '../validation/user'
import { validateStringFields, STRING_LIMITS } from '../validation/stringLimits'

const prisma = prismaClient()
export const categoryRouter = express.Router()

/**
 * @openapi
 * /categories:
 *   get:
 *     tags:
 *       - Category
 *     summary: Retrieve a list of categories for a given marketplace.
 *     description: Fetches a list of categories that belong to the specified marketplace.
 *     parameters:
 *       - name: include
 *         in: query
 *         description: Optional query parameter to include related data.
 *         schema:
 *           type: string
 *     responses:
 *       '200':
 *         description: Successfully retrieved the list of categories.
 *         content:
 *           application/json:
 *             schema:
 *               type: array
 *               items:
 *                 $ref: '#/components/schemas/Category'
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
categoryRouter.get('/categories', async (req, res) => {
  const { include, usePagination, page, limit } = req.query

  try {
    const parsedLimit = parseInt(limit as string) || 10
    const parsedPage = parseInt(page as string) || 0
    const result = await paginatePrisma({
      prismaModel: prisma.category,
      where: {},
      include: generateIncludes(include as string),
      page: parsedPage,
      limit: parsedLimit,
      usePagination: usePagination === 'false' ? false : true,
    })

    res.json(result)
  } catch (error) {
    const { statusCode, prismaError, customError } = generatePrismaError(error as Prisma.PrismaClientKnownRequestError)
    console.error('GET_CATEGORIES_ERROR:', prismaError, customError)
    res.status(statusCode).send({ errorMessage: 'Failed to retrieve categories.' })
  }
})

/**
 * @openapi
 * /category:
 *   post:
 *     tags:
 *       - Category
 *     summary: Create a new category for a given marketplace.
 *     description: Creates a new category in the specified marketplace with the provided details.
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               name:
 *                 type: string
 *                 description: The name of the category.
 *               displayName:
 *                 type: string
 *                 description: The display name of the category.
 *     responses:
 *       '201':
 *         description: Successfully created a new category.
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Category'
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
categoryRouter.post(`/category`, async (req, res) => {
  const { name, displayName, description } = req.body

  try {
    validateRole(req.user as AuthenticatedUser, 'admin')
    validateStringFields({
      name: { value: name, maxLength: STRING_LIMITS.name },
      displayName: { value: displayName, maxLength: STRING_LIMITS.displayName },
      description: { value: description, maxLength: STRING_LIMITS.description },
    })

    const category = await prisma.category.create({
      data: {
        name,
        displayName,
        description,
      },
    })
    res.json(category)
  } catch (error) {
    const { statusCode, prismaError, customError } = generatePrismaError(error as Prisma.PrismaClientKnownRequestError)
    console.error('CREATE_CATEGORY_ERROR:', prismaError || customError)
    res.status(statusCode).send({ errorMessage: customError || 'Failed to create category.' })
  }
})

/**
 * @openapi
 * /category/{id}:
 *   put:
 *     tags:
 *       - Category
 *     summary: Update an existing category in the specified marketplace.
 *     description: Updates the details of a category by its ID within the specified marketplace.
 *     parameters:
 *       - name: id
 *         in: path
 *         description: The unique identifier of the category to update.
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
 *                 description: The updated name of the category.
 *               displayName:
 *                 type: string
 *                 description: The updated display name of the category.
 *               description:
 *                 type: string
 *                 description: A description of the category.
 *     responses:
 *       '200':
 *         description: Successfully updated the category.
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Category'
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
 *       '404':
 *         description: Category not found.
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 errorMessage:
 *                   type: string
 *                   description: Error message indicating the category could not be found.
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
categoryRouter.put(`/category/:id`, async (req, res) => {
  const { id } = req.params

  try {
    validateRole(req.user as AuthenticatedUser, 'admin')
    validateStringFields({
      name: { value: req.body.name, maxLength: STRING_LIMITS.name },
      displayName: { value: req.body.displayName, maxLength: STRING_LIMITS.displayName },
      description: { value: req.body.description, maxLength: STRING_LIMITS.description },
    })

    const category = await prisma.category.update({
      where: { id },
      data: {
        ...(req.body.name !== undefined && { name: req.body.name }),
        ...(req.body.displayName !== undefined && { displayName: req.body.displayName }),
        ...(req.body.description !== undefined && { description: req.body.description }),
      }
    })
    if (category) {
      res.json(category)
    } else {
      throw new Error('Cannot update category by ID')
    }
  } catch (error) {
    const { statusCode, prismaError, customError } = generatePrismaError(error as Prisma.PrismaClientKnownRequestError)
    console.error('UPDATE_CATEGORY_ERROR:', prismaError || customError)
    res.status(statusCode).send({ errorMessage: customError || 'Failed to update category.' })
  }
})

/**
 * @openapi
 * /category/{id}:
 *   get:
 *     tags:
 *       - Category
 *     summary: Retrieve a specific category by its ID.
 *     description: Fetches details of a specific category by its ID within the given marketplace, with optional inclusion of related data.
 *     parameters:
 *       - name: id
 *         in: path
 *         description: The ID of the category to retrieve.
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
 *         description: Successfully retrieved the category.
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Category'
 *       '404':
 *         description: Category not found.
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 errorMessage:
 *                   type: string
 *                   description: Description of the error that occurred.
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
categoryRouter.get('/category/:id', async (req, res) => {
  const { id } = req.params
  const { include } = req.query

  try {
    if (!id) {
      throw new Error('Category ID is required')
    }
    const category = await prisma.category.findUnique({
      where: {
        id,
      },
      include: generateIncludes(include as string)
    })
    if (category) {
      res.json(category)
    } else {
      throw new Error('No category ID found')
    }
  } catch (error) {
    const { statusCode, prismaError, customError } = generatePrismaError(error as Prisma.PrismaClientKnownRequestError)
    console.error('GET_CATEGORY_ERROR:', prismaError || customError)
    res.status(statusCode).send({ errorMessage: customError || 'Failed to retrieve category.' })
  }
})

/**
 * @openapi
 * /category/{id}:
 *   delete:
 *     tags:
 *       - Category
 *     summary: Delete a specific category by its ID.
 *     description: Deletes a category by its ID within the given marketplace.
 *     parameters:
 *       - name: id
 *         in: path
 *         description: The ID of the category to delete.
 *         required: true
 *         schema:
 *           type: string
 *     responses:
 *       '200':
 *         description: Successfully deleted the category.
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Category'
 *       '404':
 *         description: Category not found.
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 errorMessage:
 *                   type: string
 *                   description: Description of the error that occurred.
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
categoryRouter.delete(`/category/:id`, async (req, res) => {
  const { id } = req.params

  try {
    validateRole(req.user as AuthenticatedUser, 'admin')

    const category = await prisma.category.delete({
      where: {
        id: id,
      },
    })
    if (category) {
      res.json(category)
    } else {
      throw new Error('No category ID found')
    }
  } catch (error) {
    const { statusCode, prismaError, customError } = generatePrismaError(error as Prisma.PrismaClientKnownRequestError)
    console.error('DELETE_CATEGORY_ERROR:', prismaError || customError)
    res.status(statusCode).send({ errorMessage: customError || 'Failed to delete category.' })
  }
})
