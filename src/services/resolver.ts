import { Prisma } from '@prisma/client'
import { getPrismaClient } from '../utils/prismaHelpers'

const prisma = getPrismaClient()

export const resolveListings = async (bid: Prisma.BidWhereInput) => {
  try {
    const listings = await prisma.listing.findMany({
      where: {
        productId: bid.productId as string,
        status: 'ACTIVE',
        price: {
          lte: bid.price as string,
        },
        quantity: {
          gt: 0,
        },
        profileId: {
          not: bid.profileId as string,
        },
      },
      take: 100,
    })
    return listings
  } catch (error) {
    throw error
  }
}

export const resolveBids = async (listing: Prisma.ListingWhereInput) => {
  try {
    const bids = await prisma.bid.findMany({
      where: {
        productId: listing.productId as string,
        status: 'ACTIVE',
        price: {
          gte: listing.price as string,
        },
        quantity: {
          gt: 0,
        },
        profileId: {
          not: listing.profileId as string,
        },
      },
      take: 100,
    })
    return bids
  } catch (error) {
    throw error
  }
}
