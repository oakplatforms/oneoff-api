import { getPrismaClient } from '../utils/prismaHelpers'

const prisma = getPrismaClient()

export const validateExistingListing = async (listingId: string) => {
  const existingListing = await prisma.listing.findUnique({
    where: { id: listingId },
  })
  if (!existingListing) {
    throw new Error('Listing does not exist')
  }
}