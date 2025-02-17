import { Prisma } from '@prisma/client'
import express from 'express'
import { generatePrismaError } from '../utils/prismaHelpers'
import { createInvoiceBasedOnListingsInOrderSummary, createInvoiceBasedOnBidsInOrderSummary } from '../services/invoice'
import { validateOrderSummary } from '../validation/invoice'

export const invoiceRouter = express.Router()

invoiceRouter.post('/:marketplaceName/buy-now', async (req, res) => {
  const { orderSummary } = req.body

  try {
    await validateOrderSummary(orderSummary, 'LISTING')
    const invoice = await createInvoiceBasedOnListingsInOrderSummary(orderSummary)
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

invoiceRouter.post('/:marketplaceName/sell-now', async (req, res) => {
  const { orderSummary } = req.body

  try {
    await validateOrderSummary(orderSummary, 'BID')
    const invoice = await createInvoiceBasedOnBidsInOrderSummary(orderSummary)
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
