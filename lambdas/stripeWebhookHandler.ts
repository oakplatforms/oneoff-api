import { APIGatewayProxyEvent, APIGatewayProxyResult } from 'aws-lambda'
import { getStripeClient, initStripeClient } from '../src/utils/stripe'
import { getSecrets, OneoffSecrets } from '../src/utils/secretsManager'
import { initPrismaClient } from '../src/utils/prismaHelpers'

import { handleSellerAccountUpdated } from '../src/webhooks/stripe'

let cachedSecrets: OneoffSecrets | null = null
let isInitialized = false

export const handler = async (event: APIGatewayProxyEvent): Promise<APIGatewayProxyResult> => {
  if (!isInitialized) {
    await Promise.all([initPrismaClient(), initStripeClient()])
    cachedSecrets = await getSecrets()
    isInitialized = true
  }

  console.log('Received webhook event:', JSON.stringify(event, null, 2))

  const sig = event.headers['stripe-signature'] || event.headers['Stripe-Signature']
  const webhookSecret = cachedSecrets!.stripeWebhookSecret

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
    const eventObj = getStripeClient().webhooks.constructEvent(event.body!, sig, webhookSecret)
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