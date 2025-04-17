import { getPrismaClient } from '../utils/prismaHelpers'
import { OrderDetails } from '../services/invoice'

const prisma = getPrismaClient()

export const validateListingOrderSummary = async (orderSummary: OrderDetails[]) => {
  for (const orderDetails of orderSummary) {

    const account = await prisma.account.findUnique({
      where: { id: orderDetails?.accountId },
      include: { profile: true }
    })

    if (!account) {
      throw new Error('Account does not exist')
    }

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
      if (listingInOrder.accountId === account?.id) {
        throw new Error('Order cannot include listings that your profile created')
      }
    }
  }
}
