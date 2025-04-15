import { ListType, Prisma } from '@prisma/client'
import express from 'express'
import { generateIncludes } from '../utils/generateIncludes'
import { getPrismaClient, generatePrismaError } from '../utils/prismaHelpers'

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
  const { include, type } = req.query

  try {
    const lists = await prisma.list.findMany({
      where: {
        ...(type ? { type: type as ListType } : {}),
      },
      include: generateIncludes(include),
    })

    res.json(lists)
  } catch (error) {
    const { statusCode, errorMessage } = generatePrismaError(error as Prisma.PrismaClientKnownRequestError)
    res.status(statusCode).send({ errorMessage })
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
    const list = await prisma.list.create({
      data: {
        name,
        displayName,
        description,
        type,
        account: { connect: { id: accountId } },
        entityList: entityList?.create?.length
          ? {
            create: entityList.create.map((item: { entityId: string }) => ({
              entity: { connect: { id: item.entityId } },
            })),
          }
          : undefined,
      },
    })

    res.json(list)
  } catch (error) {
    const { statusCode, errorMessage } = generatePrismaError(
      error as Prisma.PrismaClientKnownRequestError
    )
    res.status(statusCode).send({ errorMessage })
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
  const { name, type, displayName, description, entityList } = req.body

  try {
    const updatedList = await prisma.list.update({
      where: { id },
      data: {
        name,
        displayName,
        description,
        type,
        entityList: entityList
          ? {
            create: entityList.create?.map((item: { entityId: string }) => ({
              entity: { connect: { id: item.entityId } },
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
    const { statusCode, errorMessage } = generatePrismaError(
      error as Prisma.PrismaClientKnownRequestError
    )
    res.status(statusCode).send({ errorMessage })
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
    const list = await prisma.list.findUnique({
      where: { id },
      include: generateIncludes(include)
    })

    if (list) {
      res.json(list)
    } else {
      throw new Error('No list ID found')
    }
  } catch (error) {
    const { statusCode, errorMessage } = generatePrismaError(error as Prisma.PrismaClientKnownRequestError)
    res.status(statusCode).send({ errorMessage })
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
listRouter.delete(`/list/:id`, async (req, res) => {
  const { id } = req.params
  try {
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
    const { statusCode, errorMessage } = generatePrismaError(error as Prisma.PrismaClientKnownRequestError)
    res.status(statusCode).send({ errorMessage })
  }
})
