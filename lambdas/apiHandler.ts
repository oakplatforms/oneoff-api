import { default as serverlessExpress } from '@vendia/serverless-express'
import { app } from '../src/index'

const serverlessHandler = serverlessExpress({ app })

export const handler = (event, context) => {
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