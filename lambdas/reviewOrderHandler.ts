import { ProcessStatus, TrackingStatus, RefundStatus } from '@prisma/client'
import { getPrismaClient } from '../src/utils/prismaHelpers'
import { getActiveShipment } from '../src/utils/order'

const prisma = getPrismaClient()

export const handler = async (): Promise<void> => {
  try {
    const sevenDaysAgo = new Date()
    sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7)

    const tenDaysAgo = new Date()
    tenDaysAgo.setDate(tenDaysAgo.getDate() - 10)

    const fourteenDaysAgo = new Date()
    fourteenDaysAgo.setDate(fourteenDaysAgo.getDate() - 14)

    //Condition 1: Order status is PENDING and shipment is UNKNOWN or PRE_TRANSIT, 7 days after creation
    const orders7Days = await prisma.order.findMany({
      where: {
        status: ProcessStatus.PENDING,
        createdAt: {
          lt: sevenDaysAgo
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

    //Condition 2: Order is not COMPLETED and shipment is not DELIVERED, 14 days after creation
    const orders14Days = await prisma.order.findMany({
      where: {
        status: {
          notIn: [ProcessStatus.COMPLETED, ProcessStatus.IN_REVIEW]
        },
        createdAt: {
          lt: fourteenDaysAgo
        },
        shipments: {
          some: {
            trackingStatus: {
              not: TrackingStatus.DELIVERED
            }
          }
        }
      },
      include: {
        shipments: true,
        shippingMethod: true,
      },
    })

    //Condition 3: Order has a refund with PENDING status, 10 days after creation
    const orders10Days = await prisma.order.findMany({
      where: {
        status: {
          not: ProcessStatus.IN_REVIEW
        },
        createdAt: {
          lt: tenDaysAgo
        },
        refund: {
          status: RefundStatus.PENDING
        }
      },
      include: {
        shipments: true,
        shippingMethod: true,
        refund: true,
      },
    })

    //Process Condition 1: 7-day review
    for (const order of orders7Days) {
      try {
        const activeShipment = getActiveShipment(order)

        //Verify the active shipment matches the condition
        if (activeShipment.trackingStatus !== TrackingStatus.UNKNOWN &&
            activeShipment.trackingStatus !== TrackingStatus.PRE_TRANSIT) {
          continue
        }

        await prisma.$transaction(async (tx) => {
          //Re-fetch to ensure we have latest data
          const orderToReview = await tx.order.findUnique({
            where: { id: order.id },
            include: {
              shipments: true,
              shippingMethod: true,
            },
          })

          if (!orderToReview || orderToReview.status === ProcessStatus.IN_REVIEW || orderToReview.status !== ProcessStatus.PENDING) {
            return
          }

          const shipment = getActiveShipment(orderToReview)
          if (shipment.trackingStatus !== TrackingStatus.UNKNOWN &&
              shipment.trackingStatus !== TrackingStatus.PRE_TRANSIT) {
            return
          }

          //Update order status to IN_REVIEW
          await tx.order.update({
            where: { id: orderToReview.id },
            data: {
              status: ProcessStatus.IN_REVIEW,
            },
          })

          console.log(`Updated order ${orderToReview.id} to IN_REVIEW (7-day review)`)
        })
      } catch (err) {
        console.error(`Failed to review order ${order.id}:`, err)
      }
    }

    //Process Condition 2: 14-day review
    for (const order of orders14Days) {
      try {
        const activeShipment = getActiveShipment(order)

        //Verify the active shipment matches the condition
        if (activeShipment.trackingStatus === TrackingStatus.DELIVERED) {
          continue
        }

        await prisma.$transaction(async (tx) => {
          //Re-fetch to ensure we have latest data
          const orderToReview = await tx.order.findUnique({
            where: { id: order.id },
            include: {
              shipments: true,
              shippingMethod: true,
            },
          })

          if (!orderToReview || orderToReview.status === ProcessStatus.IN_REVIEW || orderToReview.status === ProcessStatus.COMPLETED) {
            return
          }

          const shipment = getActiveShipment(orderToReview)
          if (shipment.trackingStatus === TrackingStatus.DELIVERED) {
            return
          }

          //Update order status to IN_REVIEW
          await tx.order.update({
            where: { id: orderToReview.id },
            data: {
              status: ProcessStatus.IN_REVIEW,
            },
          })

          console.log(`Updated order ${orderToReview.id} to IN_REVIEW (14-day review)`)
        })
      } catch (err) {
        console.error(`Failed to review order ${order.id}:`, err)
      }
    }

    //Process Condition 3: 10-day review for orders with PENDING refunds
    for (const order of orders10Days) {
      try {
        await prisma.$transaction(async (tx) => {
          //Re-fetch to ensure we have latest data
          const orderToReview = await tx.order.findUnique({
            where: { id: order.id },
            include: {
              refund: true,
            },
          })

          if (!orderToReview || orderToReview.status === ProcessStatus.IN_REVIEW) {
            return
          }

          //Verify refund still exists and is PENDING
          if (!orderToReview.refund || orderToReview.refund.status !== RefundStatus.PENDING) {
            return
          }

          //Update order status to IN_REVIEW
          await tx.order.update({
            where: { id: orderToReview.id },
            data: {
              status: ProcessStatus.IN_REVIEW,
            },
          })

          console.log(`Updated order ${orderToReview.id} to IN_REVIEW (10-day review - pending refund)`)
        })
      } catch (err) {
        console.error(`Failed to review order ${order.id}:`, err)
      }
    }
  } catch (error) {
    console.error('Error in reviewOrder cron job:', error)
    throw error
  }
}
