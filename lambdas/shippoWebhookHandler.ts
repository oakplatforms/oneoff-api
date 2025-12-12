import { APIGatewayProxyEvent, APIGatewayProxyResult } from 'aws-lambda'
import { handleShippoTrackingUpdated } from '../src/webhooks/shippo'
import eventBridge from '../src/utils/eventBridge'
import { PutEventsCommand } from '@aws-sdk/client-eventbridge'

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

    switch (tracking.event) {
    case 'track_updated': {
      const result = await handleShippoTrackingUpdated(tracking)
      if (result && result.orderId && result.trackingStatus && result.statusChanged) {
        await triggerTrackingStatusEvents(result.orderId, result.trackingStatus)
      }
      break
    }
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

async function triggerTrackingStatusEvents(orderId: string, trackingStatus: string) {
  try {
    switch (trackingStatus) {
    case 'DELIVERED':
      await Promise.all([
        triggerEvent(orderId, 'order.delivered.customer'),
        triggerEvent(orderId, 'order.delivered.seller')
      ])
      return
    case 'TRANSIT':
      await Promise.all([
        triggerEvent(orderId, 'order.transit.customer'),
        triggerEvent(orderId, 'order.transit.seller')
      ])
      return
    default:
      return
    }
  } catch (err) {
    console.error(`Failed to trigger tracking status event for order ${orderId}:`, err)
  }
}

async function triggerEvent(orderId: string, detailType: string) {
  try {
    await eventBridge.send(new PutEventsCommand({
      Entries: [
        {
          Source: 'tcgx',
          DetailType: detailType,
          Detail: JSON.stringify({ orderId, type: detailType }),
          EventBusName: 'default',
        },
      ],
    }))
    console.log(`EventBridge event triggered: ${detailType} for order ${orderId}`)
  } catch (err) {
    console.error(`Failed to send EventBridge event ${detailType} for order ${orderId}:`, err)
  }
}
