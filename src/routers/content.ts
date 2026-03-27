import { Prisma } from '@prisma/client'
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
  const { include, usePagination, page, limit, accountId } = req.query

  const where: Prisma.ContentWhereInput = {}
  if (accountId) {
    where.accountId = accountId as string
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
  const { accountId, name, displayName, description, price, quantity } = req.body

  try {
    if (!accountId) {
      throw new Error('accountId is required')
    }

    validateStringFields({
      name: { value: name, maxLength: STRING_LIMITS.name },
      displayName: { value: displayName, maxLength: STRING_LIMITS.displayName },
      description: { value: description, maxLength: STRING_LIMITS.entityDescription },
    })

    await validateAccount(req.user as AuthenticatedUser, accountId, 'seller')

    // Price is always $1
    const listingPrice = 1

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
          accountId,
        },
      })

      const content = await tx.content.create({
        data: {
          entityId: entity.id,
          accountId,
        },
        include: { entity: true },
      })

      // Auto-create gallery
      await tx.gallery.create({
        data: { contentId: content.id },
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
  const { displayName, description, price } = req.body

  try {
    validateStringFields({
      displayName: { value: displayName, maxLength: STRING_LIMITS.displayName },
      description: { value: description, maxLength: STRING_LIMITS.entityDescription },
    })

    // Price is always $1 — ignore any price sent from the client

    const content = await prisma.content.findUnique({ where: { id } })
    if (!content) {
      return res.status(404).send({ errorMessage: 'Content not found.' })
    }
    await validateAccount(req.user as AuthenticatedUser, content.accountId ?? undefined, 'authenticated')

    const entityData: Record<string, unknown> = {}
    if (displayName !== undefined) entityData.displayName = displayName
    if (description !== undefined) entityData.description = description

    if (Object.keys(entityData).length > 0) {
      await prisma.entity.update({
        where: { id: content.entityId },
        data: entityData,
      })
    }


    const updatedContent = await prisma.content.findUnique({
      where: { id },
      include: { entity: true },
    })

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
        entity: true,
        gallery: { include: { images: true } },
        video: true,
      },
    })

    if (!content) {
      return res.status(404).send({ errorMessage: 'Content not found.' })
    }
    await validateAccount(req.user as AuthenticatedUser, content.accountId ?? undefined, 'authenticated')

    // Clean up S3 images before deleting
    const imagesToDelete: string[] = []
    if (content.entity?.image) imagesToDelete.push(content.entity.image)
    if (content.gallery?.images) {
      for (const img of content.gallery.images) {
        if (img.image) imagesToDelete.push(img.image)
        if (img.blurredImage) imagesToDelete.push(img.blurredImage)
      }
    }
    if (content.video?.rawUrl) imagesToDelete.push(content.video.rawUrl)

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

    const imagePath = await uploadImage(file, 'content/preview')

    await prisma.entity.update({
      where: { id: content.entityId },
      data: {
        image: imagePath,
      },
    })

    const updatedContent = await prisma.content.findUnique({
      where: { id },
      include: { entity: true },
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
      include: { entity: true },
    })

    if (!content) {
      return res.status(404).send({ errorMessage: 'Content not found.' })
    }
    await validateAccount(req.user as AuthenticatedUser, content.accountId ?? undefined, 'authenticated')

    // Delete entity image from S3
    if (content.entity?.image) {
      await deleteImage(content.entity.image)
    }

    await prisma.entity.update({
      where: { id: content.entityId },
      data: {
        image: null,
      },
    })

    const updatedContent = await prisma.content.findUnique({
      where: { id },
      include: { entity: true },
    })

    res.json(updatedContent)
  } catch (error) {
    const { statusCode, prismaError, customError } = generatePrismaError(error as Prisma.PrismaClientKnownRequestError)
    console.error('DELETE_CONTENT_IMAGE_ERROR:', prismaError, customError)
    res.status(statusCode).send({ errorMessage: customError || 'Failed to delete image.' })
  }
})

const MAX_GALLERY_IMAGES = 10

contentRouter.post('/content/:id/gallery-image', uploadConfig.single('file'), async (req, res) => {
  const { id } = req.params
  const { caption } = req.body
  const file = req.file

  if (!file) {
    return res.status(400).send({ errorMessage: 'No file provided.' })
  }

  try {
    validateStringFields({
      caption: { value: caption, maxLength: STRING_LIMITS.caption },
    })

    const content = await prisma.content.findUnique({
      where: { id },
      include: {
        gallery: { include: { images: true } },
      },
    })

    if (!content) {
      return res.status(404).send({ errorMessage: 'Content not found.' })
    }
    await validateAccount(req.user as AuthenticatedUser, content.accountId ?? undefined, 'seller')

    const gallery = content.gallery
    if (!gallery) {
      return res.status(404).send({ errorMessage: 'Gallery not found.' })
    }

    if (gallery.images.length >= MAX_GALLERY_IMAGES) {
      return res.status(400).send({ errorMessage: `Gallery cannot have more than ${MAX_GALLERY_IMAGES} images.` })
    }

    // Upload original image
    const imagePath = await uploadImage(file, 'gallery')

    // Upload blurred version
    const blurredImagePath = await uploadImage(file, 'gallery/blurred', {
      width: 750,
      quality: 90,
      format: 'webp',
      fit: 'inside',
      blur: 25,
    })

    const nextPosition = gallery.images.length > 0
      ? Math.max(...gallery.images.map(img => img.position)) + 1
      : 0

    const galleryImage = await prisma.galleryImage.create({
      data: {
        galleryId: gallery.id,
        image: imagePath,
        blurredImage: blurredImagePath,
        caption: caption || null,
        position: nextPosition,
      },
    })

    res.json(galleryImage)
  } catch (error) {
    const { statusCode, prismaError, customError } = generatePrismaError(error as Prisma.PrismaClientKnownRequestError)
    console.error('UPLOAD_GALLERY_IMAGE_ERROR:', prismaError, customError)
    res.status(statusCode).send({ errorMessage: customError || 'Failed to upload gallery image.' })
  }
})

contentRouter.delete('/content/:id/gallery-image/:imageId', async (req, res) => {
  const { id, imageId } = req.params

  try {
    const content = await prisma.content.findUnique({ where: { id } })
    if (!content) {
      return res.status(404).send({ errorMessage: 'Content not found.' })
    }
    await validateAccount(req.user as AuthenticatedUser, content.accountId ?? undefined, 'authenticated')

    const galleryImage = await prisma.galleryImage.findUnique({
      where: { id: imageId },
    })

    if (!galleryImage) {
      return res.status(404).send({ errorMessage: 'Gallery image not found.' })
    }

    // Clean up S3 images
    if (galleryImage.image) {
      await deleteImage(galleryImage.image)
    }
    if (galleryImage.blurredImage) {
      await deleteImage(galleryImage.blurredImage)
    }

    await prisma.galleryImage.delete({
      where: { id: imageId },
    })

    res.json({ message: 'Gallery image deleted successfully.' })
  } catch (error) {
    const { statusCode, prismaError, customError } = generatePrismaError(error as Prisma.PrismaClientKnownRequestError)
    console.error('DELETE_GALLERY_IMAGE_ERROR:', prismaError, customError)
    res.status(statusCode).send({ errorMessage: customError || 'Failed to delete gallery image.' })
  }
})

contentRouter.put('/content/:id/gallery-images/reorder', async (req, res) => {
  const { id } = req.params
  const { imageIds } = req.body

  if (!Array.isArray(imageIds) || imageIds.length === 0) {
    return res.status(400).send({ errorMessage: 'imageIds array is required.' })
  }

  try {
    const content = await prisma.content.findUnique({
      where: { id },
      include: { gallery: true },
    })
    if (!content) {
      return res.status(404).send({ errorMessage: 'Content not found.' })
    }
    await validateAccount(req.user as AuthenticatedUser, content.accountId ?? undefined, 'authenticated')

    const gallery = content.gallery
    if (!gallery) {
      return res.status(404).send({ errorMessage: 'Gallery not found.' })
    }

    await prisma.$transaction(
      imageIds.map((imageId: string, index: number) =>
        prisma.galleryImage.update({
          where: { id: imageId },
          data: { position: index },
        })
      )
    )

    const updatedGallery = await prisma.gallery.findUnique({
      where: { id: gallery.id },
      include: {
        images: {
          orderBy: { position: 'asc' },
        },
      },
    })

    res.json(updatedGallery)
  } catch (error) {
    const { statusCode, prismaError, customError } = generatePrismaError(error as Prisma.PrismaClientKnownRequestError)
    console.error('REORDER_GALLERY_IMAGES_ERROR:', prismaError, customError)
    res.status(statusCode).send({ errorMessage: customError || 'Failed to reorder gallery images.' })
  }
})
