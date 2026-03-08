import crypto from 'crypto'
import s3 from './s3Client'
import { PutObjectCommand } from '@aws-sdk/client-s3'
import multer from 'multer'

//eslint-disable-next-line @typescript-eslint/no-explicit-any
let sharp: any = null
try {
  sharp = require('sharp') 
} catch (error) {
  console.warn('Sharp not available locally - will be available in Lambda environment', error)
}

export const uploadConfig = multer({
  limits: { fileSize: 5 * 1024 * 1024 },
})

export type ResizeImageOptions = {
  width?: number
  height?: number
  quality?: number
  format?: 'jpeg' | 'png' | 'webp' | 'jpg'
  fit?: 'cover' | 'contain' | 'fill' | 'inside' | 'outside'
  blur?: number  // Blur radius (e.g., 20-30 for content blurring)
}

const defaultResizeOptions: ResizeImageOptions = {
  width: 750,
  quality: 90,
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

  const targetFormat = resizeOptions.format || 'webp'
  const ext = mime === 'image/svg+xml' ? 'svg' : targetFormat
  const imageId = crypto.randomUUID()
  const key = `${model}/${imageId}.${ext}`

  let buffer = file.buffer

  if (mime !== 'image/svg+xml' && sharp) {
    const pipeline = sharp(file.buffer).resize({
      width: resizeOptions.width,
      height: resizeOptions.height,
      fit: resizeOptions.fit ?? 'inside',
    })

    // Apply blur if specified
    if (resizeOptions.blur && resizeOptions.blur > 0) {
      pipeline.blur(resizeOptions.blur)
    }

    if (ext === 'webp') {
      pipeline.webp({ quality: resizeOptions.quality ?? 90 })
    } else if (ext === 'jpeg' || ext === 'jpg') {
      pipeline.jpeg({ quality: resizeOptions.quality ?? 90 })
    } else if (ext === 'png') {
      pipeline.png({ compressionLevel: 9 })
    } else {
      pipeline.webp({ quality: resizeOptions.quality ?? 90 })
    }

    buffer = await pipeline.toBuffer()
  } else if (mime !== 'image/svg+xml' && !sharp) {
    console.warn('Image processing skipped - sharp not available locally')
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

export interface UploadPrivateImageOptions {
  buffer: Buffer
  folder: string
  filename: string
  contentType?: string
  metadata?: Record<string, string>
}

export async function uploadPrivateImage({
  buffer,
  folder,
  filename,
  contentType = 'image/jpeg',
  metadata = {},
}: UploadPrivateImageOptions): Promise<string> {
  const key = `${folder}/${filename}`

  await s3.send(
    new PutObjectCommand({
      Bucket: process.env.S3_BUCKET_NAME!,
      Key: key,
      Body: buffer,
      ContentType: contentType,
      Metadata: metadata,
      // No ACL - private by default
    })
  )

  return `/${key}`
}
