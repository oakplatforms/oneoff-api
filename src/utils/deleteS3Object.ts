import s3 from './s3Client'
import { DeleteObjectCommand } from '@aws-sdk/client-s3'

export async function deleteS3Object(key: string): Promise<void> {
  if (!key) {
    throw new Error('S3 key is required')
  }

  const cleanKey = key.startsWith('/') ? key.slice(1) : key

  await s3.send(new DeleteObjectCommand({
    Bucket: process.env.S3_BUCKET_NAME!,
    Key: cleanKey,
  }))
}
