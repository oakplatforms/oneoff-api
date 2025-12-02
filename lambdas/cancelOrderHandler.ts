import { ProcessStatus, TrackingStatus, ShipmentAccountType } from '@prisma/client'
import { getPrismaClient } from '../src/utils/prismaHelpers'
import eventBridge from '../src/utils/eventBridge'
import { PutEventsCommand } from '@aws-sdk/client-eventbridge'

const prisma = getPrismaClient()

export const handler = async (): Promise<void> => {

  try {
    const seventyTwoHoursAgo = new Date()
    seventyTwoHoursAgo.setHours(seventyTwoHoursAgo.getHours() - 72)

    const ordersToCancel = await prisma.order.findMany({
      where: {
        status: ProcessStatus.PENDING,
        createdAt: {
          lt: seventyTwoHoursAgo
        },
        shipments: {
          some: {
            trackingStatus: {
              in: [TrackingStatus.UNKNOWN, TrackingStatus.PRE_TRANSIT]
            }
          }
        }
      },
      include: {
        shipments: true,
        shippingMethod: true,
      },
    })

    const validOrders = ordersToCancel.filter(
      order => order.shipments && order.shipments.length > 0
    )

    for (const order of validOrders) {
      const firstShipment = order.shipments[0]
      if (
        firstShipment.trackingStatus !== TrackingStatus.UNKNOWN &&
        firstShipment.trackingStatus !== TrackingStatus.PRE_TRANSIT
      ) {
        console.log(`Skipping order ${order.id} - tracking status changed: ${firstShipment.trackingStatus}`)
        continue
      }

      if (firstShipment.shipmentAccountType === ShipmentAccountType.UNTRACKED) {
        console.log(`Skipping order ${order.id} - shipment is untracked and cannot be canceled`)
        continue
      }

      try {
        const updatedOrder = await prisma.$transaction(async (tx) => {
          const updated = await tx.order.update({
            where: { id: order.id },
            data: {
              status: ProcessStatus.CANCELED,
            },
            include: {
              shipments: true,
              shippingMethod: true,
            },
          })

          return updated
        })

        try {
          await eventBridge.send(new PutEventsCommand({
            Entries: [
              {
                Source: 'tcgx',
                DetailType: 'order.canceled.customer',
                Detail: JSON.stringify({
                  orderId: updatedOrder.id,
                  type: 'order.canceled.customer',
                  cancellationReason: 'Order was canceled because the seller did not ship the order within 3 days.'
                }),
                EventBusName: 'default',
              },
              {
                Source: 'tcgx',
                DetailType: 'order.canceled.seller',
                Detail: JSON.stringify({
                  orderId: updatedOrder.id,
                  type: 'order.canceled.seller',
                  cancellationReason: 'Order was canceled because the seller did not ship the order within 3 days.'
                }),
                EventBusName: 'default',
              },
            ],
          }))
        } catch (err) {
          console.warn(`Failed to send cancellation notifications for order ${updatedOrder.id}:`, err)
        }
      } catch (err) {
        console.error(`Failed to cancel order ${order.id}:`, err)
      }
    }
  } catch (error) {
    console.error('Error in cancelOrder cron job:', error)
    throw error
  }
}

