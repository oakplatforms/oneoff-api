import { getPrismaClient } from '../utils/prismaHelpers'
import Stripe from 'stripe'

const prisma = getPrismaClient()

export async function handleSellerAccountUpdated(event: Stripe.Event) {
  const stripeAccount = event.data.object as Stripe.Account
  const stripeAccountId = stripeAccount.id

  const seller = await prisma.seller.findFirst({
    where: { paymentAccountId: stripeAccountId },
    select: { id: true, paymentAccountStatus: true },
  })

  if (!seller) {
    console.warn(`No seller found with paymentAccountId = ${stripeAccountId}`)
    return
  }

  const isOnboardingComplete =
    stripeAccount.payouts_enabled &&
    stripeAccount.charges_enabled &&
    stripeAccount.details_submitted &&
    (stripeAccount.requirements?.currently_due?.length ?? 0) === 0

  if (!isOnboardingComplete) {
    console.log(`Seller ${seller.id} onboarding not yet complete`)
    return
  }

  if (seller.paymentAccountStatus === 'COMPLETED') {
    console.log(`Seller ${seller.id} already marked as COMPLETED`)
    return
  }

  await prisma.seller.update({
    where: { id: seller.id },
    data: { paymentAccountStatus: 'COMPLETED' },
  })

  console.log(`Updated seller ${seller.id}: paymentAccountStatus → COMPLETED`)
}
