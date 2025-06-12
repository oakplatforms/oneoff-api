import { EventBridgeClient } from '@aws-sdk/client-eventbridge'

const eventBridge = new EventBridgeClient({
  region: 'us-east-1',
})

export default eventBridge