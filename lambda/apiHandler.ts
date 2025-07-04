import { default as serverlessExpress } from '@vendia/serverless-express'
import { app } from '../src/index'

export const handler = serverlessExpress({ app })