import { S3Event } from 'aws-lambda'
import { initPrismaClient, getPrismaClient } from '../src/utils/prismaHelpers'
import { createMediaConvertJob } from '../src/utils/mediaConvert'

let isInitialized = false

const MAX_DURATION = 30

export const handler = async (event: S3Event): Promise<void> => {
  if (!isInitialized) {
    await initPrismaClient()
    isInitialized = true
  }

  const prisma = await getPrismaClient()

  for (const record of event.Records) {
    const bucket = record.s3.bucket.name
    const key = decodeURIComponent(record.s3.object.key.replace(/\+/g, ' '))

    // Skip processed videos and preview images
    if (key.startsWith('video/processed/') || key.startsWith('video/preview/')) {
      console.log('VIDEO_PROCESSOR: Skipping non-raw file:', key)
      return
    }

    const s3Key = `/${key}`

    console.log('VIDEO_PROCESSOR: Processing', { bucket, key })

    try {
      const video = await prisma.video.findFirst({
        where: { rawUrl: s3Key },
      })

      if (!video) {
        console.error('VIDEO_PROCESSOR_ERROR: No video record found for key:', s3Key)
        return
      }

      // Create MediaConvert job (clips to MAX_DURATION as a safety net)
      const jobId = await createMediaConvertJob({
        inputKey: key,
        outputPrefix: `video/processed/${video.id}`,
        bucket,
        maxDuration: MAX_DURATION,
      })

      await prisma.video.update({
        where: { id: video.id },
        data: {
          processingStatus: 'PROCESSING',
          mediaConvertJobId: jobId,
        },
      })

      console.log('VIDEO_PROCESSOR: MediaConvert job created', { videoId: video.id, jobId })
    } catch (error) {
      console.error('VIDEO_PROCESSOR_ERROR:', error)

      // Attempt to mark the video as failed
      try {
        const video = await prisma.video.findFirst({ where: { rawUrl: `/${key}` } })
        if (video) {
          await prisma.video.update({
            where: { id: video.id },
            data: {
              processingStatus: 'FAILED',
              processingError: error instanceof Error ? error.message : 'Unknown processing error',
            },
          })
        }
      } catch (dbError) {
        console.error('VIDEO_PROCESSOR_DB_ERROR:', dbError)
      }
    }
  }
}
