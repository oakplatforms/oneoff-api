import { PrismaClient } from '@prisma/client'

const prisma = new PrismaClient()

export const validateCartAccount = async (accountId: string, isPrimary: boolean) => {
  const existingCart = await prisma.cart.findFirst({
    where: { accountId, isPrimary: true },
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
