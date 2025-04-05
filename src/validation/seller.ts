import { getPrismaClient } from '../utils/prismaHelpers'

const prisma = getPrismaClient()

export const validateSeller = async (accountId?: string) => {
  if (!accountId) {
    throw new Error('createdById is required')
  }
  const account = await prisma.account.findUnique({
    where: { id: accountId },
    include: {
      seller: true,
    },
  })
  if (!account) {
    throw new Error('Account does not exist')
  }
  if (account.type !== 'SELLER') {
    throw new Error('Account type must be SELLER')
  }
  if (!account.seller) {
    throw new Error('Account does not have an associated seller')
  }
}