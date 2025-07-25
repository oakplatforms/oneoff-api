import { default as serverlessExpress } from '@vendia/serverless-express'
import { app } from '../src/index'

const serverlessHandler = serverlessExpress({ app })

export const handler = (event, context) => {
  console.log('🔍 LAMBDA EVENT:', JSON.stringify(event, null, 2))
  console.log('🔍 LAMBDA CONTEXT:', JSON.stringify(context, null, 2))

  //For HTTP API v2, manually extract authorizer data and add it to the event
  if (event.requestContext?.authorizer) {
    console.log('🔍 AUTHORIZER FOUND IN EVENT:', JSON.stringify(event.requestContext.authorizer, null, 2))

    //Add authorizer data to headers so Express middleware can access it
    if (event.requestContext.authorizer.lambda) {
      const authorizerData = event.requestContext.authorizer.lambda
      if (!event.headers) event.headers = {}
      event.headers['x-authorizer-role'] = authorizerData.role
      event.headers['x-authorizer-userpool'] = authorizerData.userPool
      event.headers['x-authorizer-principalid'] = authorizerData.principalId || 'unknown'
    }
  }

  return serverlessHandler(event, context, () => {})
}