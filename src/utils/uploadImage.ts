import s3 from './s3Client'
import { PutObjectCommand } from '@aws-sdk/client-s3'
import multer from 'multer'
import sharp from 'sharp'

export const uploadConfig = multer({
  limits: { fileSize: 5 * 1024 * 1024 },
})

export type ResizeImageOptions = {
  width?: number
  height?: number
  quality?: number
  format?: 'jpeg' | 'png' | 'webp' | 'jpg'
  fit?: 'cover' | 'contain' | 'fill' | 'inside' | 'outside'
}

const defaultResizeOptions: ResizeImageOptions = {
  width: 750,
  quality: 75,
  format: 'webp',
  fit: 'inside',
}

const allowedMimeTypes = [
  'image/jpeg',
  'image/jpg',
  'image/png',
  'image/webp',
  'image/svg+xml',
]

export async function uploadImage(
  file: Express.Multer.File,
  model: string,
  resizeOptions: ResizeImageOptions = defaultResizeOptions
): Promise<string> {
  const mime = file.mimetype

  if (!allowedMimeTypes.includes(mime)) {
    throw new Error('Unsupported image format')
  }

  const originalName = file.originalname.replace(/\.[^/.]+$/, '')
  const ext = mime === 'image/svg+xml' ? 'svg' : mime.split('/')[1] || 'jpg'
  const sanitizedName = originalName.replace(/[^a-zA-Z0-9-_]/g, '_')
  const key = `${model}/${sanitizedName}.${ext}`

  let buffer = file.buffer

  if (mime !== 'image/svg+xml') {
    const pipeline = sharp(file.buffer).resize({
      width: resizeOptions.width,
      height: resizeOptions.height,
      fit: resizeOptions.fit ?? 'inside',
    })

    if (ext === 'webp') {
      pipeline.webp({ quality: resizeOptions.quality ?? 75 })
    } else if (ext === 'jpeg' || ext === 'jpg') {
      pipeline.jpeg({ quality: resizeOptions.quality ?? 75 })
    } else if (ext === 'png') {
      pipeline.png({ compressionLevel: 9 })
    } else {
      pipeline.webp({ quality: resizeOptions.quality ?? 75 })
    }

    buffer = await pipeline.toBuffer()
  }

  await s3.send(
    new PutObjectCommand({
      Bucket: process.env.S3_BUCKET_NAME!,
      Key: key,
      Body: buffer,
      ContentType: mime,
      ACL: 'public-read',
    })
  )

  return `/${key}`
}
