import { getPrismaClient } from "../utils/prismaHelpers"
import { OrderDetails } from '../services/invoice'

const prisma = getPrismaClient()

export const validateOrderSummary = async (orderSummary: OrderDetails[], type: 'LISTING' | 'BID') => {
  for (const orderDetails of orderSummary) {
    if (type === 'LISTING' && orderDetails?.createdById !== orderDetails?.purchasedById) {
      throw new Error('The purchaser has to create the order')
    }

    if (type === 'BID' && orderDetails?.createdById !== orderDetails?.soldById) {
      throw new Error('The seller has to create the order')
    }

    const account = await prisma.account.findUnique({
      where: { id: orderDetails?.createdById },
      include: { profile: true }
    })

    if (!account) {
      throw new Error('Account does not exist')
    }

    if (type === 'LISTING') {
      if (!orderDetails?.listingIds?.length) {
        throw new Error('Order must include at least one listing id')
      }
  
      const listingsInOrder = await prisma.listing.findMany({
        where: { id: { in: orderDetails.listingIds } },
      })

      for (const listingInOrder of listingsInOrder) {
        if (listingInOrder.status !== 'ACTIVE') {
          throw new Error('Order cannot include inactive listings')
        }
        if (listingInOrder.profileId === account?.profile?.id) {
          throw new Error('Order cannot include listings that your profile created')
        }
      }
    }

    if (type === 'BID') {
      if (!orderDetails?.bidIds?.length) {
        throw new Error('Order must include at least one bid id')
      }

      const bidsInOrder = await prisma.listing.findMany({
        where: { id: { in: orderDetails.bidIds } },
      })

      for (const bidInOrder of bidsInOrder) {
        if (bidInOrder.status !== 'ACTIVE') {
          throw new Error('Order cannot include inactive bids')
        }
        if (bidInOrder.profileId === account?.profile?.id) {
          throw new Error('Order cannot include bids that your profile created')
        }
      }
    }
  }
}