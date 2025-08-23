import { Prisma } from '@prisma/client'
import { getPrismaClient } from '../utils/prismaHelpers'

const prisma = getPrismaClient()

export const resolveListings = async (bid: Prisma.BidWhereInput) => {
  const listings = await prisma.listing.findMany({
    where: {
      AND: [
        { entityId: bid.entityId as string },
        { status: 'ACTIVE' },
        { price: { lte: bid.price as string } },
        { quantity: { gt: 0 } },
        {
          OR: [
            { isOffer: false },
            { isOffer: null }
          ]
        }
      ]
    },
    take: 100,
  })

  return listings
}
export const resolveBids = async (listing: Prisma.ListingWhereInput) => {
  const bids = await prisma.bid.findMany({
    where: {
      entityId: listing.entityId as string,
      status: 'ACTIVE',
      price: {
        gte: listing.price as string,
      },
      quantity: {
        gt: 0,
      },
    },
    take: 100,
  })
  return bids
}
