import { getPrismaClient } from '../utils/prismaHelpers'

const prisma = getPrismaClient()

export const validateExistingBid = async (bidId: string) => {
  const existingBid = await prisma.bid.findUnique({
    where: { id: bidId },
  })
  if (!existingBid) {
    throw new Error('Bid does not exist')
  }
}