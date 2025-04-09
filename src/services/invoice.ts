import { Order } from '@prisma/client'
import { getPrismaClient } from '../utils/prismaHelpers'
import stripe from '../utils/stripe'
import Stripe from 'stripe'
const prisma = getPrismaClient()

export type OrderDetails = {
  listingIds?: string[],
  bidIds?: string[],
  createdById: string,
  purchasedById: string,
  soldById: string,
}

type OrderWithRelations = Order & {
  purchasedBy: { customer: { paymentAccountId: string | null } | null } | null
  soldBy: { seller: { paymentAccountId: string | null, firstName?: string, lastName?: string } | null } | null
}

const createPaymentIntent = async (
  order: OrderWithRelations
) => {
  const customerId = order?.purchasedBy?.customer?.paymentAccountId
  const sellerId = order?.soldBy?.seller?.paymentAccountId

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
    description: `Charged by seller ${order?.soldBy?.seller?.firstName ?? ''} ${order?.soldBy?.seller?.lastName ?? ''}`,
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

export const createInvoiceBasedOnBidsInOrderSummary = async (orderSummary: OrderDetails[]) => {
  return prisma.$transaction(async (prisma) => {
    //Create empty invoice
    const invoice = await prisma.invoice.create({
      data: {},
    })

    for (const orderDetails of orderSummary) {
      const uniqueBidIds = orderDetails.bidIds
        ?.filter((id, index, self) => self.indexOf(id) === index)
        .map((id) => ({
          id,
          quantityInOrder: orderDetails.bidIds?.filter((bidId) => bidId === id).length || 0,
        })) || []

      const bidsInOrder = await prisma.bid.findMany({
        where: { id: { in: uniqueBidIds.map(({ id }) => id) } },
      })

      const bidsInOrderWithQuantity = uniqueBidIds.map(({ id: uniqueBidId, quantityInOrder }) => {
        const selectedBid = bidsInOrder.find((bidInOrder) => bidInOrder.id === uniqueBidId)
        return { ...selectedBid, quantityInOrder }
      })

      const subTotal = bidsInOrderWithQuantity?.reduce((total, bid) => {
        if (bid?.price && bid.quantityInOrder) {
          return total + (Number(bid.price) * bid.quantityInOrder)
        } else {
          throw new Error(`Order failed: Issue with calculating subtotal`)
        }
      }, 0) || 0

      const order = await prisma.order.create({
        data: {
          subTotal,
          total: subTotal,
          status: 'PENDING',
          invoiceId: invoice.id,
          createdById: orderDetails.createdById as string,
          purchasedById: orderDetails.purchasedById as string,
          soldById: orderDetails.soldById as string,
          orderBids: uniqueBidIds?.length
            ? {
              create: uniqueBidIds.map(({ id }) => ({
                bidId: id as string,
              })),
            }
            : undefined,
          transactions: {
            create: [{
              amount: subTotal,
              accountId: orderDetails.createdById as string,
            }],
          },
        },
        include: {
          purchasedBy: {
            include: {
              customer: true
            },
          },
          soldBy: {
            include: {
              seller: true
            },
          },
        },
      })

      await createPaymentIntent(order as OrderWithRelations)

      for (const { id, multiTransactionsEnabled, quantity: bidQuantity, quantityInOrder } of bidsInOrderWithQuantity) {
        const remainingQuantity = bidQuantity && (bidQuantity - quantityInOrder)
        if (remainingQuantity !== undefined) {
          if (remainingQuantity < 0) {
            throw new Error(`Order failed: Insufficient quantity for bid ${id}.`)
          }
          if (!multiTransactionsEnabled && bidQuantity !== quantityInOrder) {
            throw new Error('Order failed: You must purchase all items for single seller bids.')
          }
          await prisma.bid.update({
            where: { id },
            data: {
              quantity: remainingQuantity,
              status: remainingQuantity === 0 ? 'INACTIVE' : 'ACTIVE',
            },
          })
        }
      }
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

export const createInvoiceBasedOnListingsInOrderSummary = async (orderSummary: OrderDetails[]) => {
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

      const order = await prisma.order.create({
        data: {
          subTotal,
          total: subTotal,
          status: 'PENDING',
          invoiceId: invoice.id,
          createdById: orderDetails.createdById as string,
          purchasedById: orderDetails.purchasedById as string,
          soldById: orderDetails.soldById as string,
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
              accountId: orderDetails.createdById as string
            }],
          },
        },
        include: {
          purchasedBy: {
            include: {
              customer: true
            },
          },
          soldBy: {
            include: {
              seller: true
            },
          },
        },
      })

      await createPaymentIntent(order as OrderWithRelations)
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
