import { Prisma } from '@prisma/client'
import express from 'express'
import crypto from 'crypto'
import { getSignedUrl } from '@aws-sdk/s3-request-presigner'
import { PutObjectCommand } from '@aws-sdk/client-s3'
import s3 from '../utils/s3Client'
import { generateIncludes } from '../utils/generateIncludes'
import { prismaClient, generatePrismaError } from '../utils/prismaHelpers'
import { deleteImage } from '../utils/deleteImage'

const prisma = prismaClient()
export const videoRouter = express.Router()

const MAX_VIDEO_SIZE = 200 * 1024 * 1024 // 200MB
const MAX_VIDEO_DURATION = 30 // seconds

videoRouter.get('/video/:contentId', async (req, res) => {
  const { contentId } = req.params
  const { include } = req.query

  try {
    const video = await prisma.video.findUnique({
      where: { contentId },
      include: generateIncludes(include as string),
    })

    if (!video) {
      return res.status(404).send({ errorMessage: 'Video not found.' })
    }

    res.json(video)
  } catch (error) {
    const { statusCode, prismaError, customError } = generatePrismaError(error as Prisma.PrismaClientKnownRequestError)
    console.error('GET_VIDEO_ERROR:', prismaError, customError)
    res.status(statusCode).send({ errorMessage: customError || 'Failed to retrieve video.' })
  }
})

videoRouter.post('/video', async (req, res) => {
  const { contentId } = req.body

  if (!contentId) {
    return res.status(400).send({ errorMessage: 'contentId is required.' })
  }

  try {
    const video = await prisma.video.create({
      data: { contentId },
    })

    res.json(video)
  } catch (error) {
    const { statusCode, prismaError, customError } = generatePrismaError(error as Prisma.PrismaClientKnownRequestError)
    console.error('CREATE_VIDEO_ERROR:', prismaError, customError)
    res.status(statusCode).send({ errorMessage: customError || 'Failed to create video.' })
  }
})

videoRouter.post('/video/:id/upload-url', async (req, res) => {
  const { id } = req.params
  const { contentType } = req.body

  const allowedTypes = ['video/mp4', 'video/quicktime', 'video/webm']
  const mimeType = contentType || 'video/mp4'

  if (!allowedTypes.includes(mimeType)) {
    return res.status(400).send({ errorMessage: 'Unsupported video format. Allowed: mp4, mov, webm.' })
  }

  try {
    const video = await prisma.video.findUnique({ where: { id } })

    if (!video) {
      return res.status(404).send({ errorMessage: 'Video not found.' })
    }

    const ext = mimeType === 'video/quicktime' ? 'mov' : mimeType.split('/')[1]
    const key = `video/${crypto.randomUUID()}.${ext}`

    const command = new PutObjectCommand({
      Bucket: process.env.S3_BUCKET_NAME!,
      Key: key,
      ContentType: mimeType,
    })

    const presignedUrl = await getSignedUrl(s3, command, {
      expiresIn: 300,
    })

    res.json({
      presignedUrl,
      key: `/${key}`,
      expiresIn: 300,
      maxSize: MAX_VIDEO_SIZE,
      maxDuration: MAX_VIDEO_DURATION,
    })
  } catch (error) {
    const { statusCode, prismaError, customError } = generatePrismaError(error as Prisma.PrismaClientKnownRequestError)
    console.error('GENERATE_VIDEO_UPLOAD_URL_ERROR:', prismaError, customError)
    res.status(statusCode).send({ errorMessage: customError || 'Failed to generate upload URL.' })
  }
})

videoRouter.put('/video/:id', async (req, res) => {
  const { id } = req.params
  const { url } = req.body

  try {
    const video = await prisma.video.update({
      where: { id },
      data: { url },
    })

    res.json(video)
  } catch (error) {
    const { statusCode, prismaError, customError } = generatePrismaError(error as Prisma.PrismaClientKnownRequestError)
    console.error('UPDATE_VIDEO_ERROR:', prismaError, customError)
    res.status(statusCode).send({ errorMessage: customError || 'Failed to update video.' })
  }
})

videoRouter.delete('/video/:id', async (req, res) => {
  const { id } = req.params

  try {
    const video = await prisma.video.findUnique({ where: { id } })

    if (!video) {
      return res.status(404).send({ errorMessage: 'Video not found.' })
    }

    if (video.url) {
      await deleteImage(video.url)
    }

    await prisma.video.delete({ where: { id } })

    res.json({ message: 'Video deleted successfully.' })
  } catch (error) {
    const { statusCode, prismaError, customError } = generatePrismaError(error as Prisma.PrismaClientKnownRequestError)
    console.error('DELETE_VIDEO_ERROR:', prismaError, customError)
    res.status(statusCode).send({ errorMessage: customError || 'Failed to delete video.' })
  }
})
