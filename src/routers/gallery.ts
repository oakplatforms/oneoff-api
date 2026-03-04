import { Prisma } from '@prisma/client'
import express from 'express'
import { generateIncludes } from '../utils/generateIncludes'
import { prismaClient, generatePrismaError } from '../utils/prismaHelpers'
import { uploadImage, uploadConfig } from '../utils/uploadImage'
import { deleteImage } from '../utils/deleteImage'
import { validateAccount, AuthenticatedUser } from '../validation/user'
import { validateStringFields, STRING_LIMITS } from '../validation/stringLimits'

const prisma = prismaClient()
export const galleryRouter = express.Router()

const MAX_GALLERY_IMAGES = 10

galleryRouter.get('/gallery/:contentId', async (req, res) => {
  const { contentId } = req.params
  const { include } = req.query

  try {
    const gallery = await prisma.gallery.findUnique({
      where: { contentId },
      include: {
        images: {
          orderBy: { position: 'asc' },
        },
        ...generateIncludes(include as string),
      },
    })

    if (!gallery) {
      return res.status(404).send({ errorMessage: 'Gallery not found.' })
    }

    res.json(gallery)
  } catch (error) {
    const { statusCode, prismaError, customError } = generatePrismaError(error as Prisma.PrismaClientKnownRequestError)
    console.error('GET_GALLERY_ERROR:', prismaError, customError)
    res.status(statusCode).send({ errorMessage: customError || 'Failed to retrieve gallery.' })
  }
})

galleryRouter.post('/gallery', async (req, res) => {
  const { contentId } = req.body

  if (!contentId) {
    return res.status(400).send({ errorMessage: 'contentId is required.' })
  }

  try {
    const content = await prisma.content.findUnique({ where: { id: contentId } })
    if (!content) {
      return res.status(404).send({ errorMessage: 'Content not found.' })
    }
    await validateAccount(req.user as AuthenticatedUser, content.accountId ?? undefined, 'authenticated')

    const [gallery] = await prisma.$transaction([
      prisma.gallery.create({
        data: { contentId },
        include: { images: true },
      }),
      prisma.content.update({
        where: { id: contentId },
        data: { type: 'GALLERY' },
      }),
    ])

    res.json(gallery)
  } catch (error) {
    const { statusCode, prismaError, customError } = generatePrismaError(error as Prisma.PrismaClientKnownRequestError)
    console.error('CREATE_GALLERY_ERROR:', prismaError, customError)
    res.status(statusCode).send({ errorMessage: customError || 'Failed to create gallery.' })
  }
})

galleryRouter.post('/gallery/:id/image', uploadConfig.single('file'), async (req, res) => {
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

    const gallery = await prisma.gallery.findUnique({
      where: { id },
      include: { images: true },
    })

    if (!gallery) {
      return res.status(404).send({ errorMessage: 'Gallery not found.' })
    }

    const content = await prisma.content.findUnique({ where: { id: gallery.contentId } })
    if (!content) {
      return res.status(404).send({ errorMessage: 'Content not found.' })
    }
    await validateAccount(req.user as AuthenticatedUser, content.accountId ?? undefined, 'authenticated')

    if (gallery.images.length >= MAX_GALLERY_IMAGES) {
      return res.status(400).send({ errorMessage: `Gallery cannot have more than ${MAX_GALLERY_IMAGES} images.` })
    }

    //Upload original image
    const imagePath = await uploadImage(file, 'gallery')

    //Upload blurred version
    const blurredImagePath = await uploadImage(file, 'gallery/blurred', {
      width: 750,
      quality: 75,
      format: 'webp',
      fit: 'inside',
      blur: 25,
    })

    const nextPosition = gallery.images.length > 0
      ? Math.max(...gallery.images.map(img => img.position)) + 1
      : 0

    const galleryImage = await prisma.galleryImage.create({
      data: {
        galleryId: id,
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

galleryRouter.put('/gallery/:id/images/reorder', async (req, res) => {
  const { id } = req.params
  const { imageIds } = req.body

  if (!Array.isArray(imageIds) || imageIds.length === 0) {
    return res.status(400).send({ errorMessage: 'imageIds array is required.' })
  }

  try {
    const gallery = await prisma.gallery.findUnique({ where: { id } })
    if (!gallery) {
      return res.status(404).send({ errorMessage: 'Gallery not found.' })
    }
    const content = await prisma.content.findUnique({ where: { id: gallery.contentId } })
    if (!content) {
      return res.status(404).send({ errorMessage: 'Content not found.' })
    }
    await validateAccount(req.user as AuthenticatedUser, content.accountId ?? undefined, 'authenticated')

    await prisma.$transaction(
      imageIds.map((imageId: string, index: number) =>
        prisma.galleryImage.update({
          where: { id: imageId },
          data: { position: index },
        })
      )
    )

    const updatedGallery = await prisma.gallery.findUnique({
      where: { id },
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

galleryRouter.delete('/gallery/image/:imageId', async (req, res) => {
  const { imageId } = req.params

  try {
    const galleryImage = await prisma.galleryImage.findUnique({
      where: { id: imageId },
    })

    if (!galleryImage) {
      return res.status(404).send({ errorMessage: 'Gallery image not found.' })
    }

    const gallery = await prisma.gallery.findUnique({ where: { id: galleryImage.galleryId } })
    if (!gallery) {
      return res.status(404).send({ errorMessage: 'Gallery not found.' })
    }
    const content = await prisma.content.findUnique({ where: { id: gallery.contentId } })
    if (!content) {
      return res.status(404).send({ errorMessage: 'Content not found.' })
    }
    await validateAccount(req.user as AuthenticatedUser, content.accountId ?? undefined, 'authenticated')

    //Clean up S3 images
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
