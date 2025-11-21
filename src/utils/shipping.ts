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

  if (!order?.orderShippingOptions?.length) return 0

  const totalQuantity = orderListings.reduce((sum, listing) => sum + (listing.quantity || 1), 0)

  return order.orderShippingOptions.reduce((total, { shippingOption }) => {
    const maxQuantity = Number(shippingOption?.maxQuantity) || 1
    const units = Math.ceil(totalQuantity / maxQuantity)
    const rate = Number(shippingOption?.rate || 0) * units
    return total + rate
  }, 0)
}