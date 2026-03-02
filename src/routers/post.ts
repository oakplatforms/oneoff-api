import { Prisma } from '@prisma/client'
import express from 'express'
import { generateIncludes } from '../utils/generateIncludes'
import { prismaClient, generatePrismaError } from '../utils/prismaHelpers'
import { uploadImage, uploadConfig } from '../utils/uploadImage'
import { deleteImage } from '../utils/deleteImage'
import { validateAccount, AuthenticatedUser } from '../validation/user'

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
  const { contentId, body } = req.body

  if (!contentId) {
    return res.status(400).send({ errorMessage: 'contentId is required.' })
  }

  try {
    const content = await prisma.content.findUnique({ where: { id: contentId } })
    if (!content) {
      return res.status(404).send({ errorMessage: 'Content not found.' })
    }
    await validateAccount(req.user as AuthenticatedUser, content.accountId ?? undefined, 'authenticated')

    // Generate a 150-char excerpt of the body for entity description
    const bodyExcerpt = body
      ? body.replace(/<[^>]*>/g, '').slice(0, 150).trimEnd() + (body.replace(/<[^>]*>/g, '').length > 150 ? '...' : '')
      : null

    const [post] = await prisma.$transaction([
      prisma.post.create({
        data: {
          contentId,
          body: body || null,
        },
      }),
      prisma.content.update({
        where: { id: contentId },
        data: { type: 'POST' },
      }),
      prisma.entity.update({
        where: { id: content.entityId },
        data: {
          ...(bodyExcerpt && { description: bodyExcerpt }),
        },
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
  const { body } = req.body

  try {
    const existingPost = await prisma.post.findUnique({ where: { id } })
    if (!existingPost) {
      return res.status(404).send({ errorMessage: 'Post not found.' })
    }
    const content = await prisma.content.findUnique({ where: { id: existingPost.contentId } })
    if (!content) {
      return res.status(404).send({ errorMessage: 'Content not found.' })
    }
    await validateAccount(req.user as AuthenticatedUser, content.accountId ?? undefined, 'authenticated')

    const updateData: Record<string, unknown> = {}
    if (body !== undefined) updateData.body = body

    // Sync body excerpt to entity description
    if (body !== undefined) {
      const bodyExcerpt = body
        ? body.replace(/<[^>]*>/g, '').slice(0, 150).trimEnd() + (body.replace(/<[^>]*>/g, '').length > 150 ? '...' : '')
        : null
      await prisma.entity.update({
        where: { id: content.entityId },
        data: { description: bodyExcerpt },
      })
    }

    const post = await prisma.post.update({
      where: { id },
      data: updateData,
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
    const existingPost = await prisma.post.findUnique({ where: { id } })
    if (!existingPost) {
      return res.status(404).send({ errorMessage: 'Post not found.' })
    }
    const content = await prisma.content.findUnique({ where: { id: existingPost.contentId } })
    if (!content) {
      return res.status(404).send({ errorMessage: 'Content not found.' })
    }
    await validateAccount(req.user as AuthenticatedUser, content.accountId ?? undefined, 'authenticated')

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

    const content = await prisma.content.findUnique({ where: { id: post.contentId } })
    if (!content) {
      return res.status(404).send({ errorMessage: 'Content not found.' })
    }
    await validateAccount(req.user as AuthenticatedUser, content.accountId ?? undefined, 'authenticated')

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

    const content = await prisma.content.findUnique({ where: { id: post.contentId } })
    if (!content) {
      return res.status(404).send({ errorMessage: 'Content not found.' })
    }
    await validateAccount(req.user as AuthenticatedUser, content.accountId ?? undefined, 'authenticated')

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
