import { getPrismaClient } from '../utils/prismaHelpers'

const prisma = getPrismaClient()

export const validateCustomer = async (accountId?: string) => {
  if (!accountId) {
    throw new Error('createdById is required')
  }
  const account = await prisma.account.findUnique({
    where: { id: accountId },
    include: {
      customer: true,
    },
  })
  if (!account) {
    throw new Error('Account does not exist')
  }
  if (account.type !== 'CUSTOMER' && account.type !== 'SELLER') {
    throw new Error('Account type must be either CUSTOMER or SELLER')
  }
  if (!account.customer) {
    throw new Error('Account does not have an associated customer')
  }
  if (!account.customer.hasPaymentMethod) {
    throw new Error('The customer does not have an associated payment method')
  }
}