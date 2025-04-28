import { PrismaClient } from '@prisma/client'

const prisma = new PrismaClient()

export const validateOrdersForInvoice = async (orderIds: string[]) => {
  const orders = await prisma.order.findMany({
    where: {
      id: { in: orderIds },
    },
    include: {
      orderListings: {
        include: {
          listing: true,
        },
      },
    },
  })

  if (orders.length !== orderIds.length) {
    throw new Error('One or more order IDs are invalid or missing.')
  }

  for (const order of orders) {
    if (order.status !== 'CREATED') {
      throw new Error(`Order ${order.id} is not in a valid status for invoice creation.`)
    }

    for (const orderListing of order.orderListings) {
      const availableQuantity = orderListing.listing?.quantity ?? 0
      const orderedQuantity = orderListing.quantity ?? 0

      if (orderedQuantity > availableQuantity) {
        throw new Error(
          'Insufficient quantity for specific listing in your order.'
        )
      }
    }
  }
}
