import crypto from 'crypto'
import s3 from './s3Client'
import { PutObjectCommand } from '@aws-sdk/client-s3'
import multer from 'multer'

// Dynamic import for sharp to handle local development vs Lambda environment
let sharp: any = null
try {
  sharp = require('sharp')
} catch (error) {
  // Sharp not available locally, will be available in Lambda via layer
  console.warn('Sharp not available locally - will be available in Lambda environment')
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
  } else if (mime !== 'image/svg+xml' && !sharp) {
    // If sharp is not available (local development), use original buffer
    // In production Lambda, sharp will be available via the layer
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
