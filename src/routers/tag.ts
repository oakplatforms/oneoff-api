import { Prisma } from '@prisma/client'
import express from 'express'
import { generateIncludes } from '../utils/generateIncludes'
import { getPrismaClient, generatePrismaError } from '../utils/prismaHelpers'
import { paginatePrisma } from '../utils/paginatePrisma'
import { validateAdmin, AuthenticatedUser, validateRole } from '../validation/user'

const prisma = getPrismaClient()
export const tagRouter = express.Router()

/**
 * @openapi
 * /tags:
 *   get:
 *     tags:
 *       - Tag
 *     summary: Retrieve a list of tags for a specific marketplace.
 *     description: Fetches a list of tags associated with the given marketplace name, with optional inclusion of related data.
 *     parameters:
 *       - name: marketplaceName
 *         in: path
 *         description: The name of the marketplace to retrieve tags for.
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
 *         description: Successfully retrieved the list of tags.
 *         content:
 *           application/json:
 *             schema:
 *               type: array
 *               items:
 *                 $ref: '#/components/schemas/Tag'
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
tagRouter.get('/tags', async (req, res) => {
  const { include, usePagination, page, limit } = req.query

  try {
    const parsedLimit = parseInt(limit as string) || 10
    const parsedPage = parseInt(page as string) || 0
    const parsedUsePagination = usePagination === 'false' ? false : true

    const result = await paginatePrisma({
      prismaModel: prisma.tag,
      where: {},
      include: generateIncludes(include),
      page: parsedPage,
      limit: parsedLimit,
      usePagination: parsedUsePagination,
    })

    res.json(result)
  } catch (error) {
    const { statusCode, prismaError, customError } = generatePrismaError(error as Prisma.PrismaClientKnownRequestError)
    console.error('GET_TAGS_ERROR:', prismaError || customError)
    res.status(statusCode).send({ errorMessage: customError || 'Failed to retrieve tags.' })
  }
})

/**
 * @openapi
 * /tag:
 *   post:
 *     tags:
 *       - Tag
 *     summary: Create a new tag for a specific marketplace.
 *     description: Creates a new tag associated with the given marketplace name. Optionally, supported tag values can be included in the request.
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               name:
 *                 type: string
 *                 description: The name of the tag.
 *               displayName:
 *                 type: string
 *                 description: The display name of the tag.
 *               supportedTagValues:
 *                 type: array
 *                 items:
 *                   type: object
 *                   properties:
 *                     id:
 *                       type: string
 *                       description: The ID of the supported tag value.
 *                     createdAt:
 *                       type: string
 *                       format: date-time
 *                       description: The creation timestamp of the supported tag value.
 *                     updatedAt:
 *                       type: string
 *                       format: date-time
 *                       description: The last updated timestamp of the supported tag value.
 *                     name:
 *                       type: string
 *                       description: The name of the supported tag value.
 *                     displayName:
 *                       type: string
 *                       description: The display name of the supported tag value.
 *             required:
 *               - name
 *               - displayName
 *     responses:
 *       '201':
 *         description: Successfully created the new tag.
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Tag'
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
tagRouter.post(`/tag`, async (req, res) => {
  const { name, displayName, supportedTagValues, createdById } = req.body

  try {
    await validateAdmin(req.user as AuthenticatedUser, createdById, 'admin')
    const tag = await prisma.tag.create({
      data: {
        name,
        displayName,
        supportedTagValues: supportedTagValues
          ? {
            create: supportedTagValues.create?.map(
              ({ name, displayName }: { name: string; displayName: string }) => ({
                name,
                displayName,
              })
            ),
          }
          : undefined,
        createdBy: { connect: { id: createdById } },
      },
    })

    res.json(tag)
  } catch (error) {
    const { statusCode, prismaError, customError } = generatePrismaError(error as Prisma.PrismaClientKnownRequestError)
    console.error('CREATE_TAG_ERROR:', prismaError || customError)
    res.status(statusCode).send({ errorMessage: customError || 'Failed to create tag.' })
  }
})

/**
 * @openapi
 * /tag/{id}:
 *   put:
 *     tags:
 *       - Tag
 *     summary: Update an existing tag for a specific marketplace.
 *     description: Updates an existing tag associated with the given marketplace. Optionally, supported tag values can also be updated.
 *     parameters:
 *       - name: id
 *         in: path
 *         description: The ID of the tag to be updated.
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
 *                 description: The updated name of the tag.
 *               displayName:
 *                 type: string
 *                 description: The updated display name of the tag.
 *               supportedTagValues:
 *                 type: array
 *                 items:
 *                   type: object
 *                   properties:
 *                     id:
 *                       type: string
 *                       description: The ID of the supported tag value.
 *                     createdAt:
 *                       type: string
 *                       format: date-time
 *                       description: The creation timestamp of the supported tag value.
 *                     updatedAt:
 *                       type: string
 *                       format: date-time
 *                       description: The last updated timestamp of the supported tag value.
 *                     name:
 *                       type: string
 *                       description: The updated name of the supported tag value.
 *                     displayName:
 *                       type: string
 *                       description: The updated display name of the supported tag value.
 *             required:
 *               - name
 *               - displayName
 *     responses:
 *       '200':
 *         description: Successfully updated the tag.
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Tag'
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
tagRouter.put('/tag/:id', async (req, res) => {
  const { id } = req.params
  const { supportedTagValues, lastModifiedById, ...rest } = req.body

  try {
    await validateAdmin(req.user as AuthenticatedUser, lastModifiedById, 'admin')
    const tag = await prisma.tag.update({
      where: { id },
      data: {
        ...rest,
        lastModifiedBy: { connect: { id: lastModifiedById } },
        supportedTagValues: supportedTagValues
          ? {
            create: supportedTagValues.create?.map(
              ({ name, displayName }: { name: string; displayName: string }) => ({
                name,
                displayName,
              })
            ),
            updateMany: supportedTagValues.update?.map(
              ({ id, name, displayName }: { id: string; name: string; displayName: string }) => ({
                where: { id },
                data: { name, displayName },
              })
            ),
            deleteMany: supportedTagValues.delete?.map(
              (tagValueId: string) => ({
                id: tagValueId,
              })
            ),
          }
          : undefined,
      },
    })

    res.json(tag)
  } catch (error) {
    const { statusCode, prismaError, customError } = generatePrismaError(error as Prisma.PrismaClientKnownRequestError)
    console.error('UPDATE_TAG_ERROR:', prismaError || customError)
    res.status(statusCode).send({ errorMessage: customError || 'Failed to update tag.' })
  }
})

/**
 * @openapi
 * /tag/{id}:
 *   get:
 *     tags:
 *       - Tag
 *     summary: Retrieve a specific tag by ID for a given marketplace.
 *     description: Fetches the details of a tag by its ID for the specified marketplace, with optional inclusion of related data.
 *     parameters:
 *       - name: id
 *         in: path
 *         description: The ID of the tag to retrieve.
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
 *         description: Successfully retrieved the tag.
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Tag'
 *       '404':
 *         description: Tag not found.
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
tagRouter.get('/tag/:id', async (req, res) => {
  const { id } = req.params
  const { include } = req.query

  try {
    if (!id) {
      throw new Error('Tag ID is required')
    }
    const tag = await prisma.tag.findUnique({
      where: {
        id,
      },
      include: generateIncludes(include)
    })
    if (tag) {
      res.json(tag)
    } else {
      throw new Error('No tag ID found')
    }
  } catch (error) {
    const { statusCode, prismaError, customError } = generatePrismaError(error as Prisma.PrismaClientKnownRequestError)
    console.error('GET_TAG_ERROR:', prismaError || customError)
    res.status(statusCode).send({ errorMessage: customError || 'Failed to retrieve tag.' })
  }
})

/**
 * @openapi
 * /tag/{id}:
 *   delete:
 *     tags:
 *       - Tag
 *     summary: Delete a specific tag by ID for a given marketplace.
 *     description: Deletes a tag by its ID from the specified marketplace.
 *     parameters:
 *       - name: id
 *         in: path
 *         description: The ID of the tag to delete.
 *         required: true
 *         schema:
 *           type: string
 *     responses:
 *       '200':
 *         description: Successfully deleted the tag.
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Tag'
 *       '404':
 *         description: Tag not found.
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
tagRouter.delete(`/tag/:id`, async (req, res) => {
  const { id } = req.params

  try {
    if (!id) {
      throw new Error('Tag ID is required')
    }
    await validateRole(req.user as AuthenticatedUser, 'admin')
    const tag = await prisma.tag.delete({
      where: {
        id: id,
      },
    })
    if (tag) {
      res.json(tag)
    } else {
      throw new Error('No tag ID found')
    }
  } catch (error) {
    const { statusCode, prismaError, customError } = generatePrismaError(error as Prisma.PrismaClientKnownRequestError)
    console.error('DELETE_TAG_ERROR:', prismaError || customError)
    res.status(statusCode).send({ errorMessage: customError || 'Failed to delete tag.' })
  }
})
