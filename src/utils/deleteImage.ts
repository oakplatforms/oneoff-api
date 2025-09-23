import s3 from './s3Client'
import { DeleteObjectCommand } from '@aws-sdk/client-s3'

export async function deleteImage(imageKey: string): Promise<void> {
  if (!imageKey) {
    throw new Error('Image key is required')
  }

  // Remove leading slash if present, as S3 keys should not start with /
  const cleanKey = imageKey.startsWith('/') ? imageKey.slice(1) : imageKey

  const deleteCommand = new DeleteObjectCommand({
    Bucket: process.env.S3_BUCKET_NAME!,
    Key: cleanKey,
  })

  await s3.send(deleteCommand)
}
