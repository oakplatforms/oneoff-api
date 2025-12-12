import { Prisma, ShipmentAccountType, ShipmentType } from '@prisma/client'
import { calculateShippingMethodRate, calculateShippingOptionsRate } from './shipping'

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
  const activeShipment = getActiveShipment(order)
  const shipmentRate = activeShipment.status === 'CREATED'
    ? Number(activeShipment.rate || 0)
    : 0

  return (
    shipmentRate +
    calculateShippingMethodRate(order) +
    calculateShippingOptionsRate(orderListings, order)
  )
}

type OrderWithShipments<T = unknown> = {
  shipments: Array<T & { type?: ShipmentType | string }>
  shippingMethod?: { isTracked: boolean | null } | null
}

/**
 * Gets the OUTBOUND shipment from an order's shipments.
 * Throws an error if no OUTBOUND shipment is found.
 */
export const getOutboundShipment = <T extends { type?: ShipmentType | string }>(
  shipments: Array<T>
): T => {
  const outboundShipment = shipments.find(
    (shipment) => shipment.type === ShipmentType.OUTBOUND
  )

  if (!outboundShipment) {
    const availableTypes = shipments.map(s => s.type || 'unknown').join(', ')
    throw new Error(
      `Could not find OUTBOUND shipment. Available shipment types: ${availableTypes}`
    )
  }

  return outboundShipment
}

/**
 * Gets the active shipment for an order based on the shipping method's isTracked property.
 * If isTracked is true, returns the SHIPPO OUTBOUND shipment.
 * If isTracked is false, returns the UNTRACKED shipment.
 * Throws an error if shippingMethod is not available or if the expected shipment type is not found.
 */
export const getActiveShipment = <T extends { shipmentAccountType: ShipmentAccountType | string; type?: ShipmentType | string }>(
  order: OrderWithShipments<T>
): T => {
  if (!order.shipments || order.shipments.length === 0) {
    throw new Error('Order has no shipments.')
  }

  if (!order.shippingMethod) {
    throw new Error('Order shippingMethod is required to determine active shipment.')
  }

  const isTracked = order.shippingMethod.isTracked

  if (isTracked === true) {
    //For tracked shipments, get the OUTBOUND SHIPPO shipment
    const shippoShipments = order.shipments.filter(
      (shipment) =>
        shipment.shipmentAccountType === ShipmentAccountType.SHIPPO ||
        String(shipment.shipmentAccountType).toUpperCase() === ShipmentAccountType.SHIPPO
    )
    return getOutboundShipment(shippoShipments)
  }

  if (isTracked === false) {
    const activeShipment = order.shipments.find(
      (shipment) =>
        shipment.shipmentAccountType === ShipmentAccountType.UNTRACKED ||
        String(shipment.shipmentAccountType).toUpperCase() === ShipmentAccountType.UNTRACKED
    )

    if (!activeShipment) {
      const availableTypes = order.shipments.map(s => s.shipmentAccountType).join(', ')
      throw new Error(
        `Could not find ${ShipmentAccountType.UNTRACKED} shipment for order. ` +
        `Expected shipment type: ${ShipmentAccountType.UNTRACKED} (isTracked: false). ` +
        `Available shipment types: ${availableTypes}`
      )
    }

    return activeShipment
  }

  throw new Error(
    `Invalid shippingMethod.isTracked value: ${isTracked}. ` +
    `Expected true or false, but got ${typeof isTracked === 'object' ? 'null' : String(isTracked)}.`
  )
}