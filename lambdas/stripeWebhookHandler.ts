import { APIGatewayProxyEvent, APIGatewayProxyResult } from 'aws-lambda'
import stripe from '../src/utils/stripe'

import { handleSellerAccountUpdated } from '../src/webhooks/providers/stripe'

export const handler = async (event: APIGatewayProxyEvent): Promise<APIGatewayProxyResult> => {
  console.log('Received webhook event:', JSON.stringify(event, null, 2))

  const sig = event.headers['stripe-signature'] || event.headers['Stripe-Signature']
  const webhookSecret = process.env.STRIPE_WEBHOOK_SECRET!

  if (!sig) {
    console.error('Missing Stripe signature header. Available headers:', Object.keys(event.headers))
    return {
      statusCode: 400,
      headers: {
        'Content-Type': 'application/json',
        'Access-Control-Allow-Origin': '*',
        'Access-Control-Allow-Headers': 'Content-Type',
        'Access-Control-Allow-Methods': 'POST, OPTIONS'
      },
      body: JSON.stringify({ error: 'Missing Stripe signature' })
    }
  }

  try {
    const eventObj = stripe.webhooks.constructEvent(event.body!, sig, webhookSecret)
    console.log('✅ Verified Stripe event:', eventObj.type)

    switch (eventObj.type) {
    case 'account.updated':
      await handleSellerAccountUpdated(eventObj)
      console.log('account.updated event processed')
      break
    default:
      console.log(`Unhandled event type: ${eventObj.type}`)
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
    console.error('❌ Stripe webhook verification failed:', err)
    return {
      statusCode: 400,
      headers: {
        'Content-Type': 'application/json',
        'Access-Control-Allow-Origin': '*',
        'Access-Control-Allow-Headers': 'Content-Type',
        'Access-Control-Allow-Methods': 'POST, OPTIONS'
      },
      body: JSON.stringify({ error: `Webhook Error: ${err instanceof Error ? err.message : 'Unknown error'}` })
    }
  }
}