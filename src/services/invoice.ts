import { Order } from '@prisma/client'
import { prismaClient } from '../utils/prismaHelpers'
import stripe from '../utils/stripe'
import Stripe from 'stripe'

const prisma = prismaClient()

export type OrderDetails = {
  listingIds?: string[],
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

  const totalAmount = Math.round(total * 100)

  //Fixed application fee: $0.60 (includes $0.50 transaction fee + 10% seller commission)
  const application_fee_amount = 60

  const paymentIntent = await stripe.paymentIntents.create({
    amount: totalAmount,
    currency: 'usd',
    customer: customerId,
    payment_method: paymentMethodId as string,
    confirm: true,
    description: `Charged by seller ${order?.seller?.firstName ?? ''} ${order?.seller?.lastName ?? ''}`,
    transfer_data: {
      destination: sellerId,
    },
    application_fee_amount,
    automatic_payment_methods: {
      enabled: true,
      allow_redirects: 'never',
    },
  })

  return { success: true, paymentIntent }
}

export const createInvoiceWithTransactions = async (orderIds: string[]) => {
  const { invoice, orders } = await prisma.$transaction(async (tx) => {
    const invoice = await tx.invoice.create({ data: {} })

    const orders = await tx.order.findMany({
      where: { id: { in: orderIds } },
      include: {
        customer: { include: { account: true } },
        seller: true,
        orderListings: {
          include: {
            listing: true,
          },
        },
      },
    })

    for (const order of orders) {
      if (!order || !order.subTotal || !order.customerId || !order.sellerId) {
        throw new Error(`Order data missing required fields.`)
      }

      const orderListings = order.orderListings
      const transactionFee = 0.50
      const total = Number(order.subTotal || 0) + transactionFee

      for (const orderListing of orderListings) {
        const listing = orderListing.listing
        const quantityInOrder = orderListing.quantity || 0

        if (!listing) {
          throw new Error(`Listing not found.`)
        }

        if (listing.quantity !== null && listing.quantity !== undefined) {
          const newQuantity = listing.quantity - quantityInOrder

          if (newQuantity < 0) {
            throw new Error(`Insufficient quantity for listing ${listing.id}.`)
          }

          await tx.listing.update({
            where: { id: listing.id },
            data: {
              quantity: newQuantity,
            },
          })
        }
      }

      const updatedOrder = await tx.order.update({
        where: { id: order.id },
        data: {
          status: 'COMPLETED',
          invoiceId: invoice.id,
          transactionFee,
          total,
          transactions: {
            create: [{
              amount: total,
              accountId: order?.customer?.accountId
            }],
          },
        },
        include: {
          customer: { omit: { paymentAccountId: false } },
          seller: { omit: { paymentAccountId: false } },
        },
      })

      const { paymentIntent } = await createPaymentIntent(updatedOrder as OrderWithRelations)

      await tx.order.update({
        where: { id: order.id },
        data: {
          paymentIntentId: paymentIntent.id,
        },
      })
    }

    await tx.invoice.deleteMany({
      where: { id: invoice.id, orders: { none: {} } },
    })

    return { invoice, orders }
  }, { timeout: 60000 })

  //Email notifications will be added in the future
  console.log(`Invoice ${invoice.id} created with ${orders.length} orders`)

  return invoice
}
