import { Prisma } from '@prisma/client'
import { getPrismaClient } from '../utils/prismaHelpers'

const prisma = getPrismaClient()

export const createBidInvoiceByResolvedListings = async (bid: Prisma.BidWhereInput, listings: Prisma.ListingWhereInput[]) => {
  let remainingQuantity = bid.quantity as number
  try {
    // create empty invoice
    const invoice = await prisma.invoice.create({
      data: {},
    })

    for (const listing of listings) {
      if (remainingQuantity === 0) break
      const quantityToUse = Math.min(remainingQuantity, listing.quantity as number)
      const subTotal = quantityToUse * (bid.price as number)

      if  (bid.profile?.accountId && listing.profile?.accountId) {
        if (listing.quantity as number <= remainingQuantity || listing.quantity! as number > remainingQuantity && listing.multiTransactionsEnabled) {
          try {
            await prisma.order.create({
              data: {
                subTotal: subTotal,
                total: subTotal,
                status: 'PENDING',
                invoiceId: invoice.id,
                createdById: bid.profile.accountId as string,
                purchasedById: bid.profile.accountId as string,
                soldById: listing.profile?.accountId as string,
                transactions: {
                  create: [{
                    amount: subTotal,
                    status: "PENDING",
                    bidId: bid.id as string,
                    listingId: listing.id as string,
                  }]
                }
              },
            })
            await prisma.listing.update({
              where: { id: listing.id as string },
              data: {
                quantity: listing.quantity as number - quantityToUse,
                status: (listing.quantity as number - quantityToUse) > 0 ? 'ACTIVE' : 'INACTIVE',
              }
            })
          } catch (error) {
            throw error
          }
          remainingQuantity -= quantityToUse
        }
      }
    }

    if (bid.quantity !== remainingQuantity) {
      try {
        await prisma.bid.update({
          where: { id: bid.id as string },
          data: {
            quantity: remainingQuantity,
            status: remainingQuantity > 0 ? 'ACTIVE' : 'INACTIVE',
          }
        })
      } catch (error) {
        throw error
      }
    }
    // delete invoice if it is still empty
    await prisma.invoice.deleteMany({
      where: {
        id: invoice.id,
        orders: { none: {} }
      }
    })
  } catch (error) {
    throw error
  }
}

export const createListingInvoiceByResolvedBids = async (listing: Prisma.ListingWhereInput, bids: Prisma.BidWhereInput[]) => {
  let remainingQuantity = listing.quantity as number
  try {
    // create empty invoice
    const invoice = await prisma.invoice.create({
      data: {},
    })
    for (const bid of bids) {
      if (remainingQuantity === 0) break
      const quantityToUse = Math.min(remainingQuantity, bid.quantity as number)
      const subTotal = quantityToUse * (listing.price as number)

      if  (bid.profile?.accountId && listing.profile?.accountId) {
        if (bid.quantity as number <= remainingQuantity || bid.quantity! as number > remainingQuantity && bid.multiTransactionsEnabled) {
          try {
            await prisma.order.create({
              data: {
                subTotal: subTotal,
                total: subTotal,
                status: 'PENDING',
                invoiceId: invoice.id,
                createdById: listing.profile.accountId as string,
                purchasedById: bid.profile.accountId as string,
                soldById: listing.profile?.accountId as string,
                transactions: {
                  create: [{
                    amount: subTotal,
                    status: "PENDING",
                    bidId: bid.id as string,
                    listingId: listing.id as string,
                  }]
                }
              },
            })
            await prisma.bid.update({
              where: { id: bid.id as string },
              data: {
                quantity: bid.quantity as number - quantityToUse,
                status: (bid.quantity as number - quantityToUse) > 0 ? 'ACTIVE' : 'INACTIVE',
              }
            })
          } catch (error) {
            throw error
          }
          remainingQuantity -= quantityToUse
        }
      }
    }

    if (listing.quantity !== remainingQuantity) {
      try {
        await prisma.listing.update({
          where: { id: listing.id as string },
          data: {
            quantity: remainingQuantity,
            status: remainingQuantity > 0 ? 'ACTIVE' : 'INACTIVE',
          }
        })
      } catch (error) {
        throw error
      }
    }
    // delete invoice if it is still empty
    await prisma.invoice.deleteMany({
      where: {
        id: invoice.id,
        orders: { none: {} }
      }
    })
  } catch (error) {
    throw error
  }
}