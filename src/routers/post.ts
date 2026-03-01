import { Prisma } from '@prisma/client'
import express from 'express'
import { generateIncludes } from '../utils/generateIncludes'
import { prismaClient, generatePrismaError } from '../utils/prismaHelpers'
import { uploadImage, uploadConfig } from '../utils/uploadImage'
import { deleteImage } from '../utils/deleteImage'

const prisma = prismaClient()
export const postRouter = express.Router()

postRouter.get('/post/:contentId', async (req, res) => {
  const { contentId } = req.params
  const { include } = req.query

  try {
    const post = await prisma.post.findUnique({
      where: { contentId },
      include: generateIncludes(include as string),
    })

    if (!post) {
      return res.status(404).send({ errorMessage: 'Post not found.' })
    }

    res.json(post)
  } catch (error) {
    const { statusCode, prismaError, customError } = generatePrismaError(error as Prisma.PrismaClientKnownRequestError)
    console.error('GET_POST_ERROR:', prismaError, customError)
    res.status(statusCode).send({ errorMessage: customError || 'Failed to retrieve post.' })
  }
})

postRouter.post('/post', async (req, res) => {
  const { contentId, body, title } = req.body

  if (!contentId) {
    return res.status(400).send({ errorMessage: 'contentId is required.' })
  }

  try {
    const [post] = await prisma.$transaction([
      prisma.post.create({
        data: {
          contentId,
          title: title || null,
          body: body || null,
        },
      }),
      prisma.content.update({
        where: { id: contentId },
        data: { type: 'POST' },
      }),
    ])

    res.json(post)
  } catch (error) {
    const { statusCode, prismaError, customError } = generatePrismaError(error as Prisma.PrismaClientKnownRequestError)
    console.error('CREATE_POST_ERROR:', prismaError, customError)
    res.status(statusCode).send({ errorMessage: customError || 'Failed to create post.' })
  }
})

postRouter.put('/post/:id', async (req, res) => {
  const { id } = req.params
  const { body, title } = req.body

  try {
    const post = await prisma.post.update({
      where: { id },
      data: { body, title },
    })

    res.json(post)
  } catch (error) {
    const { statusCode, prismaError, customError } = generatePrismaError(error as Prisma.PrismaClientKnownRequestError)
    console.error('UPDATE_POST_ERROR:', prismaError, customError)
    res.status(statusCode).send({ errorMessage: customError || 'Failed to update post.' })
  }
})

postRouter.post('/post/:id/upload-image', uploadConfig.single('file'), async (req, res) => {
  const { id } = req.params
  const file = req.file

  if (!file) {
    return res.status(400).send({ errorMessage: 'No file provided.' })
  }

  try {
    const imagePath = await uploadImage(file, 'post')

    const post = await prisma.post.update({
      where: { id },
      data: { image: imagePath },
    })

    res.json(post)
  } catch (error) {
    const { statusCode, prismaError, customError } = generatePrismaError(error as Prisma.PrismaClientKnownRequestError)
    console.error('UPLOAD_POST_IMAGE_ERROR:', prismaError, customError)
    res.status(statusCode).send({ errorMessage: customError || 'Failed to upload post image.' })
  }
})

postRouter.delete('/post/:id/delete-image', async (req, res) => {
  const { id } = req.params

  try {
    const post = await prisma.post.findUnique({ where: { id } })

    if (!post) {
      return res.status(404).send({ errorMessage: 'Post not found.' })
    }

    if (post.image) {
      await deleteImage(post.image)
    }

    const updatedPost = await prisma.post.update({
      where: { id },
      data: { image: null },
    })

    res.json(updatedPost)
  } catch (error) {
    const { statusCode, prismaError, customError } = generatePrismaError(error as Prisma.PrismaClientKnownRequestError)
    console.error('DELETE_POST_IMAGE_ERROR:', prismaError, customError)
    res.status(statusCode).send({ errorMessage: customError || 'Failed to delete post image.' })
  }
})

postRouter.delete('/post/:id', async (req, res) => {
  const { id } = req.params

  try {
    const post = await prisma.post.findUnique({ where: { id } })

    if (!post) {
      return res.status(404).send({ errorMessage: 'Post not found.' })
    }

    if (post.image) {
      await deleteImage(post.image)
    }

    await prisma.post.delete({ where: { id } })

    res.json({ message: 'Post deleted successfully.' })
  } catch (error) {
    const { statusCode, prismaError, customError } = generatePrismaError(error as Prisma.PrismaClientKnownRequestError)
    console.error('DELETE_POST_ERROR:', prismaError, customError)
    res.status(statusCode).send({ errorMessage: customError || 'Failed to delete post.' })
  }
})
