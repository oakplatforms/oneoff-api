import { getPrismaClient } from '../utils/prismaHelpers'

const prisma = getPrismaClient()

export const calculateWalletBalance = async (accountId?: string, sellerId?: string) => {
  console.log('calculateWalletBalance', accountId, sellerId)
  if (!accountId) {
    throw new Error('Account ID is required')
  }
  const [ordersAll, ordersCompleted, payoutsCompleted] = await Promise.all([
    prisma.order.aggregate({
      where: {
        sellerId: sellerId,
        status: { in: ['PENDING', 'COMPLETED'] },
      },
      _sum: {
        total: true,
      },
    }),
    prisma.order.aggregate({
      where: {
        sellerId: sellerId,
        status: 'COMPLETED',
      },
      _sum: {
        total: true,
      },
    }),
    prisma.payout.aggregate({
      where: {
        accountId: accountId,
        status: 'COMPLETED',
      },
      _sum: {
        total: true,
      },
    }),
  ])

  if (!ordersAll || !ordersCompleted || !payoutsCompleted) {
    throw new Error('Error calculating wallet balance')
  }

  const sumAllOrders = ordersAll._sum.total || 0
  const sumCompletedOrders = ordersCompleted._sum.total || 0
  const sumCompletedPayouts = payoutsCompleted._sum.total || 0

  const balance = Math.max(0, Number(sumAllOrders) - Number(sumCompletedPayouts))
  const availableToWithdraw = Math.max(0, Number(sumCompletedOrders) - Number(sumCompletedPayouts))

  if (balance < 0 || availableToWithdraw < 0) {
    throw new Error('Negative balance detected')
  }

  return {
    balance,
    availableToWithdraw,
  }
}