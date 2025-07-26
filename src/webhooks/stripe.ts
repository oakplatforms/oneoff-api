import { getPrismaClient } from '../utils/prismaHelpers'
import { promoteUserToSeller } from '../utils/promoteUserToSeller'
import type { Stripe } from 'stripe'

const prisma = getPrismaClient()

export const handleSellerAccountUpdated = async (event: Stripe.Event) => {
  const stripeAccount = event.data.object as Stripe.Account
  console.log('Processing seller account updated event:', stripeAccount.id)

  const stripeAccountId = stripeAccount.id
  const chargesEnabled = stripeAccount.charges_enabled
  const payoutsEnabled = stripeAccount.payouts_enabled
  const detailsSubmitted = stripeAccount.details_submitted

  const isFullyVerified = chargesEnabled && payoutsEnabled && detailsSubmitted

  if (!isFullyVerified) {
    console.log(`Stripe account ${stripeAccountId} is not fully verified yet.`)
    return
  }

  const seller = await prisma.seller.findFirst({
    where: { paymentAccountId: stripeAccountId },
    include: {
      account: {
        include: {
          user: true
        }
      }
    }
  })

  if (!seller) {
    console.log('No seller found for Stripe account:', stripeAccountId)
    return
  }

  await prisma.seller.update({
    where: { id: seller.id },
    data: {
      hasPaymentMethod: true,
      paymentAccountStatus: 'COMPLETED'
    }
  })

  console.log(`Updated seller ${seller.id}: paymentAccountStatus → COMPLETED`)

  try {
    const account = await prisma.account.findUnique({
      where: { id: seller.accountId }
    })

    if (account?.type !== 'SELLER') {
      await promoteUserToSeller(
        seller.account.user.authId,
        seller.accountId,
        seller.id
      )
      console.log('Automatically promoted user to seller via webhook:', seller.account.user.authId)
    } else {
      console.log('User already has seller role:', seller.account.user.authId)
    }
  } catch (error) {
    console.error('Failed to promote user to seller via webhook:', error)
  }
}
