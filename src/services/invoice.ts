import { Order } from '@prisma/client'
import { getPrismaClient } from '../utils/prismaHelpers'
import stripe from '../utils/stripe'
import Stripe from 'stripe'
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
          },
        },
      },
    })

    for (const order of orders) {
      if (!order || !order.subTotal || !order.customerId || !order.sellerId) {
        throw new Error(`Order data missing required fields.`)
      }

      for (const orderListing of order.orderListings) {
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
              amount: Number(order.subTotal) + Number(order.shipments[0]?.rate),
              accountId: order?.customer?.accountId
            }],
          },
        },
        include: {
          customer: true,
          seller: true,
        },
      })

      await createPaymentIntent(pendingOrder as OrderWithRelations)
    }

    await prisma.invoice.deleteMany({
      where: {
        id: invoice.id,
        orders: { none: {} },
      },
    })

    return invoice
  })
}
