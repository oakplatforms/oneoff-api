import { Prisma } from '@prisma/client'
import { generateShippingMethodRate, generateShippingOptionsRate, generateShippingRate } from './shipping'

export type OrderPayload = Prisma.OrderGetPayload<{
  include: {
    customer: {
      include: {
        account: true,
      },
    },
    seller: true,
    shipments: true,
    shippingMethod: {
      include: {
        shippingOptions: true,
      },
    },
    orderShippingOptions: {
      include: {
        shippingOption: true,
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
        order: {
          include: {
            orderShippingOptions: {
              include: {
                shippingOption: true,
              },
            },
            shippingMethod: {
              include: {
                shippingOptions: true,
              },
            },
          },
        },
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

  for (const option of order.orderShippingOptions || []) {
    const weight = option.shippingOption?.weight || 0
    const maxQuantity = option.shippingOption?.maxQuantity || 1

    const unitsNeeded = Math.ceil(itemCount / maxQuantity)
    totalOptionWeight += weight * unitsNeeded
  }

  const total = totalProductWeight + totalOptionWeight
  return parseFloat(total.toFixed(2))
}

export const generateShippingTax = (order: OrderPayload) => {
  return Number(order.subTotal || 0) * Number(order.seller?.taxRate || 0)
}

export const calculateOrderAmount = (order: OrderPayload, orderListings: OrderPayload['orderListings']) => {
  return (
    Number(order.subTotal || 0) +
    generateShippingTax(order) +
    generateShippingRate(order.shipments) +
    generateShippingMethodRate(order) +
    generateShippingOptionsRate(orderListings)
  )
}