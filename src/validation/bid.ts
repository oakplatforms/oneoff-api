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

export const validateConditions = async (conditions: {id: string}[]) => {
  if (!conditions || conditions.length === 0) {
    return
  }

  const conditionIds = conditions.map(c => c.id)
  const existingConditions = await prisma.condition.findMany({
    where: { id: { in: conditionIds } },
    select: { id: true }
  })

  if (existingConditions.length !== conditionIds.length) {
    throw new Error('One or more condition IDs are invalid or do not exist')
  }
}