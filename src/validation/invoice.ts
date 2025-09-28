import { getPrismaClient } from '../utils/prismaHelpers'

const prisma = getPrismaClient()

export const validateOrdersForInvoice = async (orderIds: string[]) => {
  const orders = await prisma.order.findMany({
    where: {
      id: { in: orderIds },
    },
    include: {
      shipments: true,
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
      throw new Error(`An order in your cart does not have a valid status for invoice creation.`)
    }

    const hasPendingShipment = order.shipments?.some(shipment => shipment.status === 'CREATED')

    if (!hasPendingShipment) {
      throw new Error(`An order must have a shipment to proceed.`)
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
