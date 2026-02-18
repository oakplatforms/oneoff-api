import { prismaClient } from '../utils/prismaHelpers'

const prisma = prismaClient()

export const validateCartAccount = async (accountId: string, isPrimary: boolean) => {
  const existingCart = await prisma.cart.findFirst({
    where: { accountId },
  })

  if (existingCart && isPrimary) {
    throw new Error('Account already has a primary cart.')
  }
}

export const validateCart = async (id: string) => {
  const existingCart = await prisma.cart.findUnique({
    where: { id },
  })

  if (!existingCart) {
    throw new Error('There is no cart with this id.')
  }
}
