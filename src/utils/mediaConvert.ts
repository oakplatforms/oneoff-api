import {
  MediaConvertClient,
  CreateJobCommand,
  DescribeEndpointsCommand,
} from '@aws-sdk/client-mediaconvert'

let cachedEndpoint: string | null = null

async function getMediaConvertEndpoint(): Promise<string> {
  if (cachedEndpoint) return cachedEndpoint

  const client = new MediaConvertClient({ region: 'us-east-1' })
  const response = await client.send(new DescribeEndpointsCommand({ MaxResults: 1 }))

  if (!response.Endpoints?.[0]?.Url) {
    throw new Error('Could not retrieve MediaConvert endpoint')
  }

  cachedEndpoint = response.Endpoints[0].Url
  return cachedEndpoint
}

export interface CreateMediaConvertJobOptions {
  inputKey: string
  outputPrefix: string
  bucket: string
  maxDuration: number
}

export async function createMediaConvertJob({
  inputKey,
  outputPrefix,
  bucket,
  maxDuration,
}: CreateMediaConvertJobOptions): Promise<string> {
  const endpoint = await getMediaConvertEndpoint()
  const client = new MediaConvertClient({
    region: 'us-east-1',
    endpoint,
  })

  const roleArn = process.env.MEDIA_CONVERT_ROLE_ARN!

  const command = new CreateJobCommand({
    Role: roleArn,
    Settings: {
      TimecodeConfig: {
        Source: 'ZEROBASED',
      },
      Inputs: [
        {
          FileInput: `s3://${bucket}/${inputKey}`,
          TimecodeSource: 'ZEROBASED',
          InputClippings: [
            {
              StartTimecode: '00:00:00:00',
              EndTimecode: `00:00:${String(maxDuration).padStart(2, '0')}:00`,
            },
          ],
          AudioSelectors: {
            'Audio Selector 1': {
              DefaultSelection: 'DEFAULT',
            },
          },
          VideoSelector: {},
        },
      ],
      OutputGroups: [
        {
          Name: 'File Group',
          OutputGroupSettings: {
            Type: 'FILE_GROUP_SETTINGS',
            FileGroupSettings: {
              Destination: `s3://${bucket}/${outputPrefix}`,
            },
          },
          Outputs: [
            {
              ContainerSettings: {
                Container: 'MP4',
                Mp4Settings: {},
              },
              VideoDescription: {
                CodecSettings: {
                  Codec: 'H_264',
                  H264Settings: {
                    RateControlMode: 'QVBR',
                    QvbrSettings: {
                      QvbrQualityLevel: 7,
                    },
                    MaxBitrate: 5000000,
                    CodecProfile: 'HIGH',
                    CodecLevel: 'AUTO',
                    SceneChangeDetect: 'TRANSITION_DETECTION',
                  },
                },
              },
              AudioDescriptions: [
                {
                  CodecSettings: {
                    Codec: 'AAC',
                    AacSettings: {
                      Bitrate: 128000,
                      CodingMode: 'CODING_MODE_2_0',
                      SampleRate: 48000,
                    },
                  },
                  AudioSourceName: 'Audio Selector 1',
                },
              ],
              Extension: 'mp4',
            },
          ],
        },
      ],
    },
  })

  const response = await client.send(command)

  if (!response.Job?.Id) {
    throw new Error('MediaConvert job creation did not return a job ID')
  }

  return response.Job.Id
}
