import { Order } from '@prisma/client'
import { getPrismaClient } from '../utils/prismaHelpers'
import stripe from '../utils/stripe'
import Stripe from 'stripe'
import { calculateOrderAmount, OrderPayload } from '../utils/order'
import shippo from '../utils/shippo'
import eventBridge from '../utils/eventBridge'
import { PutEventsCommand } from '@aws-sdk/client-eventbridge'

const prisma = getPrismaClient()

export type OrderDetails = {
  listingIds?: string[],
  bidIds?: string[],
  accountId?: string,
  sellerId: string,
  customerId: string,
}

type OrderWithRelations = Order & {
 customer: { paymentAccountId: string | null } | null
 seller: { paymentAccountId: string | null, firstName?: string, lastName?: string } | null
}

const createPaymentIntent = async (
  order: OrderWithRelations
) => {
  const customerId = order?.customer?.paymentAccountId
  const sellerId = order?.seller?.paymentAccountId

  if (!customerId || !sellerId) {
    throw new Error('Order or seller payment id were not found.')
  }

  const customer = await stripe.customers.retrieve(customerId) as Stripe.Customer
  const paymentMethodId = customer.invoice_settings?.default_payment_method

  if (!paymentMethodId) {
    throw new Error('Customer has no default payment method.')
  }

  const total = Number(order.total)
  if (isNaN(total)) {
    throw new Error('Invalid price format.')
  }

  const paymentIntent = await stripe.paymentIntents.create({
    amount: Math.round(total * 100),
    currency: 'usd',
    customer: customerId,
    payment_method: paymentMethodId as string,
    confirm: true,
    description: `Charged by seller ${order?.seller?.firstName ?? ''} ${order?.seller?.lastName ?? ''}`,
    transfer_data: {
      destination: sellerId,
    },
    automatic_payment_methods: {
      enabled: true,
      allow_redirects: 'never',
    },
  })

  return { success: true, paymentIntent }
}

export const createInvoiceWithTransactions = async (orderIds: string[]) => {
  return prisma.$transaction(async (prisma) => {
    const invoice = await prisma.invoice.create({
      data: {},
    })

    const orders = await prisma.order.findMany({
      where: { id: { in: orderIds } },
      include: {
        customer: { include: { account: true } },
        seller: true,
        shipments: true,
        orderListings: {
          include: {
            listing: true,
            order: {
              include: {
                shippingMethod: {
                  include: { shippingOptions: true },
                },
                orderShippingOptions: {
                  include: { shippingOption: true },
                },
              },
            },
          },
        },
        shippingMethod: {
          include: { shippingOptions: true },
        },
        orderShippingOptions: {
          include: { shippingOption: true },
        },
      },
    })

    for (const order of orders) {
      if (!order || !order.subTotal || !order.customerId || !order.sellerId) {
        throw new Error(`Order data missing required fields.`)
      }

      const orderListings = order.orderListings
      const amount = calculateOrderAmount(order as OrderPayload, orderListings as OrderPayload['orderListings'])

      for (const orderListing of orderListings) {
        const listing = orderListing.listing
        const quantityInOrder = orderListing.quantity || 0

        if (!listing || listing.quantity === null || listing.quantity === undefined) {
          throw new Error(`Listing missing quantity.`)
        }

        const newQuantity = listing.quantity - quantityInOrder

        if (newQuantity < 0) {
          throw new Error(`Insufficient quantity for listing ${listing.id}.`)
        }

        await prisma.listing.update({
          where: { id: listing.id },
          data: {
            quantity: newQuantity,
            status: newQuantity === 0 ? 'INACTIVE' : 'ACTIVE',
          },
        })
      }

      const pendingOrder = await prisma.order.update({
        where: { id: order.id },
        data: {
          status: 'PENDING',
          invoiceId: invoice.id,
          transactions: {
            create: [{
              amount,
              accountId: order?.customer?.accountId
            }],
          },
        },
        include: {
          customer: true,
          shipments: true,
          seller: true,
        },
      })

      const shipmentRecord = pendingOrder.shipments.find(
        (s) => s.status === 'CREATED'
      )

      if (
        !shipmentRecord ||
        !shipmentRecord.externalShipmentId ||
        !shipmentRecord.externalShipmentRateId
      ) {
        throw new Error('Valid CREATED shipment with external rate not found')
      }

      const transaction = await shippo.transactions.create({
        rate: shipmentRecord.externalShipmentRateId,
        labelFileType: 'PDF',
        async: false,
      })

      const { trackingNumber, labelUrl, status: transactionStatus, messages } = transaction || {}

      if (transactionStatus !== 'SUCCESS') {
        throw new Error(`Shipment update failed: ${messages?.[0]?.text || 'Unknown error'}`)
      }

      await prisma.shipment.update({
        where: { id: shipmentRecord.id },
        data: {
          status: 'PENDING',
          trackingNumber,
          labelUrl,
        },
      })

      await createPaymentIntent(pendingOrder as OrderWithRelations)
      try {
        await eventBridge.send(new PutEventsCommand({
          Entries: [
            {
              Source: 'tcgx',
              DetailType: 'order.confirmation.seller',
              Detail: JSON.stringify({
                orderId: pendingOrder.id,
                type: 'order.confirmation.seller',
              }),
              EventBusName: 'default',
            },
          ],
        }))
      } catch (err) {
        throw new Error( `Seller email notification(s) failed: ${err}`)
      }
    }

    await prisma.invoice.deleteMany({
      where: {
        id: invoice.id,
        orders: { none: {} },
      },
    })

    try {
      await eventBridge.send(new PutEventsCommand({
        Entries: [
          {
            Source: 'tcgx',
            DetailType: 'invoice.confirmation.customer',
            Detail: JSON.stringify({
              invoiceId: invoice.id,
              type: 'invoice.confirmation.customer',
            }),
            EventBusName: 'default',
          },
        ],
      }))
    } catch (err) {
      throw new Error( `Customer Invoice notification failed: ${err}`)
    }

    return invoice
  }, { timeout: 60000 })
}
