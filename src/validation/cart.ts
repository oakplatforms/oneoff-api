import { PrismaClient, Status } from '@prisma/client'

const prisma = new PrismaClient()

export const validateCartAccount = async (accountId: string, status: Status) => {
  const existingCart = await prisma.cart.findFirst({
    where: { accountId, status: 'ACTIVE' },
  })

  if (existingCart && status === 'ACTIVE') {
    throw new Error('Account already has an active cart.')
  }
}

export const validateCart = async (id: string) => {
  const activeCart = await prisma.cart.findUnique({
    where: { id, status: 'ACTIVE' },
  })

  if (!activeCart) {
    throw new Error('There is no active cart with this id.')
  }
}
