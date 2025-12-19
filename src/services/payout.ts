import { getPrismaClient } from '../utils/prismaHelpers'
import stripe from '../utils/stripe'

const prisma = getPrismaClient()

export const calculateWalletBalance = async (accountId?: string) => {
  if (!accountId) {
    throw new Error('Account ID is required')
  }

  //Get seller's paymentAccountId from the database
  const seller = await prisma.seller.findUnique({
    where: { accountId },
    select: { paymentAccountId: true },
  })

  if (!seller?.paymentAccountId) {
    throw new Error('Seller paymentAccountId not found')
  }

  //Retrieve balance from Stripe Connect account
  const balance = await stripe.balance.retrieve({
    stripeAccount: seller.paymentAccountId,
  })

  const availableToWithdraw = balance.available.reduce((sum, bal) => {
    if (bal.currency === 'usd') {
      return sum + bal.amount
    }
    return sum
  }, 0)

  const totalBalance = balance.available.reduce((sum, bal) => {
    if (bal.currency === 'usd') {
      return sum + bal.amount
    }
    return sum
  }, 0) + balance.pending.reduce((sum, bal) => {
    if (bal.currency === 'usd') {
      return sum + bal.amount
    }
    return sum
  }, 0)

  const balanceInDollars = totalBalance / 100
  const availableToWithdrawInDollars = availableToWithdraw / 100

  if (balanceInDollars < 0 || availableToWithdrawInDollars < 0) {
    throw new Error('Negative balance detected')
  }

  return {
    balance: balanceInDollars,
    availableToWithdraw: availableToWithdrawInDollars,
  }
}