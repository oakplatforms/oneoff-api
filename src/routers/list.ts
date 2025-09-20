import { ListType, Prisma, List } from '@prisma/client'
import express from 'express'
import { generateIncludes } from '../utils/generateIncludes'
import { getPrismaClient, generatePrismaError } from '../utils/prismaHelpers'
import { paginatePrisma } from '../utils/paginatePrisma'
import { AuthenticatedUser, validateAccount } from '../validation/user'

const prisma = getPrismaClient()
export const listRouter = express.Router()

/**
 * @openapi
 * /lists:
 *   get:
 *     tags:
 *       - List
 *     summary: Get all lists
 *     description: Retrieves all lists, optionally filtering by list type.
 *     parameters:
 *       - in: query
 *         name: type
 *         schema:
 *           type: string
 *           enum: [COLLECTION, DECK, DEFAULT]
 *         required: false
 *         description: Optional list type to filter by.
 *       - in: query
 *         name: include
 *         schema:
 *           type: string
 *         required: false
 *         description: Comma-separated related entities to include (e.g., "account,entityList").
 *     responses:
 *       '200':
 *         description: Successfully retrieved the list of lists.
 *         content:
 *           application/json:
 *             schema:
 *               type: array
 *               items:
 *                 $ref: '#/components/schemas/List'
 *       '400':
 *         description: Bad request, possibly due to invalid query params.
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 errorMessage:
 *                   type: string
 *                   description: Description of the error that occurred.
 *       '500':
 *         description: Internal server error, typically due to database issues.
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 errorMessage:
 *                   type: string
 *                   description: Description of the error that occurred.
 */
listRouter.get('/lists', async (req, res) => {
  const { include, type, usePagination, page, limit } = req.query

  try {
    const parsedLimit = parseInt(limit as string) || 10
    const parsedPage = parseInt(page as string) || 0

    const where = {
      ...(type ? { type: type as ListType } : {}),
    }

    const result = await paginatePrisma({
      prismaModel: prisma.list,
      where,
      include: generateIncludes(include as string),
      page: parsedPage,
      limit: parsedLimit,
      usePagination: usePagination === 'false' ? false : true,
    })

    res.json(result)
  } catch (error) {
    const { statusCode, prismaError, customError } = generatePrismaError(error as Prisma.PrismaClientKnownRequestError)
    console.error('GET_LISTS_ERROR:', prismaError, customError)
    res.status(statusCode).send({ errorMessage: customError || 'Failed to retrieve lists.' })
  }
})

/**
 * @openapi
 * /list:
 *   post:
 *     tags:
 *       - List
 *     summary: Create a new list
 *     description: Creates a new list associated with a user account.
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - name
 *               - type
 *               - accountId
 *             properties:
 *               name:
 *                 type: string
 *                 description: Internal name for the list.
 *               type:
 *                 type: string
 *                 description: Type of the list (e.g., "wishlist", "favorites", etc.)
 *               displayName:
 *                 type: string
 *                 description: Public-facing display name for the list.
 *               description:
 *                 type: string
 *                 description: Optional description of the list.
 *               accountId:
 *                 type: string
 *                 description: The ID of the account creating the list.
 *               entityList:
 *                 type: object
 *                 properties:
 *                   create:
 *                     type: array
 *                     items:
 *                       type: object
 *                       properties:
 *                         entityId:
 *                           type: string
 *                           description: ID of the entity to link to the list.
 *                         quantity:
 *                           type: integer
 *                           description: Optional quantity of the entity in the list.
 *     responses:
 *       '200':
 *         description: Successfully created the list.
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/List'
 *       '400':
 *         description: Bad request, typically due to missing required fields.
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
listRouter.post('/list', async (req, res) => {
  const { name, type, displayName, description, accountId, entityList } = req.body

  try {
    await validateAccount(req.user as AuthenticatedUser, accountId, 'authenticated')
    const list = await prisma.list.create({
      data: {
        name,
        displayName,
        description,
        type,
        account: { connect: { id: accountId } },
        entityList: entityList?.create?.length
          ? {
            create: entityList.create.map((item: { entityId: string; quantity?: number }) => ({
              entity: { connect: { id: item.entityId } },
              quantity: item.quantity || null,
            })),
          }
          : undefined,
      },
    })

    res.json(list)
  } catch (error) {
    const { statusCode, prismaError, customError } = generatePrismaError(error as Prisma.PrismaClientKnownRequestError)
    console.error('CREATE_LIST_ERROR:', prismaError, customError)
    res.status(statusCode).send({ errorMessage: customError || 'Failed to create list.' })
  }
})

/**
 * @openapi
 * /list/{id}:
 *   put:
 *     tags:
 *       - List
 *     summary: Update an existing list
 *     description: Updates a list and its associated entityList records. You can create and delete entityList entries.
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *         description: The ID of the list to update.
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               name:
 *                 type: string
 *                 description: Internal name of the list.
 *               displayName:
 *                 type: string
 *                 description: Public-facing display name of the list.
 *               description:
 *                 type: string
 *                 description: Optional description of the list.
 *               type:
 *                 type: string
 *                 enum: [DEFAULT, COLLECTION, DECK]
 *                 description: The type of list.
 *               entityList:
 *                 type: object
 *                 properties:
 *                   create:
 *                     type: array
 *                     items:
 *                       type: object
 *                       properties:
 *                         entityId:
 *                           type: string
 *                           description: ID of the entity to link to the list.
 *                         quantity:
 *                           type: integer
 *                           description: Optional quantity of the entity in the list.
 *                   delete:
 *                     type: array
 *                     items:
 *                       type: string
 *                       description: IDs of the entityList records to remove from the list.
 *     responses:
 *       '200':
 *         description: Successfully updated the list.
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/List'
 *       '400':
 *         description: Bad request due to invalid input or unsupported relations.
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
listRouter.put('/list/:id', async (req, res) => {
  const { id } = req.params
  const { name, type, displayName, description, entityList, accountId } = req.body

  try {
    if (!id) {
      throw new Error('List ID is required')
    }
    await validateAccount(req.user as AuthenticatedUser, accountId, 'authenticated')
    const updatedList = await prisma.list.update({
      where: { id },
      data: {
        name,
        displayName,
        description,
        type,
        entityList: entityList
          ? {
            create: entityList.create?.map((item: { entityId: string; quantity?: number }) => ({
              entity: { connect: { id: item.entityId } },
              quantity: item.quantity || null,
            })),
            deleteMany: entityList.delete?.map((entityListId: string) => ({
              id: entityListId,
            })),
          }
          : undefined,
      },
    })

    if (updatedList) {
      res.json(updatedList)
    } else {
      throw new Error('Cannot update list by id')
    }
  } catch (error) {
    const { statusCode, prismaError, customError } = generatePrismaError(error as Prisma.PrismaClientKnownRequestError)
    console.error('UPDATE_LIST_ERROR:', prismaError, customError)
    res.status(statusCode).send({ errorMessage: customError || 'Failed to update list.' })
  }
})

/**
 * @openapi
 * /lists/batch:
 *   put:
 *     tags:
 *       - List
 *     summary: Update multiple lists in batch
 *     description: Updates multiple lists and their associated entityList records in a single transaction. You can create and delete entityList entries for each list.
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               lists:
 *                 type: array
 *                 items:
 *                   type: object
 *                   required:
 *                     - id
 *                   properties:
 *                     id:
 *                       type: string
 *                       description: The ID of the list to update.
 *                     name:
 *                       type: string
 *                       description: Internal name of the list.
 *                     displayName:
 *                       type: string
 *                       description: Public-facing display name of the list.
 *                     description:
 *                       type: string
 *                       description: Optional description of the list.
 *                     type:
 *                       type: string
 *                       enum: [DEFAULT, COLLECTION, DECK]
 *                       description: The type of list.
 *                     entityList:
 *                       type: object
 *                       properties:
 *                         create:
 *                           type: array
 *                           items:
 *                             type: object
 *                             properties:
 *                               entityId:
 *                                 type: string
 *                                 description: ID of the entity to link to the list.
 *                               quantity:
 *                                 type: integer
 *                                 description: Optional quantity of the entity in the list.
 *                         delete:
 *                           type: array
 *                           items:
 *                             type: string
 *                             description: IDs of the entityList records to remove from the list.
 *               accountId:
 *                 type: string
 *                 description: The ID of the account performing the updates.
 *     responses:
 *       '200':
 *         description: Successfully updated all lists.
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 updatedLists:
 *                   type: array
 *                   items:
 *                     $ref: '#/components/schemas/List'
 *                 successCount:
 *                   type: integer
 *                   description: Number of lists successfully updated.
 *                 totalCount:
 *                   type: integer
 *                   description: Total number of lists in the batch.
 *       '400':
 *         description: Bad request due to invalid input or validation errors.
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 errorMessage:
 *                   type: string
 *                 failedUpdates:
 *                   type: array
 *                   items:
 *                     type: object
 *                     properties:
 *                       id:
 *                         type: string
 *                       error:
 *                         type: string
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
listRouter.put('/lists/batch', async (req, res) => {
  const { lists, accountId } = req.body

  try {
    if (!lists || !Array.isArray(lists) || lists.length === 0) {
      throw new Error('Lists array is required and must not be empty')
    }

    await validateAccount(req.user as AuthenticatedUser, accountId, 'authenticated')

    const updatedLists: List[] = []
    const failedUpdates: Array<{ id: string; error: string }> = []

    //Use a transaction to ensure atomicity
    await prisma.$transaction(async (tx) => {
      for (const listData of lists) {
        try {
          const { id, name, type, displayName, description, entityList } = listData

          if (!id) {
            throw new Error('List ID is required for each list')
          }

          const updatedList = await tx.list.update({
            where: { id },
            data: {
              name,
              displayName,
              description,
              type,
              entityList: entityList
                ? {
                  create: entityList.create?.map((item: { entityId: string; quantity?: number }) => ({
                    entity: { connect: { id: item.entityId } },
                    quantity: item.quantity || null,
                  })),
                  deleteMany: entityList.delete?.map((entityListId: string) => ({
                    id: entityListId,
                  })),
                }
                : undefined,
            },
          })

          updatedLists.push(updatedList)
        } catch (error) {
          failedUpdates.push({
            id: listData.id,
            error: error instanceof Error ? error.message : 'Unknown error'
          })
        }
      }
    })

    res.json({
      updatedLists,
      successCount: updatedLists.length,
      totalCount: lists.length,
      ...(failedUpdates.length > 0 && { failedUpdates })
    })
  } catch (error) {
    const { statusCode, prismaError, customError } = generatePrismaError(error as Prisma.PrismaClientKnownRequestError)
    console.error('BATCH_UPDATE_LISTS_ERROR:', prismaError, customError)
    res.status(statusCode).send({ errorMessage: customError || 'Failed to update lists in batch.' })
  }
})

/**
 * @openapi
 * /list/{id}:
 *   get:
 *     tags:
 *       - List
 *     summary: Retrieve a specific list by its ID.
 *     description: Fetches details of a specific list by its ID, with optional inclusion of related data.
 *     parameters:
 *       - name: marketplaceName
 *         in: path
 *         description: The name of the marketplace where the list is located.
 *         required: true
 *         schema:
 *           type: string
 *       - name: brandName
 *         in: path
 *         description: The name of the brand to which the list belongs.
 *         required: true
 *         schema:
 *           type: string
 *       - name: id
 *         in: path
 *         description: The ID of the list to retrieve.
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
 *         description: Successfully retrieved the list.
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/List'
 *       '404':
 *         description: list not found.
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
listRouter.get('/list/:id', async (req, res) => {
  const { id } = req.params
  const { include } = req.query

  try {
    if (!id) {
      throw new Error('List ID is required')
    }
    const list = await prisma.list.findUnique({
      where: { id },
      include: generateIncludes(include as string)
    })

    if (list) {
      res.json(list)
    } else {
      throw new Error('No list ID found')
    }
  } catch (error) {
    const { statusCode, prismaError, customError } = generatePrismaError(error as Prisma.PrismaClientKnownRequestError)
    console.error('GET_LIST_ERROR:', prismaError, customError)
    res.status(statusCode).send({ errorMessage: customError || 'Failed to retrieve list.' })
  }
})

/**
 * @openapi
 * /list/{id}:
 *   delete:
 *     tags:
 *       - List
 *     summary: Delete a specific list by its ID.
 *     description: Deletes a specific list by its ID from the given marketplace and brand. Returns the deleted list or an error message if the ID is not found.
 *     parameters:
 *       - name: marketplaceName
 *         in: path
 *         description: The name of the marketplace where the list is located.
 *         required: true
 *         schema:
 *           type: string
 *       - name: brandName
 *         in: path
 *         description: The name of the brand to which the list belongs.
 *         required: true
 *         schema:
 *           type: string
 *       - name: id
 *         in: path
 *         description: The ID of the list to delete.
 *         required: true
 *         schema:
 *           type: string
 *     responses:
 *       '200':
 *         description: Successfully deleted the list.
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/List'
 *       '404':
 *         description: list not found.
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
listRouter.delete(`/list/:accountId/:id`, async (req, res) => {
  const { id, accountId } = req.params
  try {
    if (!id) {
      throw new Error('List ID is required')
    }
    await validateAccount(req.user as AuthenticatedUser, accountId, 'authenticated')
    const list = await prisma.list.delete({
      where: {
        id: id
      },
    })
    if (list) {
      res.json(list)
    } else {
      throw new Error('No list ID found')
    }
  } catch (error) {
    const { statusCode, prismaError, customError } = generatePrismaError(error as Prisma.PrismaClientKnownRequestError)
    console.error('DELETE_LIST_ERROR:', prismaError, customError)
    res.status(statusCode).send({ errorMessage: customError || 'Failed to delete list.' })
  }
})
