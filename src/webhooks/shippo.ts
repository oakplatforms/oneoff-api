import { ProcessStatus } from '@prisma/client'
import { getPrismaClient } from '../utils/prismaHelpers'

const prisma = getPrismaClient()

interface ShippoWebhookEvent<T> {
  type: 'track_updated' | 'transaction_created' | string
  data: T
}

interface ShippoTrackingUpdate {
  tracking_number: string
  tracking_status: {
    status: string
    status_details?: string
    status_date?: string
  }
  carrier?: string
  eta?: string
  servicelevel?: {
    name?: string
    token?: string
  }
  metadata?: string
}

export async function handleShippoTrackingUpdated(event: ShippoWebhookEvent<ShippoTrackingUpdate>) {
  const tracking = event.data
  const trackingNumber = tracking.tracking_number
  const trackingStatus = tracking.tracking_status?.status?.toLowerCase()

  if (!trackingNumber || !trackingStatus) {
    console.warn('Missing tracking number or status from Shippo webhook')
    return null
  }

  const validStatuses = ['UNKNOWN', 'PRE_TRANSIT', 'TRANSIT', 'OUT_FOR_DELIVERY', 'DELIVERED', 'RETURNED', 'FAILURE'] as const
  const upperStatus = trackingStatus.toUpperCase()
  const mappedStatus = validStatuses.includes(upperStatus as typeof validStatuses[number])
    ? (upperStatus as typeof validStatuses[number])
    : 'UNKNOWN'

  const shipment = await prisma.shipment.findFirst({
    where: { trackingNumber },
    include: {
      order: true,
    },
  })

  if (!shipment) {
    console.warn(`No Shipment found for tracking number: ${trackingNumber}`)
    return null
  }

  const previousStatus = shipment.trackingStatus

  //Only update if status has changed
  if (previousStatus !== mappedStatus) {
    await prisma.shipment.update({
      where: { id: shipment.id },
      data: {
        trackingStatus: mappedStatus,
      },
    })

    console.log(`Updated Shipment ${shipment.id}: trackingStatus ${previousStatus} → ${mappedStatus}`)

    //If status changed to DELIVERED, update shipment and order status to COMPLETED
    if (mappedStatus === 'DELIVERED' && shipment.orderId) {
      await prisma.shipment.update({
        where: { id: shipment.id },
        data: {
          status: ProcessStatus.COMPLETED,
        },
      })
      await prisma.order.update({
        where: { id: shipment.orderId },
        data: {
          status: ProcessStatus.COMPLETED,
        },
      })
      console.log(`Updated Shipment ${shipment.id}: status → COMPLETED`)
      console.log(`Updated Order ${shipment.orderId}: status → COMPLETED`)
    }

    return {
      orderId: shipment.orderId,
      trackingStatus: mappedStatus,
      previousStatus,
      statusChanged: true,
    }
  } else {
    console.log(`Shipment ${shipment.id} status unchanged: ${mappedStatus}`)
    return {
      orderId: shipment.orderId,
      trackingStatus: mappedStatus,
      previousStatus,
      statusChanged: false,
    }
  }
}
