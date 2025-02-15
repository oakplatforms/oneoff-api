import { getPrismaClient } from "../utils/prismaHelpers"
import { OrderInCart } from '../services/invoice'

const prisma = getPrismaClient()

export const validateOrdersInCart = async (ordersInCart: OrderInCart[]) => {
  for (const orderInCart of ordersInCart) {
    if (orderInCart?.createdById !== orderInCart?.purchasedById) {
      throw new Error('Invalid account relationship')
    }

    const account = await prisma.account.findUnique({
      where: { id: orderInCart?.createdById },
      include: { profile: true }
    })

    if (!account) {
      throw new Error('Account does not exist')
    }

    if (!orderInCart?.listings?.length) {
      throw new Error('Order must include at least one listing')
    }

    for (const listing of orderInCart.listings) {
      if (listing.profileId === account?.profile?.id) {
        throw new Error('Order cannot include listings that your profile created')
      }
    }
  }
}