import { Shipment, ShippingOption } from '@prisma/client'
import { OrderPayload } from './order'

export const generateShippingRate = (shipments: Shipment[]) => {
  if (!shipments?.length) return 0
  return Number(shipments.find(s => s.status === 'CREATED')?.rate || 0)
}

export const generateShippingMethodRate = (order: OrderPayload) => {
  return order?.shippingMethod?.shippingOptions?.reduce((total: number, option: ShippingOption) => {
    return total + Number(option?.rate || 0)
  }, 0) || 0
}

export const generateShippingOptionsRate = (orderListings: OrderPayload['orderListings']) => {
  if (!orderListings?.length) return 0

  const order = orderListings[0].order
  if (!order?.orderShippingOptions?.length) return 0

  const itemCount = orderListings.reduce((total, listing) => {
    return total + (Number(listing.quantity) || 1)
  }, 0)

  return order.orderShippingOptions.reduce((sum: number, { shippingOption }) => {
    const rate = Number(shippingOption?.rate || 0)
    const maxQuantity = Number(shippingOption?.maxQuantity || 1)
    const unitsNeeded = Math.ceil(itemCount / maxQuantity)
    return sum + (rate * unitsNeeded)
  }, 0)
}