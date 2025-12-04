import { ProcessStatus, TrackingStatus } from '@prisma/client'
import { getPrismaClient } from '../src/utils/prismaHelpers'
import eventBridge from '../src/utils/eventBridge'
import { PutEventsCommand } from '@aws-sdk/client-eventbridge'
import stripe from '../src/utils/stripe'

const prisma = getPrismaClient()

export const handler = async (): Promise<void> => {

  try {
    const ninetySixHoursAgo = new Date()
    ninetySixHoursAgo.setHours(ninetySixHoursAgo.getHours() - 96)

    const ordersToCancel = await prisma.order.findMany({
      where: {
        status: ProcessStatus.PENDING,
        createdAt: {
          lt: ninetySixHoursAgo
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

      try {
        const updatedOrder = await prisma.$transaction(async (tx) => {
          const orderToCancel = await tx.order.findUnique({
            where: { id: order.id },
            include: {
              shipments: true,
              shippingMethod: true,
            },
          })

          if (!orderToCancel) {
            throw new Error(`Order ${order.id} not found`)
          }

          if (orderToCancel.paymentIntentId) {
            await stripe.paymentIntents.cancel(orderToCancel.paymentIntentId)
          }

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

