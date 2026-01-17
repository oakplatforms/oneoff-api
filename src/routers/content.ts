import { Prisma } from '@prisma/client'
import express from 'express'
import { generateIncludes } from '../utils/generateIncludes'
import { getPrismaClient, generatePrismaError } from '../utils/prismaHelpers'
import { paginatePrisma } from '../utils/paginatePrisma'
import { uploadImage, uploadConfig } from '../utils/uploadImage'
import { deleteImage } from '../utils/deleteImage'
import { AuthenticatedUser, validateRole } from '../validation/user'

const prisma = getPrismaClient()
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
  const { include, usePagination, page, limit } = req.query

  try {
    const result = await paginatePrisma({
      prismaModel: prisma.content,
      where: {},
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
  const { entityId, type } = req.body

  try {
    const content = await prisma.content.create({
      data: {
        entityId,
        type: type || 'IMAGE',
      },
    })

    res.json(content)
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
  const updateData = req.body

  try {
    const content = await prisma.content.update({
      where: { id },
      data: updateData,
    })

    res.json(content)
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
    await prisma.content.delete({
      where: { id },
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
    // Upload original image
    const imagePath = await uploadImage(file, 'content')
    
    // Upload blurred version
    const blurredImagePath = await uploadImage(file, 'content/blurred', { 
      width: 750, 
      quality: 75,
      format: 'webp',
      fit: 'inside',
      blur: 25  // This will be handled in uploadImage utility
    })

    const content = await prisma.content.update({
      where: { id },
      data: {
        image: imagePath,
        blurredImage: blurredImagePath,
      },
    })

    res.json(content)
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

    // Delete original image
    if (content.image) {
      await deleteImage(content.image)
    }

    // Delete blurred image
    if (content.blurredImage) {
      await deleteImage(content.blurredImage)
    }

    const updatedContent = await prisma.content.update({
      where: { id },
      data: {
        image: null,
        blurredImage: null,
      },
    })

    res.json(updatedContent)
  } catch (error) {
    const { statusCode, prismaError, customError } = generatePrismaError(error as Prisma.PrismaClientKnownRequestError)
    console.error('DELETE_CONTENT_IMAGE_ERROR:', prismaError, customError)
    res.status(statusCode).send({ errorMessage: customError || 'Failed to delete image.' })
  }
})
