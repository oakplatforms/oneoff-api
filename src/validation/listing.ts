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

export const validateConditionId = async (conditionId?: string) => {
  if (!conditionId) {
    return
  }

  const condition = await prisma.condition.findUnique({
    where: { id: conditionId },
    select: { id: true }
  })

  if (!condition) {
    throw new Error('Condition ID is invalid or does not exist')
  }
}