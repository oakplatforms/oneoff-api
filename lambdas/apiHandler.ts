import { default as serverlessExpress } from '@vendia/serverless-express'
import { app } from '../src/index'

const serverlessHandler = serverlessExpress({ app })

export const handler = (event, context) => {
  console.log('🔍 LAMBDA EVENT:', JSON.stringify(event, null, 2))
  console.log('🔍 LAMBDA CONTEXT:', JSON.stringify(context, null, 2))

  //For HTTP API v2, manually extract authorizer data and add it to the event
  if (event.requestContext?.authorizer) {
    console.log('🔍 AUTHORIZER FOUND IN EVENT:', JSON.stringify(event.requestContext.authorizer, null, 2))
  }

  return serverlessHandler(event, context, () => {})
}