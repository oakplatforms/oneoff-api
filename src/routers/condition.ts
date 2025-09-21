import { Prisma } from '@prisma/client'
import express from 'express'
import { generateIncludes } from '../utils/generateIncludes'
import { getPrismaClient, generatePrismaError } from '../utils/prismaHelpers'
import { paginatePrisma } from '../utils/paginatePrisma'

const prisma = getPrismaClient()
export const conditionRouter = express.Router()

/**
 * @openapi
 * /conditions:
 *   get:
 *     tags:
 *       - Condition
 *     summary: Retrieve conditions
 *     description: Retrieve a list of conditions with optional filtering and pagination.
 *     parameters:
 *       - name: name
 *         in: query
 *         description: Optional. Filter by condition name.
 *         schema:
 *           type: string
 *       - name: displayName
 *         in: query
 *         description: Optional. Filter by condition display name.
 *         schema:
 *           type: string
 *       - name: include
 *         in: query
 *         description: Optional. Include related models (e.g., listings, bids).
 *         schema:
 *           type: string
 *       - name: usePagination
 *         in: query
 *         description: Whether to use pagination (default true).
 *         schema:
 *           type: string
 *           enum: [true, false]
 *       - name: page
 *         in: query
 *         description: Page number for pagination (0-based).
 *         schema:
 *           type: integer
 *           default: 0
 *       - name: limit
 *         in: query
 *         description: Number of items per page.
 *         schema:
 *           type: integer
 *           default: 10
 *     responses:
 *       '200':
 *         description: A list of matching conditions.
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 data:
 *                   type: array
 *                   items:
 *                     $ref: '#/components/schemas/Condition'
 *                 pagination:
 *                   type: object
 *                   properties:
 *                     page:
 *                       type: integer
 *                     limit:
 *                       type: integer
 *                     total:
 *                       type: integer
 *                     totalPages:
 *                       type: integer
 *       '400':
 *         description: Bad request, invalid parameters.
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 errorMessage:
 *                   type: string
 *                   description: Description of the error that occurred.
 *       '500':
 *         description: Internal server error.
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 errorMessage:
 *                   type: string
 */
conditionRouter.get('/conditions', async (req, res) => {
  const { include, name, displayName, usePagination, page, limit } = req.query

  try {
    const parsedLimit = parseInt(limit as string) || 10
    const parsedPage = parseInt(page as string) || 0

    const where = {
      ...(name ? { name: { contains: name as string, mode: 'insensitive' as const } } : {}),
      ...(displayName ? { displayName: { contains: displayName as string, mode: 'insensitive' as const } } : {}),
    }

    const result = await paginatePrisma({
      prismaModel: prisma.condition,
      where,
      include: generateIncludes(include as string),
      page: parsedPage,
      limit: parsedLimit,
      usePagination: usePagination === 'false' ? false : true,
    })

    res.json(result)
  } catch (error) {
    const { statusCode, prismaError, customError } = generatePrismaError(error as Prisma.PrismaClientKnownRequestError)
    console.error('GET_CONDITIONS_ERROR:', prismaError || customError)
    res.status(statusCode).send({ errorMessage: customError || 'Failed to retrieve conditions.' })
  }
})

/**
 * @openapi
 * /condition/{id}:
 *   get:
 *     tags:
 *       - Condition
 *     summary: Retrieve a condition by ID
 *     description: Fetches a single condition by its unique ID. You may include related data using the `include` query parameter.
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *         description: The ID of the condition to retrieve.
 *       - in: query
 *         name: include
 *         schema:
 *           type: string
 *         description: Comma-separated list of related models to include in the response.
 *     responses:
 *       '200':
 *         description: Successfully retrieved the condition.
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Condition'
 *       '404':
 *         description: Condition not found.
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 errorMessage:
 *                   type: string
 *                   example: No condition ID found
 *       '500':
 *         description: Internal server error.
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 errorMessage:
 *                   type: string
 */
conditionRouter.get('/condition/:id', async (req, res) => {
  const { id } = req.params
  const { include } = req.query

  try {
    if (!id) {
      throw new Error('Condition ID is required')
    }
    const condition = await prisma.condition.findUnique({
      where: {
        id
      },
      include: generateIncludes(include as string)
    })
    if (condition) {
      res.json(condition)
    } else {
      throw new Error('No condition ID found')
    }
  } catch (error) {
    const { statusCode, prismaError, customError } = generatePrismaError(error as Prisma.PrismaClientKnownRequestError)
    console.error('GET_CONDITION_ERROR:', prismaError || customError)
    res.status(statusCode).send({ errorMessage: customError || 'Failed to retrieve condition.' })
  }
})

/**
 * @openapi
 * /condition:
 *   post:
 *     tags:
 *       - Condition
 *     summary: Create a new condition
 *     description: Creates a new condition with the provided details.
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - name
 *               - displayName
 *             properties:
 *               name:
 *                 type: string
 *                 description: The unique name/slug for the condition.
 *               displayName:
 *                 type: string
 *                 description: The human-readable display name for the condition.
 *               description:
 *                 type: string
 *                 description: Optional description of the condition.
 *     responses:
 *       '200':
 *         description: Successfully created condition.
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Condition'
 *       '400':
 *         description: Bad request, typically due to missing required fields or duplicate name.
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
conditionRouter.post('/condition', async (req, res) => {
  const { name, displayName, description } = req.body

  try {
    if (!name || !displayName) {
      throw new Error('Name and display name are required')
    }

    const condition = await prisma.condition.create({
      data: {
        name,
        displayName,
        description: description || null,
      },
      include: generateIncludes('listings,bids')
    })

    res.json(condition)
  } catch (error) {
    const { statusCode, prismaError, customError } = generatePrismaError(error as Prisma.PrismaClientKnownRequestError)
    console.error('CREATE_CONDITION_ERROR:', prismaError || customError)
    res.status(statusCode).send({ errorMessage: customError || 'Failed to create condition.' })
  }
})

/**
 * @openapi
 * /condition/{id}:
 *   put:
 *     tags:
 *       - Condition
 *     summary: Update a condition
 *     description: Updates an existing condition with the provided details.
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *         description: The ID of the condition to update.
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               name:
 *                 type: string
 *                 description: The unique name/slug for the condition.
 *               displayName:
 *                 type: string
 *                 description: The human-readable display name for the condition.
 *               description:
 *                 type: string
 *                 description: Optional description of the condition.
 *     responses:
 *       '200':
 *         description: Successfully updated the condition.
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Condition'
 *       '400':
 *         description: Bad request due to invalid input.
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 errorMessage:
 *                   type: string
 *       '404':
 *         description: Condition not found.
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 errorMessage:
 *                   type: string
 *       '500':
 *         description: Internal server error.
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 errorMessage:
 *                   type: string
 */
conditionRouter.put('/condition/:id', async (req, res) => {
  const { id } = req.params
  const { name, displayName, description } = req.body

  try {
    if (!id) {
      throw new Error('Condition ID is required')
    }

    //Check if condition exists
    const existingCondition = await prisma.condition.findUnique({
      where: { id }
    })

    if (!existingCondition) {
      throw new Error('Condition not found')
    }

    const updatedCondition = await prisma.condition.update({
      where: { id },
      data: {
        ...(name !== undefined && { name }),
        ...(displayName !== undefined && { displayName }),
        ...(description !== undefined && { description }),
      },
      include: generateIncludes('listings,bids')
    })

    res.json(updatedCondition)
  } catch (error) {
    const { statusCode, prismaError, customError } = generatePrismaError(error as Prisma.PrismaClientKnownRequestError)
    console.error('UPDATE_CONDITION_ERROR:', prismaError || customError)
    res.status(statusCode).send({ errorMessage: customError || 'Failed to update condition.' })
  }
})

/**
 * @openapi
 * /condition/{id}:
 *   delete:
 *     tags:
 *       - Condition
 *     summary: Delete a condition
 *     description: Deletes a condition by its ID. Note that this may fail if the condition is referenced by listings or bids.
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *         description: The ID of the condition to delete.
 *     responses:
 *       '200':
 *         description: Successfully deleted the condition.
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Condition'
 *       '404':
 *         description: Condition not found.
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 errorMessage:
 *                   type: string
 *                   example: No condition ID found
 *       '400':
 *         description: Bad request, typically due to foreign key constraints.
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 errorMessage:
 *                   type: string
 *       '500':
 *         description: Internal server error, often due to database issues or unexpected errors.
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 errorMessage:
 *                   type: string
 */
conditionRouter.delete('/condition/:id', async (req, res) => {
  const { id } = req.params

  try {
    if (!id) {
      throw new Error('Condition ID is required')
    }

    //Check if condition exists
    const existingCondition = await prisma.condition.findUnique({
      where: { id }
    })

    if (!existingCondition) {
      throw new Error('Condition not found')
    }

    const deletedCondition = await prisma.condition.delete({
      where: { id },
      include: generateIncludes('listings,bids')
    })

    res.json(deletedCondition)
  } catch (error) {
    const { statusCode, prismaError, customError } = generatePrismaError(error as Prisma.PrismaClientKnownRequestError)
    console.error('DELETE_CONDITION_ERROR:', prismaError || customError)
    res.status(statusCode).send({ errorMessage: customError || 'Failed to delete condition.' })
  }
})
