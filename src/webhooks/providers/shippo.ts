import { getPrismaClient } from '../../utils/prismaHelpers'

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
    console.warn('⚠️ Missing tracking number or status from Shippo webhook')
    return
  }

  const statusMap: Record<string, 'UNKNOWN' | 'PRE_TRANSIT' | 'TRANSIT' | 'OUT_FOR_DELIVERY' | 'DELIVERED' | 'RETURNED' | 'FAILURE'> = {
    'UNKNOWN': 'UNKNOWN',
    'PRE_TRANSIT': 'PRE_TRANSIT',
    'TRANSIT': 'TRANSIT',
    'OUT_FOR_DELIVERY': 'OUT_FOR_DELIVERY',
    'DELIVERED': 'DELIVERED',
    'RETURNED': 'RETURNED',
    'FAILURE': 'FAILURE',
  }

  const mappedStatus = statusMap[trackingStatus.toUpperCase()] ?? 'UNKNOWN'

  const shipment = await prisma.shipment.findFirst({
    where: { trackingNumber },
  })

  if (!shipment) {
    console.warn(`No Shipment found for tracking number: ${trackingNumber}`)
    return
  }

  await prisma.shipment.update({
    where: { id: shipment.id },
    data: {
      trackingStatus: mappedStatus,
    },
  })

  console.log(`Updated Shipment ${shipment.id}: trackingStatus → ${mappedStatus}`)
}
