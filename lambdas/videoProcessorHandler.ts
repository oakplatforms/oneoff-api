import { S3Event } from 'aws-lambda'
import { GetObjectCommand } from '@aws-sdk/client-s3'
import { writeFileSync, unlinkSync } from 'fs'
import { join } from 'path'
import s3 from '../src/utils/s3Client'
import { initPrismaClient, getPrismaClient } from '../src/utils/prismaHelpers'
import { getVideoDuration } from '../src/utils/mediaInfo'
import { createMediaConvertJob } from '../src/utils/mediaConvert'
import { deleteS3Object } from '../src/utils/deleteS3Object'

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

    // Skip processed videos to prevent infinite loop
    if (key.startsWith('video/processed/')) {
      console.log('VIDEO_PROCESSOR: Skipping processed video:', key)
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

      // Download video to /tmp for analysis
      const fileName = key.split('/').pop()!
      const tmpPath = join('/tmp', fileName)
      const response = await s3.send(new GetObjectCommand({ Bucket: bucket, Key: key }))
      const bodyBytes = await response.Body!.transformToByteArray()
      writeFileSync(tmpPath, bodyBytes)

      // Validate duration
      let duration: number
      try {
        duration = await getVideoDuration(tmpPath)
      } finally {
        // Always clean up /tmp
        try { unlinkSync(tmpPath) } catch { /* ignore */ }
      }

      if (duration > MAX_DURATION) {
        console.error('VIDEO_PROCESSOR_ERROR: Duration exceeds limit', { duration, max: MAX_DURATION })
        await prisma.video.update({
          where: { id: video.id },
          data: {
            processingStatus: 'FAILED',
            processingError: `Video duration ${duration.toFixed(1)}s exceeds ${MAX_DURATION}s limit`,
            duration,
          },
        })
        await deleteS3Object(key)
        return
      }

      // Create MediaConvert job
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
          duration,
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
