import s3 from './s3Client'
import { DeleteObjectCommand } from '@aws-sdk/client-s3'

export async function deleteImage(imageKey: string): Promise<void> {
  if (!imageKey) {
    throw new Error('Image key is required')
  }

  const deleteCommand = new DeleteObjectCommand({
    Bucket: process.env.S3_BUCKET_NAME!,
    Key: imageKey,
  })

  await s3.send(deleteCommand)
}
