import { Prisma, ShipmentAccountType } from '@prisma/client'
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

type OrderWithShipments<T = any> = {
  shipments: Array<T>
  shippingMethod?: { isTracked: boolean | null } | null
}

/**
 * Gets the active shipment for an order based on the shipping method's isTracked property.
 * If isTracked is true, returns the SHIPPO shipment.
 * If isTracked is false/null/undefined, returns the UNTRACKED shipment.
 * Falls back to the first shipment if no match is found or shippingMethod is not available.
 */
export const getActiveShipment = <T extends { shipmentAccountType: ShipmentAccountType | string }>(
  order: OrderWithShipments<T>
): T | undefined => {
  if (!order.shipments || order.shipments.length === 0) {
    return undefined
  }

  // If shippingMethod is not available, fall back to first shipment for backward compatibility
  if (!order.shippingMethod) {
    return order.shipments[0]
  }

  const isTracked = order.shippingMethod.isTracked ?? true
  const expectedAccountType = isTracked ? ShipmentAccountType.SHIPPO : ShipmentAccountType.UNTRACKED

  const activeShipment = order.shipments.find(
    (shipment) => 
      shipment.shipmentAccountType === expectedAccountType || 
      String(shipment.shipmentAccountType) === String(expectedAccountType)
  )

  // Fall back to first shipment if no match found
  return activeShipment || order.shipments[0]
}