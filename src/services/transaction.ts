import { Prisma } from '@prisma/client'
import { getPrismaClient } from '../utils/prismaHelpers'

const prisma = getPrismaClient()

export const createBidTransactions = async (bid: Prisma.BidWhereInput, listings: Prisma.ListingWhereInput[]) => {
  let remainingQuantity = bid.quantity as number
  for (const listing of listings) {
    if (remainingQuantity === 0) break
    const quantityToUse = Math.min(remainingQuantity, listing.quantity as number)
    const subTotal = quantityToUse * (listing.amount as number)

    if (listing.quantity as number <= remainingQuantity || listing.quantity! as number > remainingQuantity && listing.multiTransactionsEnabled) {
      try {
        await prisma.transaction.create({
          data: {
            subTotal: subTotal,
            total: subTotal,
            status: 'PENDING',
            bid: { connect: { id: bid.id as string }},
            listing: { connect: { id: listing.id as string} }
          },
        })
        await prisma.listing.update({
          where: { id: listing.id as string },
          data: {
            quantity: listing.quantity as number - quantityToUse
          }
        })
      } catch (error) {
        throw error
      }
      remainingQuantity -= quantityToUse
    }
  }

  if (bid.quantity !== remainingQuantity) {
    try {
      await prisma.bid.update({
        where: { id: bid.id as string },
        data: {
          quantity: remainingQuantity
        }
      })
    } catch (error) {
      throw error
    }
  }
}

export const createListingTransactions = async (listing: Prisma.ListingWhereInput, bids: Prisma.BidWhereInput[]) => {
  let remainingQuantity = listing.quantity as number
  for (const bid of bids) {
    if (remainingQuantity === 0) break
    const quantityToUse = Math.min(remainingQuantity, bid.quantity as number)
    const subTotal = quantityToUse * (bid.amount as number)

    if (bid.quantity as number <= remainingQuantity || bid.quantity! as number > remainingQuantity && bid.multiTransactionsEnabled) {
      try {
        await prisma.transaction.create({
          data: {
            subTotal: subTotal,
            total: subTotal,
            status: 'PENDING',
            bid: { connect: { id: bid.id as string }},
            listing: { connect: { id: listing.id as string} }
          },
        })
        await prisma.bid.update({
          where: { id: bid.id as string },
          data: {
            quantity: bid.quantity as number - quantityToUse
          }
        })
      } catch (error) {
        throw error
      }
      remainingQuantity -= quantityToUse
    }
  }

  if (listing.quantity !== remainingQuantity) {
    try {
      await prisma.listing.update({
        where: { id: listing.id as string },
        data: {
          quantity: remainingQuantity
        }
      })
    } catch (error) {
      throw error
    }
  }
}