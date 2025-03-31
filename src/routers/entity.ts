import { Prisma } from '@prisma/client'
import express from 'express'
import { generateIncludes } from '../utils/generateIncludes'
import { getPrismaClient, generatePrismaError } from '../utils/prismaHelpers'

const prisma = getPrismaClient()
export const entityRouter = express.Router()

/**
 * @openapi
 * /{marketplaceName}/{brandName}/entities:
 *   get:
 *     tags:
 *       - Entity
 *     summary: Retrieve entities by brand and optional filters
 *     description: |
 *       Fetch a list of entities associated with a specific brand and marketplace.
 *       Optional filters include category, entity tags, and search.
 *     parameters:
 *       - in: path
 *         name: marketplaceName
 *         required: true
 *         schema:
 *           type: string
 *         description: The name of the marketplace.
 *       - in: path
 *         name: brandName
 *         required: true
 *         schema:
 *           type: string
 *         description: The name of the brand.
 *       - in: query
 *         name: category
 *         required: true
 *         schema:
 *           type: string
 *         description: The category associated with the brand.
 *       - in: query
 *         name: include
 *         required: false
 *         schema:
 *           type: string
 *         description: Comma-separated list of related entities to include (e.g. `tags,images`).
 *       - in: query
 *         name: entityTag
 *         required: false
 *         schema:
 *           type: array
 *           items:
 *             type: string
 *         style: form
 *         explode: true
 *         description: One or more entity tags to filter by, formatted as `tagName:tagValue`.
 *       - in: query
 *         name: search
 *         required: false
 *         schema:
 *           type: string
 *         description: Search term to match against entity name or displayName.
 *     responses:
 *       '200':
 *         description: A list of matching entities.
 *         content:
 *           application/json:
 *             schema:
 *               type: array
 *               items:
 *                 $ref: '#/components/schemas/Entity'
 *       '404':
 *         description: Brand category not found.
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 errorMessage:
 *                   type: string
 *                   example: Brand category not found
 *       '500':
 *         description: Internal server error while querying entities.
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 errorMessage:
 *                   type: string
 *                   example: Unexpected error occurred
 */
entityRouter.get('/:marketplaceName/:brandName/entities', async (req, res) => {
  const { brandName } = req.params
  const { include, category, entityTag, search } = req.query

  try {
    const brandCategory = await prisma.brandCategory.findFirstOrThrow({
      where: {
        brandName: brandName,
        categoryName: category as string || ''
      }
    })

    const entityTagFilters = Array.isArray(entityTag)
      ? entityTag.filter(tag => typeof tag === 'string')
      : typeof entityTag === 'string'
        ? [entityTag]
        : []

    const parsedFilters = entityTagFilters.map(tagFilter => {
      const [tagName, tagValue] = (tagFilter as string)?.split?.(':') ?? ['', '']
      return { tag: { name: tagName }, tagValue }
    })

    const whereClause: Prisma.EntityWhereInput = {
      brandCategoryId: brandCategory.id,
      AND: [
        ...(parsedFilters.length > 0
          ? [
            {
              entityTags: {
                some: {
                  OR: parsedFilters
                }
              }
            }
          ]
          : []),
        ...(search
          ? [
            {
              OR: [
                { displayName: { contains: search as string, mode: 'insensitive' as Prisma.QueryMode } },
                { name: { contains: search as string, mode: 'insensitive' as Prisma.QueryMode } }
              ]
            }
          ]
          : [])
      ]
    }

    const entities = await prisma.entity.findMany({
      where: whereClause,
      include: generateIncludes(include)
    })

    res.json(entities)
  } catch (error) {
    const { statusCode, errorMessage } = generatePrismaError(error as Prisma.PrismaClientKnownRequestError)
    res.status(statusCode).send({ errorMessage })
  }
})

/**
 * @openapi
 * /{marketplaceName}/{brandName}/entity:
 *   post:
 *     tags:
 *       - Entity
 *     summary: Create a new entity
 *     description: Creates a new entity under a given brand and marketplace. Validates supported tag values if provided.
 *     parameters:
 *       - in: path
 *         name: marketplaceName
 *         required: true
 *         schema:
 *           type: string
 *         description: The name of the marketplace.
 *       - in: path
 *         name: brandName
 *         required: true
 *         schema:
 *           type: string
 *         description: The name of the brand.
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - name
 *               - type
 *               - brandCategoryId
 *               - createdById
 *             properties:
 *               name:
 *                 type: string
 *               type:
 *                 type: string
 *                 description: Type of the entity (e.g., PRODUCT, CONTENT, etc.)
 *               displayName:
 *                 type: string
 *               description:
 *                 type: string
 *               image:
 *                 type: string
 *                 format: uri
 *               brandCategoryId:
 *                 type: string
 *                 description: ID of the associated brand category.
 *               createdById:
 *                 type: string
 *                 description: ID of the user creating the entity.
 *               product:
 *                 type: object
 *                 description: Product data to create alongside the entity.
 *                 additionalProperties: true
 *               entityTags:
 *                 type: object
 *                 properties:
 *                   create:
 *                     type: array
 *                     items:
 *                       type: object
 *                       properties:
 *                         tagId:
 *                           type: string
 *                         tagValue:
 *                           type: string
 *     responses:
 *       '200':
 *         description: Successfully created entity.
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Entity'
 *       '400':
 *         description: Tag value not supported or bad request.
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 errorMessage:
 *                   type: string
 *                   example: Tag value Green is not supported for Color tag
 *       '500':
 *         description: Internal server error during entity creation.
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 errorMessage:
 *                   type: string
 */
entityRouter.post(`/:marketplaceName/:brandName/entity`, async (req, res) => {
  const {
    name,
    type,
    displayName,
    description,
    product,
    brandCategoryId,
    image,
    entityTags,
    createdById
  } = req.body

  if (entityTags?.create?.length) {
    entityTags.create.forEach(async (entityTag: { tagId: string; tagValue: string }) => {
      const selectedTag = await prisma.tag.findUnique({
        where: {
          id: entityTag.tagId,
        },
        include: {
          supportedTagValues: true
        }
      })

      if (selectedTag?.supportedTagValues?.length) {
        const supportedTagValue = selectedTag?.supportedTagValues?.find(supportedTagValue => supportedTagValue.displayName === entityTag.tagValue)

        if (!supportedTagValue) {
          throw new Error(`Tag value ${entityTag.tagValue} is not supported for ${selectedTag?.displayName || selectedTag?.name} tag`)
        }
      }
    })
  }

  try {
    const entity = await prisma.entity.create({
      data: {
        name,
        type,
        displayName,
        description,
        image,
        product: {
          create: product,
        },
        entityTags: entityTags?.create?.length
          ? {
            create: entityTags.create.map((entityTag: { tagId: string; tagValue: string }) => ({
              tag: { connect: { id: entityTag.tagId } },
              tagValue: entityTag.tagValue,
            })),
          }
          : undefined,
        brandCategory: { connect: { id: brandCategoryId } },
        createdBy: { connect: { id: createdById } },
      },
    })
    res.json(entity)
  } catch (error) {
    const { statusCode, errorMessage } = generatePrismaError(error as Prisma.PrismaClientKnownRequestError)
    res.status(statusCode).send({ errorMessage })
  }
})

/**
 * @openapi
 * /{marketplaceName}/{brandName}/entity/{id}:
 *   put:
 *     tags:
 *       - Entity
 *     summary: Update an existing entity
 *     description: Updates an existing entity, its tags, and product details. Validates tag values against supported values.
 *     parameters:
 *       - in: path
 *         name: marketplaceName
 *         required: true
 *         schema:
 *           type: string
 *         description: The name of the marketplace.
 *       - in: path
 *         name: brandName
 *         required: true
 *         schema:
 *           type: string
 *         description: The name of the brand.
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *         description: ID of the entity to update.
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - brandCategoryId
 *             properties:
 *               name:
 *                 type: string
 *               displayName:
 *                 type: string
 *               description:
 *                 type: string
 *               image:
 *                 type: string
 *               brandCategoryId:
 *                 type: string
 *               product:
 *                 type: object
 *                 description: Product data to update.
 *                 additionalProperties: true
 *               entityTags:
 *                 type: object
 *                 properties:
 *                   create:
 *                     type: array
 *                     items:
 *                       type: object
 *                       properties:
 *                         tagId:
 *                           type: string
 *                         tagValue:
 *                           type: string
 *                   update:
 *                     type: array
 *                     items:
 *                       type: object
 *                       properties:
 *                         id:
 *                           type: string
 *                         tagValue:
 *                           type: string
 *                   delete:
 *                     type: array
 *                     items:
 *                       type: string
 *                       description: ID of the tag relation to delete
 *     responses:
 *       '200':
 *         description: Successfully updated entity.
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Entity'
 *       '400':
 *         description: Invalid tag value or bad request.
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 errorMessage:
 *                   type: string
 *                   example: Tag value "Rainbow" is not supported for "Color" tag.
 *       '500':
 *         description: Internal server error during update.
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 errorMessage:
 *                   type: string
 */
entityRouter.put(`/:marketplaceName/:brandName/entity/:id`, async (req, res) => {
  const { id } = req.params
  const { entityTags } = req.body

  if (entityTags?.create?.length) {
    entityTags.create.forEach(async (entityTag: { tagId: string; tagValue: string }) => {
      const selectedTag = await prisma.tag.findUnique({
        where: {
          id: entityTag.tagId,
        },
        include: {
          supportedTagValues: true
        }
      })

      if (selectedTag?.supportedTagValues?.length) {
        const supportedTagValue = selectedTag?.supportedTagValues?.find(supportedTagValue => supportedTagValue.displayName === entityTag.tagValue)

        if (!supportedTagValue) {
          throw new Error(`Tag value ${entityTag.tagValue} is not supported for ${selectedTag?.displayName || selectedTag?.name} tag`)
        }
      }
    })
  }

  try {
    const entity = await prisma.entity.update({
      where: { id },
      data: {
        ...req.body,
        product: req.body.product ? {
          update: {
            ...req.body.product,
            brandCategoryId: req.body.brandCategoryId
          }
        } : undefined,
        entityTags: entityTags
          ? {
            create: entityTags.create?.map((entityTag: { tagId: string; tagValue: string }) => ({
              tagId: entityTag.tagId,
              tagValue: entityTag.tagValue,
            })),
            updateMany: entityTags.update?.map((entityTag: { id: string; tagValue: string }) => ({
              where: { id: entityTag.id },
              data: { tagValue: entityTag.tagValue },
            })),
            deleteMany: entityTags.delete?.map((entityTagId: string) => ({
              id: entityTagId,
            })),
          }
          : undefined,
        brandCategoryId: req.body.brandCategoryId,
      }
    })
    if (entity) {
      res.json(entity)
    } else {
      throw new Error('Cannot update entity by id')
    }
  } catch (error) {
    const { statusCode, errorMessage } = generatePrismaError(error as Prisma.PrismaClientKnownRequestError)
    res.status(statusCode).send({ errorMessage })
  }
})

/**
 * @openapi
 * /{marketplaceName}/{brandName}/entity/{id}:
 *   get:
 *     tags:
 *       - Entity
 *     summary: Get a single entity by ID
 *     description: Retrieves a specific entity by ID. Optionally, include related data by passing the `include` query parameter.
 *     parameters:
 *       - in: path
 *         name: marketplaceName
 *         required: true
 *         schema:
 *           type: string
 *         description: The name of the marketplace.
 *       - in: path
 *         name: brandName
 *         required: true
 *         schema:
 *           type: string
 *         description: The name of the brand.
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *         description: ID of the entity to retrieve.
 *       - in: query
 *         name: include
 *         schema:
 *           type: string
 *         description: Comma-separated list of related models to include (e.g., `product,tags`).
 *     responses:
 *       '200':
 *         description: Successfully retrieved the entity.
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Entity'
 *       '404':
 *         description: Entity not found.
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 errorMessage:
 *                   type: string
 *                   example: No entity ID found
 *       '500':
 *         description: Internal Server Error.
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 errorMessage:
 *                   type: string
 */
entityRouter.get('/:marketplaceName/:brandName/entity/:id', async (req, res) => {
  const { id } = req.params
  const { include } = req.query

  try {
    const entity = await prisma.entity.findUnique({
      where: {
        id
      },
      include: generateIncludes(include)
    })

    if (entity) {
      res.json(entity)
    } else {
      throw new Error('No entity ID found')
    }
  } catch (error) {
    const { statusCode, errorMessage } = generatePrismaError(error as Prisma.PrismaClientKnownRequestError)
    res.status(statusCode).send({ errorMessage })
  }
})

/**
 * @openapi
 * /{marketplaceName}/{brandName}/entity/{id}:
 *   delete:
 *     tags:
 *       - Entity
 *     summary: Delete an entity by ID
 *     description: Deletes a specific entity using its ID.
 *     parameters:
 *       - in: path
 *         name: marketplaceName
 *         required: true
 *         schema:
 *           type: string
 *         description: The marketplace where the entity belongs.
 *       - in: path
 *         name: brandName
 *         required: true
 *         schema:
 *           type: string
 *         description: The brand the entity is associated with.
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *         description: The ID of the entity to delete.
 *     responses:
 *       '200':
 *         description: Entity successfully deleted.
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Entity'
 *       '404':
 *         description: Entity not found.
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 errorMessage:
 *                   type: string
 *                   example: No entity ID found
 *       '500':
 *         description: Internal Server Error.
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 errorMessage:
 *                   type: string
 */
entityRouter.delete(`/:marketplaceName/:brandName/entity/:id`, async (req, res) => {
  const { id } = req.params

  try {
    const entity = await prisma.entity.delete({
      where: {
        id: id,
      },
    })
    if (entity) {
      res.json(entity)
    } else {
      throw new Error('No entity ID found')
    }
  } catch (error) {
    console.error('error', error)
    const { statusCode, errorMessage } = generatePrismaError(error as Prisma.PrismaClientKnownRequestError)
    res.status(statusCode).send({ errorMessage })
  }
})
