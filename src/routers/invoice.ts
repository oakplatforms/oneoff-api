import { Prisma } from '@prisma/client'
import express from 'express'
import { generatePrismaError } from '../utils/prismaHelpers'
import { createInvoiceBasedOnListingsInCart  } from '../services/invoice'
import { validateOrdersInCart } from '../validation/invoice'

export const invoiceRouter = express.Router()
invoiceRouter.post('/:marketplaceName/buy-now', async (req, res) => {
  const { ordersInCart } = req.body
  try {
    await validateOrdersInCart(ordersInCart)
    const invoice = await createInvoiceBasedOnListingsInCart(ordersInCart)
    if (invoice) {
      res.json(invoice)
    } else {
      throw new Error('There was an error while creating your invoice')
    }
  } catch (error) {
    const { statusCode, errorMessage } = generatePrismaError(error as Prisma.PrismaClientKnownRequestError)
    res.status(statusCode).send({ errorMessage })
  }
})
