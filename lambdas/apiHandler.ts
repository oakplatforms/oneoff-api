import { default as serverlessExpress } from '@vendia/serverless-express'
import { app } from '../src/index'
import { initPrismaClient } from '../src/utils/prismaHelpers'
import { initStripeClient } from '../src/utils/stripe'

const serverlessHandler = serverlessExpress({ app })

//Track initialization state
let isInitialized = false

export const handler = async (event, context) => {
  //Initialize clients on cold start (before handling any requests)
  if (!isInitialized) {
    await Promise.all([
      initPrismaClient(),
      initStripeClient()
    ])
    isInitialized = true
  }

  //For HTTP API v2, manually extract authorizer data and add it to headers
  if (event.requestContext?.authorizer?.lambda) {
    const authorizerData = event.requestContext.authorizer.lambda
    if (!event.headers) event.headers = {}
    event.headers['x-authorizer-role'] = authorizerData.role
    event.headers['x-authorizer-userpool'] = authorizerData.userPool
    event.headers['x-authorizer-principalid'] = authorizerData.principalId || 'unknown'
  }

  return serverlessHandler(event, context, () => {})
}