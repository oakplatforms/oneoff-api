import { APIGatewayProxyEvent, APIGatewayProxyResult } from 'aws-lambda'
import { handleShippoTrackingUpdated } from '../src/webhooks/providers/shippo'

export const handler = async (event: APIGatewayProxyEvent): Promise<APIGatewayProxyResult> => {
  console.log('Received Shippo webhook event:', JSON.stringify(event, null, 2))

  const expectedSecret = process.env.SHIPPO_WEBHOOK_SECRET
  const receivedSecret = event.queryStringParameters?.secret

  if (!expectedSecret || receivedSecret !== expectedSecret) {
    console.error('Shippo webhook blocked: invalid secret')
    return {
      statusCode: 401,
      headers: {
        'Content-Type': 'application/json',
        'Access-Control-Allow-Origin': '*',
        'Access-Control-Allow-Headers': 'Content-Type',
        'Access-Control-Allow-Methods': 'POST, OPTIONS'
      },
      body: JSON.stringify({ errorMessage: 'Unauthorized' })
    }
  }

  try {
    const tracking = JSON.parse(event.body || '{}')
    console.log('Shippo event received:', tracking)

    switch (tracking.event) {
    case 'track_updated':
      await handleShippoTrackingUpdated(tracking)
      console.log('track_updated event processed')
      break
    default:
      console.log(`Unhandled Shippo event type: ${tracking.event}`)
    }

    return {
      statusCode: 200,
      headers: {
        'Content-Type': 'application/json',
        'Access-Control-Allow-Origin': '*',
        'Access-Control-Allow-Headers': 'Content-Type',
        'Access-Control-Allow-Methods': 'POST, OPTIONS'
      },
      body: JSON.stringify({ received: true })
    }
  } catch (err) {
    console.error('Error handling Shippo webhook:', err)
    return {
      statusCode: 500,
      headers: {
        'Content-Type': 'application/json',
        'Access-Control-Allow-Origin': '*',
        'Access-Control-Allow-Headers': 'Content-Type',
        'Access-Control-Allow-Methods': 'POST, OPTIONS'
      },
      body: JSON.stringify({ errorMessage: 'Internal server error' })
    }
  }
}
