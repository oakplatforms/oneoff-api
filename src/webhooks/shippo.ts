import { ProcessStatus, TrackingStatus, RefundType, RefundStatus, TransactionType } from '@prisma/client'
import { getPrismaClient } from '../utils/prismaHelpers'
import stripe from '../utils/stripe'
import eventBridge from '../utils/eventBridge'
import { PutEventsCommand } from '@aws-sdk/client-eventbridge'

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

    //If status changed to FAILURE or RETURNED, trigger automatic refund
    if ((mappedStatus === 'FAILURE' || mappedStatus === 'RETURNED') && shipment.orderId) {
      await handleAutomaticRefund(shipment.orderId, shipment.id, mappedStatus)
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

/**
 * Handles automatic refund when shipment tracking status is FAILURE or RETURNED
 * Updates order and shipment status, creates/updates refund, processes Stripe refund
 */
async function handleAutomaticRefund(orderId: string, shipmentId: string, trackingStatus: TrackingStatus) {
  try {
    await prisma.$transaction(async (tx) => {
      // Fetch order with all necessary relations
      const order = await tx.order.findUnique({
        where: { id: orderId },
        include: {
          seller: {
            include: {
              account: true,
            },
          },
          customer: {
            include: {
              account: true,
            },
          },
          refund: true,
        },
      })

      if (!order) {
        throw new Error(`Order ${orderId} not found`)
      }

      // Update shipment status to FAILED and trackingStatus
      await tx.shipment.update({
        where: { id: shipmentId },
        data: {
          status: ProcessStatus.FAILED,
          trackingStatus: trackingStatus,
        },
      })

      // Update order status to FAILED
      await tx.order.update({
        where: { id: orderId },
        data: {
          status: ProcessStatus.FAILED,
        },
      })

      console.log(`Updated Shipment ${shipmentId}: status → FAILED, trackingStatus → ${trackingStatus}`)
      console.log(`Updated Order ${orderId}: status → FAILED`)

      // Create automatic refund - customer never received order, so no existing refund request
      const refund = await tx.refund.create({
        data: {
          orderId: orderId,
          type: RefundType.OTHER,
          reason: trackingStatus === 'FAILURE' 
            ? 'Package was lost or delivery failed' 
            : 'Package was returned to seller',
          status: RefundStatus.ACCEPTED,
        },
      })
      console.log(`Created automatic refund ${refund.id} for order ${orderId}`)

      // Process Stripe refund if order has payment intent
      if (order.paymentIntentId) {
        // Validate seller has payment account
        const sellerPaymentAccountId = order.seller?.paymentAccountId
        if (!sellerPaymentAccountId) {
          console.warn(`Seller does not have a payment account configured for order ${orderId}. Skipping Stripe refund.`)
        } else {
          // Retrieve payment intent to get the amount
          const paymentIntent = await stripe.paymentIntents.retrieve(order.paymentIntentId)

          if (paymentIntent.status !== 'succeeded') {
            console.warn(`Payment intent status is ${paymentIntent.status}. Only succeeded payment intents can be refunded. Skipping Stripe refund for order ${orderId}.`)
          } else {
            // Check if payment intent has already been refunded
            const existingRefunds = await stripe.refunds.list({
              payment_intent: order.paymentIntentId,
              limit: 1,
            })
            if (existingRefunds.data.length > 0) {
              console.warn(`Payment intent has already been refunded for order ${orderId}. Skipping Stripe refund.`)
            } else {
              const refundAmount = paymentIntent.amount

              // Check Connect account balance to ensure seller has sufficient funds
              const balance = await stripe.balance.retrieve({
                stripeAccount: sellerPaymentAccountId,
              })

              // Calculate available balance (pending + available)
              const availableBalance = balance.available.reduce((sum, bal) => {
                if (bal.currency === 'usd') {
                  return sum + bal.amount
                }
                return sum
              }, 0)

              // Seller must refund the full amount the customer paid
              if (availableBalance < refundAmount) {
                console.warn(
                  `Insufficient funds in seller account for order ${orderId}. Required: $${(refundAmount / 100).toFixed(2)}, Available: $${(availableBalance / 100).toFixed(2)}. Skipping Stripe refund.`
                )
              } else {
                // Create Stripe refund with reverse_transfer
                await stripe.refunds.create({
                  payment_intent: order.paymentIntentId,
                  reverse_transfer: true,
                  metadata: {
                    orderId: orderId,
                    refundId: refund.id,
                    reason: refund.reason || (trackingStatus === 'FAILURE' ? 'Package was lost or delivery failed' : 'Package was returned to seller'),
                  },
                })

                console.log(`Created Stripe refund for order ${orderId}`)

                // Create Transaction record
                await tx.transaction.create({
                  data: {
                    orderId: orderId,
                    accountId: order.customer?.accountId,
                    amount: refundAmount / 100,
                    transactionType: TransactionType.REFUND,
                    description: `Automatic refund for order ${orderId} - ${trackingStatus === 'FAILURE' ? 'delivery failed' : 'returned to seller'}`,
                  },
                })

                console.log(`Created Transaction record for refund of order ${orderId}`)
              }
            }
          }
        }
      } else if (!order.paymentIntentId) {
        console.warn(`Order ${orderId} does not have a payment intent. Skipping Stripe refund.`)
      }
    }, { timeout: 60000 })

    // Send EventBridge notifications
    try {
      await Promise.all([
        eventBridge.send(new PutEventsCommand({
          Entries: [
            {
              Source: 'tcgx',
              DetailType: 'order.delivery.failed.customer',
              Detail: JSON.stringify({
                orderId: orderId,
                type: 'order.delivery.failed.customer',
                trackingStatus: trackingStatus,
              }),
              EventBusName: 'default',
            },
          ],
        })),
        eventBridge.send(new PutEventsCommand({
          Entries: [
            {
              Source: 'tcgx',
              DetailType: 'order.delivery.failed.seller',
              Detail: JSON.stringify({
                orderId: orderId,
                type: 'order.delivery.failed.seller',
                trackingStatus: trackingStatus,
              }),
              EventBusName: 'default',
            },
          ],
        })),
      ])
      console.log(`Sent EventBridge notifications for failed delivery of order ${orderId}`)
    } catch (err) {
      console.warn(`Failed to send EventBridge notifications for failed delivery of order ${orderId}:`, err)
    }
  } catch (err) {
    console.error(`Failed to process automatic refund for order ${orderId}:`, err)
    throw err
  }
}
