import { Prisma } from '@prisma/client'
import express from 'express'
import { generateIncludes } from '../utils/generateIncludes'
import { prismaClient, generatePrismaError } from '../utils/prismaHelpers'
import { uploadImage, uploadConfig } from '../utils/uploadImage'
import { deleteImage } from '../utils/deleteImage'
import { validateAccount, AuthenticatedUser } from '../validation/user'
import { validateStringFields, STRING_LIMITS } from '../validation/stringLimits'

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
  const { contentId, body, header, subheader } = req.body

  if (!contentId) {
    return res.status(400).send({ errorMessage: 'contentId is required.' })
  }

  try {
    validateStringFields({
      header: { value: header, maxLength: STRING_LIMITS.header },
      subheader: { value: subheader, maxLength: STRING_LIMITS.subheader },
      body: { value: body, maxLength: STRING_LIMITS.body },
    })

    const content = await prisma.content.findUnique({ where: { id: contentId } })
    if (!content) {
      return res.status(404).send({ errorMessage: 'Content not found.' })
    }
    await validateAccount(req.user as AuthenticatedUser, content.accountId ?? undefined, 'authenticated')

    const [post] = await prisma.$transaction([
      prisma.post.create({
        data: {
          contentId,
          body: body || null,
          header: header || null,
          subheader: subheader || null,
        },
      }),
      prisma.content.update({
        where: { id: contentId },
        data: { type: 'POST' },
      }),
      prisma.entity.update({
        where: { id: content.entityId },
        data: {
          ...(header && { displayName: header }),
          ...(subheader && { description: subheader }),
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
  const { body, header, subheader } = req.body

  try {
    validateStringFields({
      header: { value: header, maxLength: STRING_LIMITS.header },
      subheader: { value: subheader, maxLength: STRING_LIMITS.subheader },
      body: { value: body, maxLength: STRING_LIMITS.body },
    })

    const existingPost = await prisma.post.findUnique({ where: { id } })
    if (!existingPost) {
      return res.status(404).send({ errorMessage: 'Post not found.' })
    }
    const content = await prisma.content.findUnique({ where: { id: existingPost.contentId } })
    if (!content) {
      return res.status(404).send({ errorMessage: 'Content not found.' })
    }
    await validateAccount(req.user as AuthenticatedUser, content.accountId ?? undefined, 'authenticated')

    const postUpdateData: Record<string, unknown> = {}
    if (body !== undefined) postUpdateData.body = body
    if (header !== undefined) postUpdateData.header = header
    if (subheader !== undefined) postUpdateData.subheader = subheader

    // Sync header/subheader to entity displayName/description
    const entityUpdateData: Record<string, unknown> = {}
    if (header !== undefined) entityUpdateData.displayName = header
    if (subheader !== undefined) entityUpdateData.description = subheader

    if (Object.keys(entityUpdateData).length > 0) {
      await prisma.entity.update({
        where: { id: content.entityId },
        data: entityUpdateData,
      })
    }

    const post = await prisma.post.update({
      where: { id },
      data: postUpdateData,
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
