import { Prisma } from '@prisma/client'
import express from 'express'
import { generateIncludes } from '../utils/generateIncludes'
import { prismaClient, generatePrismaError } from '../utils/prismaHelpers'
import { paginatePrisma } from '../utils/paginatePrisma'

const prisma = prismaClient()
export const entityTagRouter = express.Router()

/**
 * @openapi
 * /entity-tags:
 *   get:
 *     tags:
 *       - Entity Tag
 *     summary: Retrieve entity tags
 *     description: Retrieve a list of entity tags filtered by entityId, tagId, or both.
 *     parameters:
 *       - name: entityId
 *         in: query
 *         description: Optional. Filter by entityId.
 *         schema:
 *           type: string
 *       - name: tagId
 *         in: query
 *         description: Optional. Filter by tagId.
 *         schema:
 *           type: string
 *       - name: include
 *         in: query
 *         description: Optional. Include related models (e.g., tag, entity).
 *         schema:
 *           type: string
 *     responses:
 *       '200':
 *         description: A list of matching entity tags.
 *         content:
 *           application/json:
 *             schema:
 *               type: array
 *               items:
 *                 $ref: '#/components/schemas/EntityTag'
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
entityTagRouter.get('/entity-tags', async (req, res) => {
  const { include, entityId, tagId, usePagination, page, limit } = req.query

  try {
    const parsedLimit = parseInt(limit as string) || 10
    const parsedPage = parseInt(page as string) || 0

    const where = {
      ...(entityId ? { entityId: entityId as string } : {}),
      ...(tagId ? { tagId: tagId as string } : {}),
    }

    const result = await paginatePrisma({
      prismaModel: prisma.entityTag,
      where,
      include: generateIncludes(include as string),
      page: parsedPage,
      limit: parsedLimit,
      usePagination: usePagination === 'false' ? false : true,
    })

    res.json(result)
  } catch (error) {
    const { statusCode, prismaError, customError } = generatePrismaError(error as Prisma.PrismaClientKnownRequestError)
    console.error('GET_ENTITY_TAGS_ERROR:', prismaError || customError)
    res.status(statusCode).send({ errorMessage: customError || 'Failed to retrieve entity tags.' })
  }
})

/**
 * @openapi
 * /entity-tag/{id}:
 *   get:
 *     tags:
 *       - Entity Tag
 *     summary: Retrieve an entity tag by ID
 *     description: Fetches a single entity tag by its unique ID. You may include related data using the `include` query parameter.
 *     parameters:
 *       - in: path
 *         name: marketplaceName
 *         required: true
 *         schema:
 *           type: string
 *         description: The name of the marketplace.
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *         description: The ID of the entity tag to retrieve.
 *       - in: query
 *         name: include
 *         schema:
 *           type: string
 *         description: Comma-separated list of related models to include in the response.
 *     responses:
 *       '200':
 *         description: Successfully retrieved the entity tag.
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/EntityTag'
 *       '404':
 *         description: Entity tag not found.
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 errorMessage:
 *                   type: string
 *                   example: No entity tag ID found
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
entityTagRouter.get('/entity-tag/:id', async (req, res) => {
  const { id } = req.params
  const { include } = req.query

  try {
    if (!id) {
      throw new Error('Entity tag ID is required')
    }
    const entityTag = await prisma.entityTag.findUnique({
      where: {
        id
      },
      include: generateIncludes(include as string)
    })
    if (entityTag) {
      res.json(entityTag)
    } else {
      throw new Error('No entity tag ID found')
    }
  } catch (error) {
    const { statusCode, prismaError, customError } = generatePrismaError(error as Prisma.PrismaClientKnownRequestError)
    console.error('GET_ENTITY_TAG_ERROR:', prismaError || customError)
    res.status(statusCode).send({ errorMessage: customError || 'Failed to retrieve entity tag.' })
  }
})
