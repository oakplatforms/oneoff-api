import { ListType, Prisma, List } from '@prisma/client'
import express from 'express'
import { generateIncludes } from '../utils/generateIncludes'
import { getPrismaClient, generatePrismaError } from '../utils/prismaHelpers'
import { paginatePrisma } from '../utils/paginatePrisma'
import { AuthenticatedUser, validateAccount, validateAccountOrAdmin } from '../validation/user'
import { uploadConfig, uploadImage } from '../utils/uploadImage'
import { deleteImage } from '../utils/deleteImage'

const prisma = getPrismaClient()
export const listRouter = express.Router()

/**
 * @openapi
 * /lists:
 *   get:
 *     tags:
 *       - List
 *     summary: Get all lists
 *     description: Retrieves all lists, optionally filtering by list type. Requires at least one of accountId, createdById, or lastModifiedById for access control.
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
 *       - in: query
 *         name: accountId
 *         schema:
 *           type: string
 *         required: false
 *         description: Account ID to filter lists by. When provided, validates account access and filters results to only lists belonging to this account.
 *       - in: query
 *         name: createdById
 *         schema:
 *           type: string
 *         required: false
 *         description: Admin ID for admin access. Validates admin permissions but does not filter results by this field.
 *       - in: query
 *         name: lastModifiedById
 *         schema:
 *           type: string
 *         required: false
 *         description: Admin ID for admin access. Validates admin permissions but does not filter results by this field.
 *       - in: query
 *         name: usePagination
 *         schema:
 *           type: string
 *           enum: [true, false]
 *         required: false
 *         description: Whether to use pagination (default true).
 *       - in: query
 *         name: page
 *         schema:
 *           type: integer
 *           default: 0
 *         required: false
 *         description: Page number for pagination (0-based).
 *       - in: query
 *         name: limit
 *         schema:
 *           type: integer
 *           default: 10
 *         required: false
 *         description: Number of items per page.
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
 *         description: Bad request, possibly due to invalid query params or missing required access parameters.
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
  const { include, type, usePagination, page, limit, accountId } = req.query

  try {
    const parsedLimit = parseInt(limit as string) || 10
    const parsedPage = parseInt(page as string) || 0

    const requiresAccountValidation = ['CUSTOM', 'FAVORITE', 'COLLECTION'].includes(type as string)

    //For certain list types, accountId is required and must be validated
    if (requiresAccountValidation) {
      if (!accountId) {
        throw new Error('accountId is required for this list type')
      }
      await validateAccount(req.user as AuthenticatedUser, accountId as string, 'authenticated')
    }

    const where = {
      ...(type ? { type: type as ListType } : {}),
      ...(accountId ? { accountId: accountId as string } : {}),
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
 *             oneOf:
 *               - required: [accountId]
 *               - required: [createdById]
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
 *               navigation:
 *                 type: object
 *                 description: Navigation configuration for dynamic routing (e.g., {"type": "Set", "id": "cmds6a8537413dbf5a86fba2d", "text": "Custom Text"}).
 *               index:
 *                 type: integer
 *                 description: Optional index for ordering/sorting lists.
 *               accountId:
 *                 type: string
 *                 description: Optional ID of the account creating the list.
 *               createdById:
 *                 type: string
 *                 description: Optional admin ID for admin users creating lists.
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
  const { name, type, displayName, description, navigation, index, accountId, createdById, entityList } = req.body

  try {
    //Validate required fields
    if (!name) {
      throw new Error('Name is required')
    }
    if (!type) {
      throw new Error('Type is required')
    }

    //Either accountId or createdById must be provided
    if (!accountId && !createdById) {
      throw new Error('Either accountId or createdById is required')
    }

    await validateAccountOrAdmin(req.user as AuthenticatedUser, accountId, createdById)

    const list = await prisma.list.create({
      data: {
        name,
        displayName,
        description,
        navigation,
        index,
        type,
        account: accountId ? { connect: { id: accountId } } : undefined,
        createdBy: createdById ? { connect: { id: createdById } } : undefined,
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
 *               navigation:
 *                 type: object
 *                 description: Navigation configuration for dynamic routing (e.g., {"type": "Set", "id": "cmds6a8537413dbf5a86fba2d", "text": "Custom Text"}).
 *               index:
 *                 type: integer
 *                 description: Optional index for ordering/sorting lists.
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
 *                   update:
 *                     type: array
 *                     items:
 *                       type: object
 *                       properties:
 *                         id:
 *                           type: string
 *                           description: ID of the entityList record to update.
 *                         quantity:
 *                           type: integer
 *                           description: Updated quantity of the entity in the list.
 *                   delete:
 *                     type: array
 *                     items:
 *                       type: string
 *                       description: IDs of the entityList records to remove from the list.
 *               accountId:
 *                 type: string
 *                 description: The ID of the account updating the list.
 *               createdById:
 *                 type: string
 *                 description: Optional admin ID for admin users updating lists.
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
  const { name, type, displayName, description, navigation, index, entityList, accountId, createdById, lastModifiedById } = req.body

  try {
    if (!id) {
      throw new Error('List ID is required')
    }

    //First, get the existing list to check current ownership
    const existingList = await prisma.list.findUnique({
      where: { id },
      select: { accountId: true, createdById: true }
    })

    if (!existingList) {
      throw new Error('List not found')
    }

    //Use existing ownership for authorization if not provided in request body
    const authAccountId = accountId || existingList.accountId
    const authCreatedById = createdById || existingList.createdById

    //Either accountId or createdById must be available (from existing list or request body)
    if (!authAccountId && !authCreatedById) {
      throw new Error('List must have either accountId or createdById')
    }

    await validateAccountOrAdmin(req.user as AuthenticatedUser, authAccountId, authCreatedById)

    const updatedList = await prisma.list.update({
      where: { id },
      data: {
        name,
        displayName,
        description,
        navigation,
        index,
        type,
        account: accountId ? { connect: { id: accountId } } : undefined,
        createdBy: createdById ? { connect: { id: createdById } } : undefined,
        lastModifiedBy: lastModifiedById ? { connect: { id: lastModifiedById } } : undefined,
        entityList: entityList
          ? {
            create: entityList.create?.map((item: { entityId: string; quantity?: number }) => ({
              entity: { connect: { id: item.entityId } },
              quantity: item.quantity || null,
            })),
            update: entityList.update?.map((item: { id: string; quantity?: number }) => ({
              where: { id: item.id },
              data: { quantity: item.quantity !== undefined ? item.quantity : null },
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
 *                     navigation:
 *                       type: object
 *                       description: Navigation configuration for dynamic routing (e.g., {"type": "Set", "id": "cmds6a8537413dbf5a86fba2d", "text": "Custom Text"}).
 *                     index:
 *                       type: integer
 *                       description: Optional index for ordering/sorting lists.
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
 *                         update:
 *                           type: array
 *                           items:
 *                             type: object
 *                             properties:
 *                               id:
 *                                 type: string
 *                                 description: ID of the entityList record to update.
 *                               quantity:
 *                                 type: integer
 *                                 description: Updated quantity of the entity in the list.
 *                         delete:
 *                           type: array
 *                           items:
 *                             type: string
 *                             description: IDs of the entityList records to remove from the list.
 *               accountId:
 *                 type: string
 *                 description: The ID of the account performing the updates.
 *               createdById:
 *                 type: string
 *                 description: Optional admin ID for admin users performing batch updates.
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
  const { lists, accountId, createdById, lastModifiedById } = req.body

  try {
    if (!lists || !Array.isArray(lists) || lists.length === 0) {
      throw new Error('Lists array is required and must not be empty')
    }

    //For batch updates, we need either accountId or createdById for authorization
    //This represents the user performing the batch operation
    if (!accountId && !createdById) {
      throw new Error('Either accountId or createdById is required for batch operation authorization')
    }

    await validateAccountOrAdmin(req.user as AuthenticatedUser, accountId, createdById)

    const updatedLists: List[] = []
    const failedUpdates: Array<{ id: string; error: string }> = []

    //Use a transaction to ensure atomicity
    await prisma.$transaction(async (tx) => {
      for (const listData of lists) {
        try {
          const { id, name, type, displayName, description, navigation, index, entityList } = listData

          if (!id) {
            throw new Error('List ID is required for each list')
          }

          const updatedList = await tx.list.update({
            where: { id },
            data: {
              name,
              displayName,
              description,
              navigation,
              index,
              type,
              lastModifiedBy: lastModifiedById ? { connect: { id: lastModifiedById } } : undefined,
              entityList: entityList
                ? {
                  create: entityList.create?.map((item: { entityId: string; quantity?: number }) => ({
                    entity: { connect: { id: item.entityId } },
                    quantity: item.quantity || null,
                  })),
                  update: entityList.update?.map((item: { id: string; quantity?: number }) => ({
                    where: { id: item.id },
                    data: { quantity: item.quantity !== undefined ? item.quantity : null },
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
 *     description: Deletes a specific list by its ID. Returns the deleted list or an error message if the ID is not found.
 *     parameters:
 *       - name: id
 *         in: path
 *         description: The ID of the list to delete.
 *         required: true
 *         schema:
 *           type: string
 *     requestBody:
 *       required: false
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               accountId:
 *                 type: string
 *                 description: The ID of the account deleting the list.
 *               createdById:
 *                 type: string
 *                 description: Optional admin ID for admin users deleting lists.
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
listRouter.delete('/list/:id', async (req, res) => {
  const { id } = req.params
  const { accountId, createdById } = req.body

  try {
    if (!id) {
      throw new Error('List ID is required')
    }

    const existingList = await prisma.list.findUnique({
      where: { id },
      select: { accountId: true, createdById: true }
    })

    if (!existingList) {
      throw new Error('List not found')
    }

    const authAccountId = accountId || existingList.accountId
    const authCreatedById = createdById || existingList.createdById

    if (!authAccountId && !authCreatedById) {
      throw new Error('List must have either accountId or createdById')
    }

    await validateAccountOrAdmin(req.user as AuthenticatedUser, authAccountId, authCreatedById)

    const deletedList = await prisma.list.delete({
      where: { id },
      include: generateIncludes(['entityList'])
    })

    res.json(deletedList)
  } catch (error) {
    const { statusCode, prismaError, customError } = generatePrismaError(error as Prisma.PrismaClientKnownRequestError)
    console.error('DELETE_LIST_ERROR:', prismaError, customError)
    res.status(statusCode).send({ errorMessage: customError || 'Failed to delete list.' })
  }
})

/**
 * @openapi
 * /list/upload-image/{id}:
 *   put:
 *     tags:
 *       - List
 *     summary: Upload an image for a list
 *     description: Uploads a banner or logo image for a specific list. Supports banner and logo fields.
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *         description: The ID of the list to upload image for.
 *       - in: query
 *         name: field
 *         required: false
 *         schema:
 *           type: string
 *           enum: [banner, logo]
 *           default: banner
 *         description: The field to update (banner or logo).
 *     requestBody:
 *       required: true
 *       content:
 *         multipart/form-data:
 *           schema:
 *             type: object
 *             required:
 *               - file
 *             properties:
 *               file:
 *                 type: string
 *                 format: binary
 *                 description: The image file to upload.
 *               accountId:
 *                 type: string
 *                 description: The ID of the account uploading the image.
 *               createdById:
 *                 type: string
 *                 description: Optional admin ID for admin users uploading images.
 *     responses:
 *       '200':
 *         description: Successfully uploaded the image.
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/List'
 *       '400':
 *         description: Bad request, typically due to missing file or invalid field parameter.
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
listRouter.put('/list/upload-image/:id', uploadConfig.single('file'), async (req, res) => {
  const { id } = req.params
  const { field = 'banner' } = req.query
  const { accountId, createdById } = req.body

  try {
    if (!id) {
      throw new Error('List ID is required')
    }

    //First, get the existing list to check current ownership
    const existingList = await prisma.list.findUnique({
      where: { id },
      select: { accountId: true, createdById: true }
    })

    if (!existingList) {
      throw new Error('List not found')
    }

    //Use existing ownership for authorization if not provided in request body
    const authAccountId = accountId || existingList.accountId
    const authCreatedById = createdById || existingList.createdById

    //Either accountId or createdById must be available (from existing list or request body)
    if (!authAccountId && !authCreatedById) {
      throw new Error('List must have either accountId or createdById')
    }

    await validateAccountOrAdmin(req.user as AuthenticatedUser, authAccountId, authCreatedById)

    if (!req.file) {
      throw new Error('Missing image file')
    }

    if (field !== 'banner' && field !== 'logo') {
      throw new Error('Invalid field parameter. Must be "banner" or "logo"')
    }

    const resizeOptions = field === 'banner'
      ? { width: 800, quality: 75, format: 'webp' as const, fit: 'inside' as const }
      : { width: 200, quality: 75, format: 'webp' as const, fit: 'inside' as const }

    const key = await uploadImage(req.file, 'list', resizeOptions)

    const updatedList = await prisma.list.update({
      where: { id },
      data: { [field]: key },
    })

    res.json(updatedList)
  } catch (error) {
    const { statusCode, prismaError, customError } = generatePrismaError(error as Prisma.PrismaClientKnownRequestError)
    console.error('UPLOAD_LIST_IMAGE_ERROR:', prismaError, customError)
    res.status(statusCode).send({ errorMessage: customError || 'Failed to upload list image.' })
  }
})

/**
 * @openapi
 * /list/delete-image/{id}:
 *   delete:
 *     tags:
 *       - List
 *     summary: Delete an image from a list
 *     description: Deletes a banner or logo image from a specific list. Supports banner and logo fields.
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *         description: The ID of the list to delete image from.
 *       - in: query
 *         name: field
 *         required: false
 *         schema:
 *           type: string
 *           enum: [banner, logo]
 *           default: banner
 *         description: The field to delete (banner or logo).
 *     requestBody:
 *       required: false
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               accountId:
 *                 type: string
 *                 description: The ID of the account deleting the image.
 *               createdById:
 *                 type: string
 *                 description: Optional admin ID for admin users deleting images.
 *     responses:
 *       '200':
 *         description: Successfully deleted the image.
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 list:
 *                   $ref: '#/components/schemas/List'
 *                 message:
 *                   type: string
 *                   description: Success message.
 *       '400':
 *         description: Bad request, typically due to invalid field parameter or missing image.
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
listRouter.delete('/list/delete-image/:id', async (req, res) => {
  const { id } = req.params
  const { field = 'banner' } = req.query
  const { accountId, createdById } = req.body

  try {
    if (!id) {
      throw new Error('List ID is required')
    }

    //First, get the existing list to check current ownership
    const existingList = await prisma.list.findUnique({
      where: { id },
      select: { accountId: true, createdById: true, banner: true, logo: true }
    })

    if (!existingList) {
      throw new Error('List not found')
    }

    //Use existing ownership for authorization if not provided in request body
    const authAccountId = accountId || existingList.accountId
    const authCreatedById = createdById || existingList.createdById

    //Either accountId or createdById must be available (from existing list or request body)
    if (!authAccountId && !authCreatedById) {
      throw new Error('List must have either accountId or createdById')
    }

    await validateAccountOrAdmin(req.user as AuthenticatedUser, authAccountId, authCreatedById)

    if (field !== 'banner' && field !== 'logo') {
      throw new Error('Invalid field parameter. Must be "banner" or "logo"')
    }

    const imageToDelete = field === 'banner' ? existingList.banner : existingList.logo

    if (!imageToDelete) {
      throw new Error(`List has no ${field} to delete`)
    }

    await deleteImage(imageToDelete)

    const updatedList = await prisma.list.update({
      where: { id },
      data: { [field]: null },
    })

    res.json({
      list: updatedList,
      message: `${field} deleted successfully`
    })
  } catch (error) {
    const { statusCode, prismaError, customError } = generatePrismaError(error as Prisma.PrismaClientKnownRequestError)
    console.error('DELETE_LIST_IMAGE_ERROR:', prismaError, customError)
    res.status(statusCode).send({ errorMessage: customError || 'Failed to delete list image.' })
  }
})
