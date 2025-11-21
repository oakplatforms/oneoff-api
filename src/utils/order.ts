import { Prisma } from '@prisma/client'
import { calculateShippingMethodRate, calculateShippingOptionsRate, calculateShippingRate } from './shipping'

export type OrderPayload = Prisma.OrderGetPayload<{
  include: {
    customer: {
      include: {
        account: true,
      },
    },
    seller: {
      include: {
        sellerShippingOptions: {
          include: {
            shippingOption: true,
          },
        },
      },
    },
    shipments: true,
    shippingMethod: {
      include: {
        shippingOptions: true,
      },
    },
    orderListings: {
      include: {
        listing: {
          include: {
            entity: {
              include: {
                product: true,
              },
            },
          },
        },
      },
    },
    orderShippingOptions: {
      include: {
        shippingOption: true,
      },
    },
  },
}>

export const calculateOrderWeight = (order: OrderPayload) => {
  let totalProductWeight = 0
  let totalOptionWeight = 0

  for (const orderListing of order.orderListings || []) {
    const productWeight = (orderListing.listing?.entity?.product?.weight || 0) * (orderListing?.quantity || 1)
    totalProductWeight += productWeight
  }

  const itemCount = order.orderListings.reduce((total, listing) => {
    return total + (listing.quantity || 1)
  }, 0)

  for (const option of order.seller?.sellerShippingOptions || []) {
    const weight = option.shippingOption?.weight || 0
    const maxQuantity = option.shippingOption?.maxQuantity || 1

    const unitsNeeded = Math.ceil(itemCount / maxQuantity)
    totalOptionWeight += weight * unitsNeeded
  }

  const total = totalProductWeight + totalOptionWeight
  return parseFloat(total.toFixed(2))
}

export const calculateOrderTax = (order: OrderPayload) => {
  return Number(order.subTotal || 0) * Number(order.seller?.taxRate || 0)
}

export const calculateOrderShipping = (order: OrderPayload, orderListings: OrderPayload['orderListings']) => {
  return (
    calculateShippingRate(order.shipments) +
    calculateShippingMethodRate(order) +
    calculateShippingOptionsRate(orderListings, order)
  )
}