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

export const createInvoiceWithTransactions = async (orderSummary: OrderDetails[]) => {
  return prisma.$transaction(async (prisma) => {
    //Create empty invoice
    const invoice = await prisma.invoice.create({
      data: {},
    })

    for (const orderDetails of orderSummary) {
      const uniqueListingIds = orderDetails.listingIds
        ?.filter((id, index, self) => self.indexOf(id) === index)
        .map((id) => ({
          id,
          quantityInOrder: orderDetails.listingIds?.filter((listingId) => listingId === id).length || 0,
        })) || []

      const listingsInOrder = await prisma.listing.findMany({
        where: { id: { in: uniqueListingIds.map(({ id }) => id) } },
      })

      const listingsInOrderWithQuantity = uniqueListingIds.map(({ id: uniqueListingId, quantityInOrder }) => {
        const selectedListing = listingsInOrder.find((listingInOrder) => listingInOrder.id === uniqueListingId)
        return { ...selectedListing, quantityInOrder }
      })

      const subTotal = listingsInOrderWithQuantity?.reduce((total, listing) => {
        if (listing?.price && listing.quantityInOrder) {
          return total + (Number(listing.price) * listing.quantityInOrder)
        } else {
          throw new Error(`Order failed: Issue with calculating subtotal`)
        }
      }, 0) || 0

      for (const { id, multiTransactionsEnabled, quantity: listingQuantity, quantityInOrder } of listingsInOrderWithQuantity) {
        const remainingQuantity = listingQuantity && (listingQuantity - quantityInOrder)
        if (remainingQuantity !== undefined) {
          if (remainingQuantity < 0) {
            throw new Error(`Order failed: Insufficient quantity for listing ${id}.`)
          }
          if (!multiTransactionsEnabled && listingQuantity !== quantityInOrder) {
            throw new Error('Order failed: You must purchase all items for single seller listings.')
          }
          await prisma.listing.update({
            where: { id },
            data: {
              quantity: remainingQuantity,
              status: remainingQuantity === 0 ? 'INACTIVE' : 'ACTIVE',
            },
          })
        }
      }
      const order = await prisma.order.create({
        data: {
          subTotal,
          total: subTotal,
          status: 'PENDING',
          invoiceId: invoice.id,
          customerId: orderDetails.customerId as string,
          sellerId: orderDetails.sellerId as string,
          orderListings: uniqueListingIds?.length
            ? {
              create: uniqueListingIds.map(({ id }) => ({
                listingId: id as string,
              })),
            }
            : undefined,
          transactions: {
            create: [{
              amount: subTotal,
              accountId: orderDetails.accountId as string
            }],
          },
        },
        include: {
          customer: true,
          seller: true,
        },
      })
      await createPaymentIntent(order as OrderWithRelations)
    }

    //Delete invoice if it is still empty
    await prisma.invoice.deleteMany({
      where: {
        id: invoice.id,
        orders: { none: {} },
      },
    })

    return invoice
  })
}
