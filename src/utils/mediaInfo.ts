import { readFileSync } from 'fs'

export async function getVideoDuration(filePath: string): Promise<number> {
  const MediaInfoFactory = (await import('mediainfo.js')).default
  const mediainfo = await MediaInfoFactory()

  const buffer = readFileSync(filePath)
  const fileSize = buffer.length

  const result = await mediainfo.analyzeData(
    fileSize,
    (readChunkSize: number, offset: number) => {
      return buffer.slice(offset, offset + readChunkSize)
    }
  )

  mediainfo.close()

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const parsed: any = typeof result === 'string' ? JSON.parse(result) : result
  const generalTrack = parsed.media?.track?.find(
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    (t: any) => t['@type'] === 'General'
  )

  if (!generalTrack?.Duration) {
    throw new Error('Could not determine video duration')
  }

  return parseFloat(generalTrack.Duration)
}
