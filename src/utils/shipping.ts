import { Shipment, ShippingOption } from '@prisma/client'
import { OrderPayload } from './order'

export const calculateShippingRate = (shipments: Shipment[]) => {
  if (!shipments?.length) return 0
  return Number(shipments.find(s => s.status === 'CREATED')?.rate || 0)
}

export const calculateShippingMethodRate = (order: OrderPayload) => {
  return order?.shippingMethod?.shippingOptions?.reduce((total: number, option: ShippingOption) => {
    return total + Number(option?.rate || 0)
  }, 0) || 0
}

export const calculateShippingOptionsRate = (orderListings: OrderPayload['orderListings'], order: OrderPayload) => {
  if (!orderListings?.length) return 0

  if (!order?.seller?.sellerShippingOptions?.length) return 0

  const itemCount = orderListings.reduce((total, listing) => {
    return total + (Number(listing.quantity) || 1)
  }, 0)

  return order.seller.sellerShippingOptions.reduce((sum: number, { shippingOption }) => {
    const rate = Number(shippingOption?.rate || 0)
    const maxQuantity = Number(shippingOption?.maxQuantity || 1)
    const unitsNeeded = Math.ceil(itemCount / maxQuantity)
    return sum + (rate * unitsNeeded)
  }, 0)
}