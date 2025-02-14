import { Prisma } from '@prisma/client'
import express from 'express'
import { generatePrismaError, getPrismaClient } from '../utils/prismaHelpers'
import { createInvoiceBasedOnListingsInCart, OrderInCart  } from '../services/invoice'

const prisma = getPrismaClient()
export const invoiceRouter = express.Router()
invoiceRouter.post('/:marketplaceName/buy-now', async (req, res) => {
  const { ordersInCart } = req.body
  try {
    // orders validation
    ordersInCart.forEach(async (orderInCart: OrderInCart) => {
      if (orderInCart?.createdById !== orderInCart?.purchasedById) {
        res.status(400).json({ errorMessage: 'Invalid account relationship' })
      }

      const account = await prisma.account.findUnique({
        where: { id: orderInCart?.createdById },
        include: {
          profile: true
        }
      })

      if (!account) {
        res.status(400).json({ errorMessage: 'Account does not exist' })
      }

      if (orderInCart?.listings?.length) {
        orderInCart?.listings?.forEach(listing => {
          console.log('profileIds', listing.profileId, account?.profile?.id)
          if (listing.profileId === account?.profile?.id) {
            res.status(400).json({ errorMessage: 'Order cannot include listings that your profile created' })
          }
        })
      } else {
        res.status(400).json({ errorMessage: 'Order must include at least one listing' })
      }
    })

    const invoice = await createInvoiceBasedOnListingsInCart(ordersInCart)
    if (invoice) {
      res.json(invoice)
    } else {
      return res.status(400).json({ errorMessage: 'There was an error while creating your invoice' })
    }
  } catch (error) {
    const { statusCode, errorMessage } = generatePrismaError(error as Prisma.PrismaClientKnownRequestError)
    res.status(statusCode).send({ errorMessage })
  }
})
