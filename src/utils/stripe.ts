import Stripe from 'stripe'
import { getSecrets } from './secretsManager'

let stripeClient: Stripe | null = null

/**
 * Initialize the Stripe client from Secrets Manager.
 * Call this during Lambda cold start before using stripe.
 */
export async function initStripeClient(): Promise<Stripe> {
  if (!stripeClient) {
    const secrets = await getSecrets()
    stripeClient = new Stripe(secrets.stripeSecretKey)
  }
  return stripeClient
}

/**
 * Gets the Stripe client. Throws if not initialized.
 * Call initStripeClient() first during Lambda initialization.
 */
export function getStripeClient(): Stripe {
  if (!stripeClient) {
    throw new Error('Stripe client not initialized. Call initStripeClient() first.')
  }
  return stripeClient
}

/**
 * Default export for backward compatibility.
 * Proxies to the initialized client.
 */
const stripe = new Proxy({} as Stripe, {
  get(_target, prop) {
    return getStripeClient()[prop as keyof Stripe]
  }
})

export default stripe
