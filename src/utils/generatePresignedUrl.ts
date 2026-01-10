import { GetObjectCommand } from '@aws-sdk/client-s3'
import { getSignedUrl } from '@aws-sdk/s3-request-presigner'
import s3 from './s3Client'

export interface GeneratePresignedUrlOptions {
  key: string
  expiresIn?: number // in seconds, default 900 (15 minutes)
}

export async function generatePresignedUrl({
  key,
  expiresIn = 900,
}: GeneratePresignedUrlOptions): Promise<string> {
  const command = new GetObjectCommand({
    Bucket: process.env.S3_BUCKET_NAME!,
    Key: key,
  })

  const url = await getSignedUrl(s3, command, { expiresIn })
  return url
}

