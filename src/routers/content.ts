import { ContentType, Prisma } from '@prisma/client'
import express from 'express'
import { generateIncludes } from '../utils/generateIncludes'
import { prismaClient, generatePrismaError } from '../utils/prismaHelpers'
import { paginatePrisma } from '../utils/paginatePrisma'
import { uploadImage, uploadConfig } from '../utils/uploadImage'
import { deleteImage } from '../utils/deleteImage'
import { generateReferenceCodeWithRetry } from '../utils/referenceCodeGenerator'
import { validateAccount, AuthenticatedUser } from '../validation/user'
import { validateStringFields, STRING_LIMITS } from '../validation/stringLimits'

const prisma = prismaClient()
export const contentRouter = express.Router()

/**
 * @openapi
 * /contents:
 *   get:
 *     tags:
 *       - Content
 *     summary: Retrieve a list of content
 *     parameters:
 *       - in: query
 *         name: include
 *         required: false
 *         schema:
 *           type: string
 *         description: Comma-separated list of related entities to include
 *       - in: query
 *         name: page
 *         required: false
 *         schema:
 *           type: integer
 *       - in: query
 *         name: limit
 *         required: false
 *         schema:
 *           type: integer
 *     responses:
 *       '200':
 *         description: Successfully retrieved contents
 */
contentRouter.get('/contents', async (req, res) => {
  const { include, usePagination, page, limit, accountId, type } = req.query

  const where: Prisma.ContentWhereInput = {}
  if (accountId) {
    where.accountId = accountId as string
  }
  if (type) {
    where.type = type as ContentType
  }

  try {
    const result = await paginatePrisma({
      prismaModel: prisma.content,
      where,
      include: generateIncludes(include as string),
      page: parseInt(page as string) || 0,
      limit: parseInt(limit as string) || 10,
      usePagination: usePagination === 'false' ? false : true,
    })

    res.json(result)
  } catch (error) {
    const { statusCode, prismaError, customError } = generatePrismaError(error as Prisma.PrismaClientKnownRequestError)
    console.error('GET_CONTENTS_ERROR:', prismaError, customError)
    res.status(statusCode).send({ errorMessage: customError || 'Failed to retrieve contents.' })
  }
})

/**
 * @openapi
 * /content/{id}:
 *   get:
 *     tags:
 *       - Content
 *     summary: Get content by ID
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *       - in: query
 *         name: include
 *         required: false
 *         schema:
 *           type: string
 *     responses:
 *       '200':
 *         description: Successfully retrieved content
 */
contentRouter.get('/content/:id', async (req, res) => {
  const { id } = req.params
  const { include } = req.query

  try {
    const content = await prisma.content.findUnique({
      where: { id },
      include: generateIncludes(include as string),
    })

    if (!content) {
      return res.status(404).send({ errorMessage: 'Content not found.' })
    }

    res.json(content)
  } catch (error) {
    const { statusCode, prismaError, customError } = generatePrismaError(error as Prisma.PrismaClientKnownRequestError)
    console.error('GET_CONTENT_ERROR:', prismaError, customError)
    res.status(statusCode).send({ errorMessage: customError || 'Failed to retrieve content.' })
  }
})

/**
 * @openapi
 * /content:
 *   post:
 *     tags:
 *       - Content
 *     summary: Create a new content
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - entityId
 *             properties:
 *               entityId:
 *                 type: string
 *               type:
 *                 type: string
 *                 enum: [IMAGE, VIDEO]
 *     responses:
 *       '200':
 *         description: Successfully created content
 */
contentRouter.post('/content', async (req, res) => {
  const { accountId, type, name, displayName, description, price, quantity } = req.body

  try {
    if (!accountId) {
      throw new Error('accountId is required')
    }

    validateStringFields({
      name: { value: name, maxLength: STRING_LIMITS.name },
      displayName: { value: displayName, maxLength: STRING_LIMITS.displayName },
      description: { value: description, maxLength: STRING_LIMITS.entityDescription },
    })

    await validateAccount(req.user as AuthenticatedUser, accountId, 'authenticated')

    // Validate price if provided
    const listingPrice = price ? Number(price) : 1.00
    if (listingPrice < 1 || listingPrice > 10) {
      return res.status(400).send({ errorMessage: 'Price must be between $1 and $10.' })
    }

    // Validate quantity if provided (null = unlimited)
    const listingQuantity = quantity === null || quantity === undefined ? null : Number(quantity)
    if (listingQuantity !== null && (listingQuantity < 1 || listingQuantity > 1000)) {
      return res.status(400).send({ errorMessage: 'Quantity must be between 1 and 1000.' })
    }

    const result = await prisma.$transaction(async (tx) => {
      const entity = await tx.entity.create({
        data: {
          name: name || 'Untitled',
          displayName,
          description,
          type: 'CONTENT',
        },
      })

      const content = await tx.content.create({
        data: {
          entityId: entity.id,
          accountId,
          type: type || 'IMAGE',
        },
        include: { entity: true },
      })

      // Auto-create listing with the specified price
      await generateReferenceCodeWithRetry({
        typeIdentifier: 'S',
        createFn: async (referenceCode) => {
          return await tx.listing.create({
            data: {
              price: listingPrice,
              quantity: listingQuantity,
              status: 'ACTIVE',
              referenceCode,
              account: { connect: { id: accountId } },
              entity: { connect: { id: entity.id } },
            },
          })
        },
      })

      return content
    })

    res.json(result)
  } catch (error) {
    const { statusCode, prismaError, customError } = generatePrismaError(error as Prisma.PrismaClientKnownRequestError)
    console.error('CREATE_CONTENT_ERROR:', prismaError, customError)
    res.status(statusCode).send({ errorMessage: customError || 'Failed to create content.' })
  }
})

/**
 * @openapi
 * /content/{id}:
 *   put:
 *     tags:
 *       - Content
 *     summary: Update content
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *     responses:
 *       '200':
 *         description: Successfully updated content
 */
contentRouter.put('/content/:id', async (req, res) => {
  const { id } = req.params
  const { accountId, type, previewImage, displayName, description } = req.body

  try {
    validateStringFields({
      displayName: { value: displayName, maxLength: STRING_LIMITS.displayName },
      description: { value: description, maxLength: STRING_LIMITS.entityDescription },
    })

    const content = await prisma.content.findUnique({ where: { id } })
    if (!content) {
      return res.status(404).send({ errorMessage: 'Content not found.' })
    }
    await validateAccount(req.user as AuthenticatedUser, content.accountId ?? undefined, 'authenticated')

    const hasEntityUpdate = displayName !== undefined || description !== undefined
    const entityData: Record<string, unknown> = {}
    if (displayName !== undefined) entityData.displayName = displayName
    if (description !== undefined) entityData.description = description

    const [updatedContent] = await prisma.$transaction([
      prisma.content.update({
        where: { id },
        data: {
          ...(type !== undefined && { type }),
          ...(previewImage !== undefined && { previewImage }),
        },
        include: hasEntityUpdate ? { entity: true } : undefined,
      }),
      ...(hasEntityUpdate ? [
        prisma.entity.update({
          where: { id: content.entityId },
          data: entityData,
        }),
      ] : []),
    ])

    res.json(updatedContent)
  } catch (error) {
    const { statusCode, prismaError, customError } = generatePrismaError(error as Prisma.PrismaClientKnownRequestError)
    console.error('UPDATE_CONTENT_ERROR:', prismaError, customError)
    res.status(statusCode).send({ errorMessage: customError || 'Failed to update content.' })
  }
})

/**
 * @openapi
 * /content/{id}:
 *   delete:
 *     tags:
 *       - Content
 *     summary: Delete content
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *     responses:
 *       '200':
 *         description: Successfully deleted content
 */
contentRouter.delete('/content/:id', async (req, res) => {
  const { id } = req.params

  try {
    const content = await prisma.content.findUnique({
      where: { id },
      include: {
        gallery: { include: { images: true } },
        video: true,
        post: true,
      },
    })

    if (!content) {
      return res.status(404).send({ errorMessage: 'Content not found.' })
    }
    await validateAccount(req.user as AuthenticatedUser, content.accountId ?? undefined, 'authenticated')

    // Clean up S3 images before deleting
    const imagesToDelete: string[] = []
    if (content.previewImage) imagesToDelete.push(content.previewImage)
    if (content.gallery?.images) {
      for (const img of content.gallery.images) {
        if (img.image) imagesToDelete.push(img.image)
        if (img.blurredImage) imagesToDelete.push(img.blurredImage)
      }
    }
    if (content.video?.rawUrl) imagesToDelete.push(content.video.rawUrl)
    if (content.post?.image) imagesToDelete.push(content.post.image)

    await Promise.all(imagesToDelete.map(key => deleteImage(key)))

    // Delete the entity, which cascades to content and listings
    await prisma.entity.delete({
      where: { id: content.entityId },
    })

    res.json({ message: 'Content deleted successfully.' })
  } catch (error) {
    const { statusCode, prismaError, customError } = generatePrismaError(error as Prisma.PrismaClientKnownRequestError)
    console.error('DELETE_CONTENT_ERROR:', prismaError, customError)
    res.status(statusCode).send({ errorMessage: customError || 'Failed to delete content.' })
  }
})

/**
 * @openapi
 * /content/{id}/upload-image:
 *   post:
 *     tags:
 *       - Content
 *     summary: Upload image for content (creates both original and blurred versions)
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *     requestBody:
 *       required: true
 *       content:
 *         multipart/form-data:
 *           schema:
 *             type: object
 *             properties:
 *               file:
 *                 type: string
 *                 format: binary
 *     responses:
 *       '200':
 *         description: Successfully uploaded image
 */
contentRouter.post('/content/:id/upload-image', uploadConfig.single('file'), async (req, res) => {
  const { id } = req.params
  const file = req.file

  if (!file) {
    return res.status(400).send({ errorMessage: 'No file provided.' })
  }

  try {
    const content = await prisma.content.findUnique({ where: { id } })
    if (!content) {
      return res.status(404).send({ errorMessage: 'Content not found.' })
    }
    await validateAccount(req.user as AuthenticatedUser, content.accountId ?? undefined, 'authenticated')

    // Upload preview image to type-specific preview folder
    const previewFolderMap: Record<string, string> = {
      GALLERY: 'gallery/preview',
      VIDEO: 'video/preview',
      POST: 'post/preview',
    }
    const folder = previewFolderMap[content.type] || 'content'
    const imagePath = await uploadImage(file, folder)

    const updatedContent = await prisma.content.update({
      where: { id },
      data: {
        previewImage: imagePath,
      },
    })

    res.json(updatedContent)
  } catch (error) {
    const { statusCode, prismaError, customError } = generatePrismaError(error as Prisma.PrismaClientKnownRequestError)
    console.error('UPLOAD_CONTENT_IMAGE_ERROR:', prismaError, customError)
    res.status(statusCode).send({ errorMessage: customError || 'Failed to upload image.' })
  }
})

/**
 * @openapi
 * /content/{id}/delete-image:
 *   delete:
 *     tags:
 *       - Content
 *     summary: Delete image from content
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *     responses:
 *       '200':
 *         description: Successfully deleted image
 */
contentRouter.delete('/content/:id/delete-image', async (req, res) => {
  const { id } = req.params

  try {
    const content = await prisma.content.findUnique({
      where: { id },
    })

    if (!content) {
      return res.status(404).send({ errorMessage: 'Content not found.' })
    }
    await validateAccount(req.user as AuthenticatedUser, content.accountId ?? undefined, 'authenticated')

    //Delete preview image
    if (content.previewImage) {
      await deleteImage(content.previewImage)
    }

    const updatedContent = await prisma.content.update({
      where: { id },
      data: {
        previewImage: null,
      },
    })

    res.json(updatedContent)
  } catch (error) {
    const { statusCode, prismaError, customError } = generatePrismaError(error as Prisma.PrismaClientKnownRequestError)
    console.error('DELETE_CONTENT_IMAGE_ERROR:', prismaError, customError)
    res.status(statusCode).send({ errorMessage: customError || 'Failed to delete image.' })
  }
})
