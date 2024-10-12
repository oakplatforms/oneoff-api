import { Prisma } from '@prisma/client'
import { getPrismaClient } from '../utils/prismaHelpers'

const prisma = getPrismaClient()

const findBestAvailableListing = (bid: Prisma.BidWhereInput, listings: Prisma.ListingWhereInput[]) => {
  const bestAvailableListings = listings
    .filter(listing => (listing.quantity! > bid.quantity! && listing.multiTransactionsEnabled || listing.quantity === bid.quantity) && listing.status === 'ACTIVE')
    .sort((a, b) => (b.amount as number) - (a.amount as number))

  return bestAvailableListings.length ? [bestAvailableListings[0]] : []
}

export const filterBestAvailableListings = (bid: Prisma.BidWhereInput, listings: Prisma.ListingWhereInput[]) => {
  return bid.multiTransactionsEnabled
    ? listings
        .filter(listing => listing.status === 'ACTIVE')
        .sort((a, b) => (b.amount as number) - (a.amount as number) || (a.createdAt as Date).getTime() - (b.createdAt as Date)?.getTime())
    : findBestAvailableListing(bid, listings)
}

export const resolveListings = async (bid: Prisma.BidWhereInput) => {
  try {
    const listings = await prisma.listing.findMany({
      where: {
        productId: bid.productId as string,
        status: 'ACTIVE',
        amount: {
          lte: bid.amount as string,
        },
        quantity: {
          gt: 0,
        },
      },
      take: 100,
    })
    return filterBestAvailableListings(bid, listings)
  } catch (error) {
    throw error
  }
}

const findBestAvailableBid = (listing: Prisma.ListingWhereInput, bids: Prisma.BidWhereInput[]) => {
  const bestAvailableBids = bids
    .filter(bid => (bid.quantity! > listing.quantity! && bid.multiTransactionsEnabled || bid.quantity === listing.quantity) && bid.status === 'ACTIVE')
    .sort((a, b) => (b.amount as number) - (a.amount as number))

  return bestAvailableBids.length ? [bestAvailableBids[0]] : []
}

const filterBestAvailableBids = (listing: Prisma.ListingWhereInput, bids: Prisma.BidWhereInput[]) => {
  return listing.multiTransactionsEnabled
    ? bids
        .filter(bid => bid.status === 'ACTIVE')
        .sort((a, b) => (b.amount as number) - (a.amount as number) || (a.createdAt as Date).getTime() - (b.createdAt as Date)?.getTime())
    : findBestAvailableBid(listing, bids)
}

export const resolveBids = async (listing: Prisma.ListingWhereInput) => {
  try {
    const bids = await prisma.bid.findMany({
      where: {
        productId: listing.productId as string,
        status: 'ACTIVE',
        amount: {
          gte: listing.amount as string,
        },
        quantity: {
          gt: 0,
        }
      },
      take: 100
    })
    return filterBestAvailableBids(listing, bids)
  } catch (error) {
    throw error
  }
}
