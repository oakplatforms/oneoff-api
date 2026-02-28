import { EventBridgeEvent } from 'aws-lambda'
import { initPrismaClient, getPrismaClient } from '../src/utils/prismaHelpers'
import { deleteS3Object } from '../src/utils/deleteS3Object'

interface MediaConvertDetail {
  jobId: string
  status: 'COMPLETE' | 'ERROR'
  outputGroupDetails?: Array<{
    outputDetails: Array<{
      outputFilePaths: string[]
    }>
  }>
  errorCode?: number
  errorMessage?: string
}

let isInitialized = false

export const handler = async (
  event: EventBridgeEvent<'MediaConvert Job State Change', MediaConvertDetail>
): Promise<void> => {
  if (!isInitialized) {
    await initPrismaClient()
    isInitialized = true
  }

  const prisma = await getPrismaClient()
  const { jobId, status } = event.detail

  console.log('VIDEO_COMPLETE: Received event', { jobId, status })

  try {
    const video = await prisma.video.findFirst({
      where: { mediaConvertJobId: jobId },
    })

    if (!video) {
      console.error('VIDEO_COMPLETE_ERROR: No video found for job:', jobId)
      return
    }

    if (status === 'COMPLETE') {
      const outputPath = event.detail.outputGroupDetails?.[0]
        ?.outputDetails?.[0]?.outputFilePaths?.[0]

      if (!outputPath) {
        console.error('VIDEO_COMPLETE_ERROR: No output path in event')
        await prisma.video.update({
          where: { id: video.id },
          data: {
            processingStatus: 'FAILED',
            processingError: 'No output file path in MediaConvert response',
          },
        })
        return
      }

      // Extract S3 key from the full S3 URI (s3://bucket/key)
      const outputKey = outputPath.replace(/^s3:\/\/[^/]+\//, '')
      const dbKey = `/${outputKey}`

      await prisma.video.update({
        where: { id: video.id },
        data: {
          url: dbKey,
          processingStatus: 'COMPLETED',
          processingError: null,
        },
      })

      // Delete the raw upload
      if (video.rawUrl) {
        const rawKey = video.rawUrl.startsWith('/') ? video.rawUrl.slice(1) : video.rawUrl
        await deleteS3Object(rawKey)
      }

      console.log('VIDEO_COMPLETE: Video processed successfully', { videoId: video.id, outputKey: dbKey })
    } else {
      // ERROR status
      await prisma.video.update({
        where: { id: video.id },
        data: {
          processingStatus: 'FAILED',
          processingError: event.detail.errorMessage || `MediaConvert error code: ${event.detail.errorCode}`,
        },
      })

      console.error('VIDEO_COMPLETE_ERROR: MediaConvert job failed', {
        videoId: video.id,
        errorCode: event.detail.errorCode,
        errorMessage: event.detail.errorMessage,
      })
    }
  } catch (error) {
    console.error('VIDEO_COMPLETE_ERROR:', error)
  }
}
