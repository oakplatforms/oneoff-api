import { Prisma } from '@prisma/client'
import express from 'express'
import { generateIncludes } from '../utils/generateIncludes'
import { getPrismaClient, generatePrismaError } from '../utils/prismaHelpers'
import { paginatePrisma } from '../utils/paginatePrisma'
import { uploadImage, uploadConfig } from '../utils/uploadImage'
import { deleteImage } from '../utils/deleteImage'
import { validateAdmin, AuthenticatedUser, validateRole } from '../validation/user'
import { processEntitiesInBatches, EntityProcessingInput } from '../utils/stepFunctions'

const prisma = getPrismaClient()
export const entityRouter = express.Router()

/**
 * @openapi
 * /entities:
 *   get:
 *     tags:
 *       - Entity
 *     summary: Retrieve entities with filtering
 *     description: |
 *       Fetch a list of entities with optional filters for categoryId, brandId, entity tags, and a search term.
 *       Supports filtering by category ID, brand ID, tag name/value, and free-text search on entity name or displayName.
 *     parameters:
 *       - in: query
 *         name: categoryId
 *         required: false
 *         schema:
 *           type: string
 *         description: The ID of the category to filter entities by.
 *       - in: query
 *         name: brandId
 *         required: false
 *         schema:
 *           type: string
 *         description: The ID of the brand to filter entities by.
 *       - in: query
 *         name: entityTags
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
 *         description: A search term to match against entity name or display name.
 *       - in: query
 *         name: include
 *         required: false
 *         schema:
 *           type: string
 *         description: Comma-separated list of related entities to include (e.g., `tags,product,brand,category`).
 *     responses:
 *       '200':
 *         description: Successfully retrieved a list of entities.
 *         content:
 *           application/json:
 *             schema:
 *               type: array
 *               items:
 *                 $ref: '#/components/schemas/Entity'
 *       '400':
 *         description: Bad request, typically due to invalid filters.
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 errorMessage:
 *                   type: string
 *                   example: Invalid query parameters
 *       '500':
 *         description: Internal server error occurred while querying entities.
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 errorMessage:
 *                   type: string
 *                   example: Unexpected error occurred
 */
entityRouter.get('/entities', async (req, res) => {
  const { include, entityTags, categoryId, brandId, setId, search, limit, page, usePagination } = req.query

  try {
    const entityTagFilters = Array.isArray(entityTags)
      ? entityTags.filter(tag => typeof tag === 'string')
      : typeof entityTags === 'string'
        ? [entityTags]
        : []

    const parsedTagFilters = entityTagFilters.map(tagFilter => {
      const [tagName, tagValue] = (tagFilter as string)?.split?.(':') ?? ['', '']
      return { tag: { name: tagName }, tagValue }
    })

    //Group entity tags by tag name
    const tagGroups = parsedTagFilters.reduce((groups, filter) => {
      const tagName = filter.tag.name
      if (!groups[tagName]) {
        groups[tagName] = []
      }
      groups[tagName].push(filter)
      return groups
    }, {} as Record<string, typeof parsedTagFilters>)

    const whereClause: Prisma.EntityWhereInput = {
      AND: [
        //For each tag name, create an OR condition for its values
        ...Object.entries(tagGroups).map(([tagName, filters]) => ({
          entityTags: {
            some: {
              tag: { name: tagName },
              tagValue: { in: filters.map(f => f.tagValue) }
            }
          }
        })),
        ...(categoryId
          ? [
            {
              categoryId: categoryId as string
            }
          ]
          : []),
        ...(brandId
          ? [
            {
              brandId: brandId as string
            }
          ]
          : []),
        ...(setId
          ? [
            {
              setId: setId as string
            }
          ]
          : []),
        ...(search
          ? [
            {
              OR: [
                { displayName: { contains: search as string, mode: 'insensitive' } },
                { name: { contains: search as string, mode: 'insensitive' } }
              ]
            } as Prisma.EntityWhereInput
          ]
          : [])
      ]
    }

    const parsedLimit = parseInt(limit as string) || 10
    const parsedPage = parseInt(page as string) || 0

    const result = await paginatePrisma({
      prismaModel: prisma.entity,
      where: whereClause,
      include: {
        ...generateIncludes(include as string),
        //Include listings and bids to calculate prices
        listings: {
          where: {
            AND: [
              { status: 'ACTIVE' },
              {
                OR: [
                  { isOffer: false },
                  { isOffer: null }
                ]
              }
            ]
          },
          orderBy: { price: 'asc' },
          take: 1,
          select: { price: true }
        },
        bids: {
          where: { status: 'ACTIVE' },
          orderBy: { price: 'desc' },
          take: 1,
          select: { price: true }
        }
      },
      orderBy: [
        {
          listings: {
            _count: 'desc'
          }
        },
        {
          bids: {
            _count: 'desc'
          }
        },
        {
          name: 'asc'
        }
      ],
      page: parsedPage,
      limit: parsedLimit,
      usePagination: usePagination === 'false' ? false : true,
    })

    const transformedData = {
      ...result,
      data: result.data.map((entity: Record<string, unknown>) => ({
        ...entity,
        lowestAsk: (entity.listings as Array<{price: unknown}>)?.[0]?.price || null,
        highestBid: (entity.bids as Array<{price: unknown}>)?.[0]?.price || null,
        listings: undefined,
        bids: undefined
      }))
    }

    res.json(transformedData)
  } catch (error) {
    const { statusCode, prismaError, customError } = generatePrismaError(error as Prisma.PrismaClientKnownRequestError)
    console.error('GET_ENTITIES_ERROR:', prismaError || customError)
    res.status(statusCode).send({ errorMessage: customError || 'Failed to retrieve entities.' })
  }
})

/**
 * @openapi
 * /entity:
 *   post:
 *     tags:
 *       - Entity
 *     summary: Create a new entity
 *     description: Creates a new entity with optional related tags, categories, and brands.
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - name
 *               - type
 *               - createdById
 *             properties:
 *               name:
 *                 type: string
 *                 description: Unique name of the entity.
 *               type:
 *                 type: string
 *                 description: Type of the entity (e.g., PRODUCT, CONTENT, SERVICE, CONTRACT).
 *               displayName:
 *                 type: string
 *                 description: Optional display name of the entity.
 *               description:
 *                 type: string
 *                 description: Optional description of the entity.
 *               image:
 *                 type: string
 *                 format: uri
 *                 description: Optional image URL for the entity.
 *               createdById:
 *                 type: string
 *                 description: ID of the user creating the entity.
 *               product:
 *                 type: object
 *                 description: Optional product data to create alongside the entity.
 *                 additionalProperties: true
 *               entityTags:
 *                 type: object
 *                 description: Optional tags to associate with the entity.
 *                 properties:
 *                   create:
 *                     type: array
 *                     items:
 *                       type: object
 *                       properties:
 *                         tagId:
 *                           type: string
 *                           description: ID of the tag to associate.
 *                         tagValue:
 *                           type: string
 *                           description: Value for the tag.
 *               entityCategories:
 *                 type: object
 *                 description: Optional categories to associate with the entity.
 *                 properties:
 *                   create:
 *                     type: array
 *                     items:
 *                       type: object
 *                       properties:
 *                         categoryId:
 *                           type: string
 *                           description: ID of the category to associate.
 *               entityBrands:
 *                 type: object
 *                 description: Optional brands to associate with the entity.
 *                 properties:
 *                   create:
 *                     type: array
 *                     items:
 *                       type: object
 *                       properties:
 *                         brandId:
 *                           type: string
 *                           description: ID of the brand to associate.
 *     responses:
 *       '200':
 *         description: Successfully created the entity.
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Entity'
 *       '400':
 *         description: Bad request (invalid input or missing required fields).
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 errorMessage:
 *                   type: string
 *                   example: Invalid input provided
 *       '500':
 *         description: Internal server error during entity creation.
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 errorMessage:
 *                   type: string
 *                   example: Unexpected error occurred
 */
entityRouter.post('/entity', async (req, res) => {
  const {
    name,
    type,
    displayName,
    description,
    image,
    product,
    entityTags,
    categoryId,
    brandId,
    createdById
  } = req.body

  try {
    await validateAdmin(req.user as AuthenticatedUser, createdById, 'admin')
    if (entityTags?.create?.length) {
      for (const entityTag of entityTags.create) {
        const selectedTag = await prisma.tag.findUnique({
          where: { id: entityTag.tagId },
          include: { supportedTagValues: true },
        })

        if (selectedTag?.supportedTagValues?.length) {
          const supportedTagValue = selectedTag.supportedTagValues.find(
            (supported) => supported.displayName === entityTag.tagValue
          )

          if (!supportedTagValue) {
            throw new Error(`Tag value ${entityTag.tagValue} is not supported for ${selectedTag?.displayName || selectedTag?.name} tag`)
          }
        }
      }
    }

    const entity = await prisma.entity.create({
      data: {
        name,
        type,
        displayName,
        description,
        image,
        product: product ? { create: product } : undefined,
        entityTags: entityTags?.create?.length
          ? {
            create: entityTags.create.map((tag: { tagId: string; tagValue: string }) => ({
              tag: { connect: { id: tag.tagId } },
              tagValue: tag.tagValue,
            })),
          }
          : undefined,
        category: { connect: { id: categoryId } },
        brand: { connect: { id: brandId } },
        createdBy: { connect: { id: createdById } },
      },
    })

    res.json(entity)
  } catch (error) {
    const { statusCode, prismaError, customError } = generatePrismaError(error as Prisma.PrismaClientKnownRequestError)
    console.error('CREATE_ENTITY_ERROR:', prismaError || customError)
    res.status(statusCode).send({ errorMessage: customError || 'Failed to create entity.' })
  }
})

/**
 * @openapi
 * /entity/{id}:
 *   put:
 *     tags:
 *       - Entity
 *     summary: Update an existing entity
 *     description: Updates an existing entity, including its tags, categories, brands, and product details. Validates tag values against supported values.
 *     parameters:
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
 *             properties:
 *               name:
 *                 type: string
 *                 description: Updated unique name of the entity.
 *               displayName:
 *                 type: string
 *                 description: Updated display name of the entity.
 *               description:
 *                 type: string
 *                 description: Updated description of the entity.
 *               image:
 *                 type: string
 *                 format: uri
 *                 description: Updated image URL of the entity.
 *               product:
 *                 type: object
 *                 description: Updated product data.
 *                 additionalProperties: true
 *               entityTags:
 *                 type: object
 *                 description: Manage associated tags for the entity.
 *                 properties:
 *                   create:
 *                     type: array
 *                     items:
 *                       type: object
 *                       properties:
 *                         tagId:
 *                           type: string
 *                           description: ID of the tag to create.
 *                         tagValue:
 *                           type: string
 *                           description: Tag value to assign.
 *                   update:
 *                     type: array
 *                     items:
 *                       type: object
 *                       properties:
 *                         id:
 *                           type: string
 *                           description: ID of the existing entity tag relation.
 *                         tagValue:
 *                           type: string
 *                           description: New value for the tag.
 *                   delete:
 *                     type: array
 *                     items:
 *                       type: string
 *                       description: ID of the entity tag relation to delete.
 *               entityCategories:
 *                 type: object
 *                 description: Manage associated categories for the entity.
 *                 properties:
 *                   create:
 *                     type: array
 *                     items:
 *                       type: object
 *                       properties:
 *                         categoryId:
 *                           type: string
 *                           description: ID of the category to create.
 *                   update:
 *                     type: array
 *                     items:
 *                       type: object
 *                       properties:
 *                         id:
 *                           type: string
 *                           description: ID of the existing entity category relation.
 *                         categoryId:
 *                           type: string
 *                           description: Updated category ID.
 *                   delete:
 *                     type: array
 *                     items:
 *                       type: string
 *                       description: ID of the entity category relation to delete.
 *               entityBrands:
 *                 type: object
 *                 description: Manage associated brands for the entity.
 *                 properties:
 *                   create:
 *                     type: array
 *                     items:
 *                       type: object
 *                       properties:
 *                         brandId:
 *                           type: string
 *                           description: ID of the brand to create.
 *                   update:
 *                     type: array
 *                     items:
 *                       type: object
 *                       properties:
 *                         id:
 *                           type: string
 *                           description: ID of the existing entity brand relation.
 *                         brandId:
 *                           type: string
 *                           description: Updated brand ID.
 *                   delete:
 *                     type: array
 *                     items:
 *                       type: string
 *                       description: ID of the entity brand relation to delete.
 *     responses:
 *       '200':
 *         description: Successfully updated the entity.
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
 *         description: Internal server error during entity update.
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 errorMessage:
 *                   type: string
 *                   example: Unexpected error occurred
 */
entityRouter.put('/entity/:id', async (req, res) => {
  const { id } = req.params
  const { entityTags, categoryId, brandId, product, lastModifiedById } = req.body

  try {
    await validateAdmin(req.user as AuthenticatedUser, lastModifiedById, 'admin')
    if (entityTags?.create?.length) {
      for (const entityTag of entityTags.create) {
        const selectedTag = await prisma.tag.findUnique({
          where: { id: entityTag.tagId },
          include: { supportedTagValues: true },
        })

        if (selectedTag?.supportedTagValues?.length) {
          const supportedTagValue = selectedTag.supportedTagValues.find(
            (supported) => supported.displayName === entityTag.tagValue
          )

          if (!supportedTagValue) {
            throw new Error(`Tag value ${entityTag.tagValue} is not supported for ${selectedTag?.displayName || selectedTag?.name} tag`)
          }
        }
      }
    }

    //First check if entity has an existing product
    const existingEntity = await prisma.entity.findUnique({
      where: { id },
      select: { product: true }
    })

    const entity = await prisma.entity.update({
      where: { id },
      data: {
        name: req.body.name,
        type: req.body.type,
        displayName: req.body.displayName,
        description: req.body.description,
        image: req.body.image,
        secondaryImage: req.body.secondaryImage,
        lastModifiedBy: { connect: { id: lastModifiedById } },
        product: product
          ? existingEntity?.product
            ? {
              update: {
                ...product,
              },
            }
            : {
              create: {
                ...product,
              },
            }
          : undefined,
        entityTags: entityTags
          ? {
            create: entityTags.create?.map((entityTag: { tagId: string; tagValue: string }) => ({
              tag: { connect: { id: entityTag.tagId } },
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
        category: categoryId ? { connect: { id: categoryId } } : undefined,
        brand: brandId ? { connect: { id: brandId } } : undefined,
        set: req.body.setId ? { connect: { id: req.body.setId } } : undefined,
      },
    })

    if (entity) {
      res.json(entity)
    } else {
      throw new Error('Cannot update entity by id')
    }
  } catch (error) {
    const { statusCode, prismaError, customError } = generatePrismaError(error as Prisma.PrismaClientKnownRequestError)
    console.error('UPDATE_ENTITY_ERROR:', prismaError || customError)
    res.status(statusCode).send({ errorMessage: customError || 'Failed to update entity.' })
  }
})

/**
 * @openapi
 * /entity/upload-image/{id}:
 *   put:
 *     tags:
 *       - Entity
 *     summary: Upload an image and update the entity
 *     description: Uploads an image file for an entity and updates either the `image` or `secondaryImage` field with the stored S3 path. Supports JPEG, PNG, and WEBP. Image is resized before upload.
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *         description: ID of the entity to update
 *       - in: query
 *         name: field
 *         required: false
 *         schema:
 *           type: string
 *           enum: [image, secondaryImage]
 *           default: image
 *         description: The image field to update (image or secondaryImage)
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
 *                 description: Image file to upload (JPEG, PNG, or WEBP)
 *     responses:
 *       '200':
 *         description: Successfully uploaded the image and updated the entity
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 entity:
 *                   $ref: '#/components/schemas/Entity'
 *       '400':
 *         description: Missing file or invalid request body
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 error:
 *                   type: string
 *                   example: Missing image file
 *       '500':
 *         description: Internal server error during image processing or DB update
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 errorMessage:
 *                   type: string
 *                   example: Unexpected error occurred
 */
entityRouter.put('/entity/upload-image/:id', uploadConfig.single('file'), async (req, res) => {
  const { id } = req.params
  const { field = 'image' } = req.query

  try {
    validateRole(req.user as AuthenticatedUser, 'admin')
    if (!req.file) {
      throw new Error('Missing image file')
    }

    if (field !== 'image' && field !== 'secondaryImage') {
      throw new Error('Invalid field parameter. Must be "image" or "secondaryImage"')
    }

    const key = await uploadImage(req.file, 'entity')

    const updatedEntity = await prisma.entity.update({
      where: { id },
      data: { [field]: key },
    })

    res.json(updatedEntity)
  } catch (error) {
    const { statusCode, prismaError, customError } = generatePrismaError(error as Prisma.PrismaClientKnownRequestError)
    console.error('UPLOAD_ENTITY_IMAGE_ERROR:', prismaError, customError)
    res.status(statusCode).send({ errorMessage: customError || 'Failed to upload entity image.' })
  }
})

/**
 * @openapi
 * /entity/delete-image/{id}:
 *   delete:
 *     tags:
 *       - Entity
 *     summary: Delete an entity's image
 *     description: Deletes the image file associated with an entity from S3 and clears the entity's `image` or `secondaryImage` field in the database.
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *         description: ID of the entity whose image should be deleted.
 *       - in: query
 *         name: field
 *         required: false
 *         schema:
 *           type: string
 *           enum: [image, secondaryImage]
 *           default: image
 *         description: The image field to delete (image or secondaryImage)
 *     responses:
 *       '200':
 *         description: Successfully deleted the image and updated the entity
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 entity:
 *                   $ref: '#/components/schemas/Entity'
 *                 message:
 *                   type: string
 *                   example: Image deleted successfully
 *       '400':
 *         description: Invalid field parameter
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 error:
 *                   type: string
 *                   example: Invalid field parameter. Must be "image" or "secondaryImage"
 *       '404':
 *         description: Entity not found or entity has no image
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 errorMessage:
 *                   type: string
 *                   example: Entity not found or has no image
 *       '500':
 *         description: Internal server error during image deletion or DB update
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 errorMessage:
 *                   type: string
 *                   example: Unexpected error occurred
 */
entityRouter.delete('/entity/delete-image/:id', async (req, res) => {
  const { id } = req.params
  const { field = 'image' } = req.query

  try {
    validateRole(req.user as AuthenticatedUser, 'admin')

    if (field !== 'image' && field !== 'secondaryImage') {
      throw new Error('Invalid field parameter. Must be "image" or "secondaryImage"' )
    }

    const entity = await prisma.entity.findUnique({
      where: { id },
      select: { image: true, secondaryImage: true }
    })

    if (!entity) {
      throw new Error('Entity not found')
    }

    const imageToDelete = field === 'image' ? entity.image : entity.secondaryImage

    if (!imageToDelete) {
      throw new Error(`Entity has no ${field} to delete`)
    }

    await deleteImage(imageToDelete)

    const updatedEntity = await prisma.entity.update({
      where: { id },
      data: { [field]: null },
    })

    res.json({
      entity: updatedEntity,
      message: `${field} deleted successfully`
    })
  } catch (error) {
    const { statusCode, prismaError, customError } = generatePrismaError(error as Prisma.PrismaClientKnownRequestError)
    console.error('DELETE_ENTITY_IMAGE_ERROR:', prismaError, customError)
    res.status(statusCode).send({ errorMessage: 'Failed to delete entity image.' })
  }
})

/**
 * @openapi
 * /entity/{id}:
 *   get:
 *     tags:
 *       - Entity
 *     summary: Get a single entity by ID
 *     description: Retrieves a specific entity by ID. Optionally, include related data by passing the `include` query parameter.
 *     parameters:
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
/**
 * @openapi
 * /entities/batch:
 *   get:
 *     tags:
 *       - Entity
 *     summary: Retrieve multiple entities by IDs
 *     description: |
 *       Fetch multiple entities by their IDs. Accepts entity IDs as a comma-separated string.
 *       If an entity ID doesn't exist, it will be silently skipped and not included in the response.
 *     parameters:
 *       - in: query
 *         name: entityIds
 *         required: true
 *         schema:
 *           type: string
 *         description: Comma-separated list of entity IDs to retrieve (e.g., entityIds=id1,id2,id3).
 *       - in: query
 *         name: include
 *         required: false
 *         schema:
 *           type: string
 *         description: Comma-separated list of related entities to include (e.g., `tags,product,brand,category`).
 *     responses:
 *       '200':
 *         description: Successfully retrieved the entities that exist.
 *         content:
 *           application/json:
 *             schema:
 *               type: array
 *               items:
 *                 $ref: '#/components/schemas/Entity'
 *       '400':
 *         description: Bad request, typically due to missing entity IDs.
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 errorMessage:
 *                   type: string
 *                   example: No entity IDs provided
 *       '500':
 *         description: Internal server error occurred while querying entities.
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 errorMessage:
 *                   type: string
 *                   example: Unexpected error occurred
 */
entityRouter.get('/entities/batch', async (req, res) => {
  const { entityIds, include } = req.query

  try {
    if (!entityIds || typeof entityIds !== 'string') {
      throw new Error('entityIds parameter is required')
    }

    const entityIdArray = entityIds.split(',').map(id => id.trim()).filter(id => id)

    if (entityIdArray.length === 0) {
      throw new Error('No valid entity IDs provided')
    }

    const uniqueEntityIds = Array.from(new Set(entityIdArray))

    const entities = await prisma.entity.findMany({
      where: {
        id: { in: uniqueEntityIds }
      },
      include: {
        ...generateIncludes(include as string),
        listings: {
          where: {
            AND: [
              { status: 'ACTIVE' },
              {
                OR: [
                  { isOffer: false },
                  { isOffer: null }
                ]
              }
            ]
          },
          orderBy: { price: 'asc' },
          take: 1,
          select: { price: true }
        },
        bids: {
          where: { status: 'ACTIVE' },
          orderBy: { price: 'desc' },
          take: 1,
          select: { price: true }
        }
      }
    })

    //Sort entities to match the order of entityIds parameter and apply transformation
    const orderedEntities = uniqueEntityIds
      .map(id => entities.find(entity => entity.id === id))
      .filter((entity): entity is NonNullable<typeof entity> => entity !== undefined)
      .map(entity => ({
        ...entity,
        lowestAsk: (entity.listings as Array<{price: unknown}>)?.[0]?.price || null,
        highestBid: (entity.bids as Array<{price: unknown}>)?.[0]?.price || null,
        listings: undefined,
        bids: undefined
      }))

    res.json(orderedEntities)
  } catch (error) {
    const { statusCode, prismaError, customError } = generatePrismaError(error as Prisma.PrismaClientKnownRequestError)
    console.error('GET_ENTITIES_BATCH_ERROR:', prismaError || customError)
    res.status(statusCode).send({ errorMessage: customError || 'Failed to retrieve entities.' })
  }
})

entityRouter.get('/entity/:id', async (req, res) => {
  const { id } = req.params
  const { include } = req.query

  try {
    if (!id) {
      throw new Error('Entity ID is required')
    }
    const entity = await prisma.entity.findUnique({
      where: {
        id
      },
      include: {
        ...generateIncludes(include as string),
        //Include listings and bids to calculate prices
        listings: {
          where: {
            AND: [
              { status: 'ACTIVE' },
              {
                OR: [
                  { isOffer: false },
                  { isOffer: null }
                ]
              }
            ]
          },
          orderBy: { price: 'asc' },
          take: 1,
          select: { price: true }
        },
        bids: {
          where: { status: 'ACTIVE' },
          orderBy: { price: 'desc' },
          take: 1,
          select: { price: true }
        }
      }
    })

    if (entity) {
      const transformedEntity = {
        ...entity,
        lowestAsk: (entity.listings as Array<{price: unknown}>)?.[0]?.price || null,
        highestBid: (entity.bids as Array<{price: unknown}>)?.[0]?.price || null,
        listings: undefined,
        bids: undefined
      }
      res.json(transformedEntity)
    } else {
      throw new Error('No entity ID found')
    }
  } catch (error) {
    const { statusCode, prismaError, customError } = generatePrismaError(error as Prisma.PrismaClientKnownRequestError)
    console.error('GET_ENTITY_ERROR:', prismaError || customError)
    res.status(statusCode).send({ errorMessage: customError || 'Failed to retrieve entity.' })
  }
})

/**
 * @openapi
 * /entity/{id}:
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
entityRouter.delete(`/entity/:id`, async (req, res) => {
  const { id } = req.params

  try {
    if (!id) {
      throw new Error('Entity ID is required')
    }
    validateRole(req.user as AuthenticatedUser, 'admin')
    const entity = await prisma.entity.findUnique({
      where: { id },
      select: { image: true, secondaryImage: true }
    })

    if (!entity) {
      throw new Error('Entity not found')
    }

    const deletePromises = []

    if (entity.image) {
      deletePromises.push(deleteImage(entity.image).catch(error => {
        console.error('Failed to delete primary image:', error)
      }))
    }

    if (entity.secondaryImage) {
      deletePromises.push(deleteImage(entity.secondaryImage).catch(error => {
        console.error('Failed to delete secondary image:', error)
      }))
    }

    await Promise.all(deletePromises)

    const deletedEntity = await prisma.entity.delete({
      where: { id },
    })

    res.json(deletedEntity)
  } catch (error) {
    const { statusCode, prismaError, customError } = generatePrismaError(error as Prisma.PrismaClientKnownRequestError)
    console.error('DELETE_ENTITY_ERROR:', prismaError || customError)
    res.status(statusCode).send({ errorMessage: customError || 'Failed to delete entity.' })
  }
})

/**
 * @openapi
 * /entities/process-batch:
 *   post:
 *     tags:
 *       - Entity
 *     summary: Process all entities and send to Step Function
 *     description: |
 *       Processes all entities in the database, constructs the required object format for each entity,
 *       and sends them to an AWS Step Function in batches. This endpoint handles thousands of entities
 *       efficiently by batching them and controlling concurrency.
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               batchSize:
 *                 type: integer
 *                 description: Number of entities to process per batch (default: 100)
 *                 default: 100
 *                 minimum: 1
 *                 maximum: 1000
 *               maxBatches:
 *                 type: integer
 *                 description: Maximum number of batches to process (optional, for testing)
 *                 minimum: 1
 *     responses:
 *       '200':
 *         description: Successfully processed entities and started Step Function executions
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 message:
 *                   type: string
 *                   description: Success message
 *                 totalEntities:
 *                   type: integer
 *                   description: Total number of entities processed
 *                 totalBatches:
 *                   type: integer
 *                   description: Total number of batches created
 *                 executionArns:
 *                   type: array
 *                   items:
 *                     type: string
 *                   description: ARNs of the Step Function executions started
 *       '400':
 *         description: Bad request, typically due to missing PRICING_ENGINE_ARN environment variable
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 errorMessage:
 *                   type: string
 *                   example: State machine ARN is required
 *       '500':
 *         description: Internal server error during entity processing
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 errorMessage:
 *                   type: string
 *                   example: Failed to process entities
 */
entityRouter.post('/entities/process-batch', async (req, res) => {
  const { batchSize = 100, maxBatches } = req.body

  try {
    const stateMachineArn = process.env.PRICING_ENGINE_ARN

    if (!stateMachineArn) {
      throw new Error('PRICING_ENGINE_ARN environment variable is required')
    }

    if (batchSize < 1 || batchSize > 1000) {
      throw new Error('Batch size must be between 1 and 1000')
    }

    if (maxBatches && maxBatches < 1) {
      throw new Error('Max batches must be at least 1')
    }

    console.log('Starting entity batch processing...')

    //Fetch all entities with required relationships
    const entities = await prisma.entity.findMany({
      include: {
        brand: {
          select: {
            displayName: true
          }
        },
        set: {
          select: {
            displayName: true
          }
        },
        product: {
          select: {
            number: true
          }
        },
        entityTags: {
          include: {
            tag: {
              select: {
                name: true
              }
            }
          }
        }
      }
    })

    console.log(`Found ${entities.length} entities to process`)

    if (maxBatches) {
      const maxEntities = maxBatches * batchSize
      const entitiesToProcess = Math.min(entities.length, maxEntities)
      console.log(`Limiting to ${maxBatches} batches (max ${maxEntities} entities), will process ${entitiesToProcess} entities`)
    }

    //Transform entities to the required format
    const processedEntities: EntityProcessingInput[] = entities.map(entity => {
      //Find rarity tag value
      const rarityTag = entity.entityTags.find(et => et.tag.name === 'rarity')
      const rarity = rarityTag?.tagValue

      //Find color tag value
      const colorTag = entity.entityTags.find(et => et.tag.name === 'color')
      const color = colorTag?.tagValue

      //Determine print based on product number
      let print: string | undefined
      if (entity.product?.number) {
        const number = entity.product.number
        if (number.endsWith('-RF')) {
          print = 'Rainbow Foil'
        } else if (number.endsWith('-CF')) {
          print = 'Cold Foil'
        } else if (number.endsWith('-GF')) {
          print = 'Gold Foil'
        }
      }

      //Determine edition based on product number
      let edition = 'First Edition'
      if (entity.product?.number && entity.product.number.startsWith('U-')) {
        edition = 'Unlimited'
      }

      return {
        entityId: entity.id,
        brand: entity.brand?.displayName || '',
        name: entity.displayName || entity.name,
        number: entity.product?.number || '',
        rarity: rarity || '',
        color: color || '',
        set: entity.set?.displayName || '',
        print,
        edition
      }
    })

    //Process entities in batches and send to Step Function
    const { executionArns, totalBatches } = await processEntitiesInBatches(
      processedEntities,
      stateMachineArn,
      batchSize,
      maxBatches
    )

    console.log(`Successfully started ${totalBatches} batches with ${executionArns.length} executions`)

    res.json({
      message: 'Entity batch processing started successfully',
      totalEntities: processedEntities.length,
      totalBatches,
      executionArns
    })

  } catch (error) {
    const { statusCode, prismaError, customError } = generatePrismaError(error as Prisma.PrismaClientKnownRequestError)
    console.error('PROCESS_ENTITIES_BATCH_ERROR:', prismaError || customError)
    res.status(statusCode).send({ errorMessage: customError || 'Failed to process entities.' })
  }
})
