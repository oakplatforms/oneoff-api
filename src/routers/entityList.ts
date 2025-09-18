import { Prisma } from '@prisma/client'
import express from 'express'
import { generateIncludes } from '../utils/generateIncludes'
import { getPrismaClient, generatePrismaError } from '../utils/prismaHelpers'
import { paginatePrisma } from '../utils/paginatePrisma'
import { AuthenticatedUser, validateAccount } from '../validation/user'

const prisma = getPrismaClient()
export const entityListRouter = express.Router()

/**
 * @openapi
 * /entity-lists:
 *   get:
 *     tags:
 *       - Entity List
 *     summary: Retrieve entity lists
 *     description: Retrieve a list of entity lists filtered by listId, entityId, or both.
 *     parameters:
 *       - name: listId
 *         in: query
 *         description: Optional. Filter by listId.
 *         schema:
 *           type: string
 *       - name: entityId
 *         in: query
 *         description: Optional. Filter by entityId.
 *         schema:
 *           type: string
 *       - name: include
 *         in: query
 *         description: Optional. Include related models (e.g., list, entity).
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
 *         description: A list of matching entity lists.
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 data:
 *                   type: array
 *                   items:
 *                     $ref: '#/components/schemas/EntityList'
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
entityListRouter.get('/entity-lists', async (req, res) => {
  const { include, listId, entityId, usePagination, page, limit } = req.query

  try {
    const parsedLimit = parseInt(limit as string) || 10
    const parsedPage = parseInt(page as string) || 0

    const where = {
      ...(listId ? { listId: listId as string } : {}),
      ...(entityId ? { entityId: entityId as string } : {}),
    }

    const result = await paginatePrisma({
      prismaModel: prisma.entityList,
      where,
      include: generateIncludes(include as string),
      page: parsedPage,
      limit: parsedLimit,
      usePagination: usePagination === 'false' ? false : true,
    })

    res.json(result)
  } catch (error) {
    const { statusCode, prismaError, customError } = generatePrismaError(error as Prisma.PrismaClientKnownRequestError)
    console.error('GET_ENTITY_LISTS_ERROR:', prismaError || customError)
    res.status(statusCode).send({ errorMessage: customError || 'Failed to retrieve entity lists.' })
  }
})

/**
 * @openapi
 * /entity-list:
 *   post:
 *     tags:
 *       - Entity List
 *     summary: Add an entity to a list
 *     description: Creates a new entity list entry, adding an entity to a list with optional quantity.
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - listId
 *               - entityId
 *               - accountId
 *             properties:
 *               listId:
 *                 type: string
 *                 description: The ID of the list to add the entity to.
 *               entityId:
 *                 type: string
 *                 description: The ID of the entity to add to the list.
 *               quantity:
 *                 type: integer
 *                 description: Optional quantity of the entity in the list.
 *               accountId:
 *                 type: string
 *                 description: The ID of the account making the request (for authorization).
 *     responses:
 *       '200':
 *         description: Successfully added entity to list.
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/EntityList'
 *       '400':
 *         description: Bad request, typically due to missing required fields or duplicate entry.
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
entityListRouter.post('/entity-list', async (req, res) => {
  const { listId, entityId, quantity, accountId } = req.body

  try {
    if (!listId || !entityId) {
      throw new Error('List ID and Entity ID are required')
    }

    //Verify the list belongs to the account
    const list = await prisma.list.findUnique({
      where: { id: listId },
      select: { accountId: true }
    })

    if (!list) {
      throw new Error('List not found')
    }

    await validateAccount(req.user as AuthenticatedUser, list.accountId || accountId, 'authenticated')

    const entityList = await prisma.entityList.create({
      data: {
        listId,
        entityId,
        quantity: quantity || null,
      },
      include: generateIncludes('list,entity')
    })

    res.json(entityList)
  } catch (error) {
    const { statusCode, prismaError, customError } = generatePrismaError(error as Prisma.PrismaClientKnownRequestError)
    console.error('CREATE_ENTITY_LIST_ERROR:', prismaError || customError)
    res.status(statusCode).send({ errorMessage: customError || 'Failed to add entity to list.' })
  }
})

/**
 * @openapi
 * /entity-list/{id}:
 *   get:
 *     tags:
 *       - Entity List
 *     summary: Retrieve an entity list by ID
 *     description: Fetches a single entity list entry by its unique ID. You may include related data using the `include` query parameter.
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *         description: The ID of the entity list to retrieve.
 *       - in: query
 *         name: include
 *         schema:
 *           type: string
 *         description: Comma-separated list of related models to include in the response.
 *     responses:
 *       '200':
 *         description: Successfully retrieved the entity list.
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/EntityList'
 *       '404':
 *         description: Entity list not found.
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 errorMessage:
 *                   type: string
 *                   example: No entity list ID found
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
entityListRouter.get('/entity-list/:id', async (req, res) => {
  const { id } = req.params
  const { include } = req.query

  try {
    if (!id) {
      throw new Error('Entity list ID is required')
    }
    const entityList = await prisma.entityList.findUnique({
      where: {
        id
      },
      include: generateIncludes(include as string)
    })
    if (entityList) {
      res.json(entityList)
    } else {
      throw new Error('No entity list ID found')
    }
  } catch (error) {
    const { statusCode, prismaError, customError } = generatePrismaError(error as Prisma.PrismaClientKnownRequestError)
    console.error('GET_ENTITY_LIST_ERROR:', prismaError || customError)
    res.status(statusCode).send({ errorMessage: customError || 'Failed to retrieve entity list.' })
  }
})

/**
 * @openapi
 * /entity-list/{id}:
 *   put:
 *     tags:
 *       - Entity List
 *     summary: Update an entity list entry
 *     description: Updates an existing entity list entry, allowing modification of the quantity.
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *         description: The ID of the entity list to update.
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               quantity:
 *                 type: integer
 *                 description: Updated quantity of the entity in the list.
 *               accountId:
 *                 type: string
 *                 description: The ID of the account making the request (for authorization).
 *     responses:
 *       '200':
 *         description: Successfully updated the entity list.
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/EntityList'
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
 *         description: Entity list not found.
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
entityListRouter.put('/entity-list/:id', async (req, res) => {
  const { id } = req.params
  const { quantity, accountId } = req.body

  try {
    if (!id) {
      throw new Error('Entity list ID is required')
    }

    //Get the entity list to verify ownership
    const existingEntityList = await prisma.entityList.findUnique({
      where: { id },
      include: { list: { select: { accountId: true } } }
    })

    if (!existingEntityList) {
      throw new Error('Entity list not found')
    }

    await validateAccount(req.user as AuthenticatedUser, existingEntityList.list.accountId || accountId, 'authenticated')

    const updatedEntityList = await prisma.entityList.update({
      where: { id },
      data: {
        quantity: quantity !== undefined ? quantity : null,
      },
      include: generateIncludes('list,entity')
    })

    res.json(updatedEntityList)
  } catch (error) {
    const { statusCode, prismaError, customError } = generatePrismaError(error as Prisma.PrismaClientKnownRequestError)
    console.error('UPDATE_ENTITY_LIST_ERROR:', prismaError || customError)
    res.status(statusCode).send({ errorMessage: customError || 'Failed to update entity list.' })
  }
})

/**
 * @openapi
 * /entity-list/{id}:
 *   delete:
 *     tags:
 *       - Entity List
 *     summary: Remove an entity from a list
 *     description: Deletes an entity list entry, removing an entity from a list.
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *         description: The ID of the entity list to delete.
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - accountId
 *             properties:
 *               accountId:
 *                 type: string
 *                 description: The ID of the account making the request (for authorization).
 *     responses:
 *       '200':
 *         description: Successfully removed entity from list.
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/EntityList'
 *       '404':
 *         description: Entity list not found.
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 errorMessage:
 *                   type: string
 *                   example: No entity list ID found
 *       '400':
 *         description: Bad request, typically due to invalid parameters.
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
entityListRouter.delete('/entity-list/:id', async (req, res) => {
  const { id } = req.params
  const { accountId } = req.body

  try {
    if (!id) {
      throw new Error('Entity list ID is required')
    }

    //Get the entity list to verify ownership
    const existingEntityList = await prisma.entityList.findUnique({
      where: { id },
      include: { list: { select: { accountId: true } } }
    })

    if (!existingEntityList) {
      throw new Error('Entity list not found')
    }

    await validateAccount(req.user as AuthenticatedUser, existingEntityList.list.accountId || accountId, 'authenticated')

    const deletedEntityList = await prisma.entityList.delete({
      where: { id },
      include: generateIncludes('list,entity')
    })

    res.json(deletedEntityList)
  } catch (error) {
    const { statusCode, prismaError, customError } = generatePrismaError(error as Prisma.PrismaClientKnownRequestError)
    console.error('DELETE_ENTITY_LIST_ERROR:', prismaError || customError)
    res.status(statusCode).send({ errorMessage: customError || 'Failed to remove entity from list.' })
  }
})
