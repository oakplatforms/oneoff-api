import { Prisma } from '@prisma/client'
import express from 'express'
import { generatePrismaError } from '../utils/prismaHelpers'
import { createInvoiceWithTransactions } from '../services/invoice'
import { validateListingOrderSummary } from '../validation/invoice'
import { validateCustomer } from '../validation/customer'

export const invoiceRouter = express.Router()

/**
 * @openapi
 * /invoice:
 *   post:
 *     tags:
 *       - Invoice
 *     summary: Create invoice for Buy Now listings
 *     description: Creates an invoice based on the listings in the order summary (Buy Now flow).
 *     parameters:
 *       - in: path
 *         name: marketplaceName
 *         required: true
 *         schema:
 *           type: string
 *         description: The name of the marketplace where the purchase is being made.
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               orderSummary:
 *                 type: object
 *                 description: Summary of the order including listing IDs, quantities, pricing, etc.
 *                 example:
 *                   buyerId: "acc_123"
 *                   items:
 *                     - listingId: "lst_456"
 *                       quantity: 1
 *     responses:
 *       '200':
 *         description: Invoice successfully created.
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Invoice'
 *       '400':
 *         description: Bad request. The order summary might be invalid.
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 errorMessage:
 *                   type: string
 *                   example: Invalid order summary.
 *       '500':
 *         description: Internal server error during invoice creation.
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 errorMessage:
 *                   type: string
 *                   example: There was an error while creating your invoice.
 */
invoiceRouter.post('/invoice', async (req, res) => {
  const { orderSummary } = req.body

  try {
    await validateCustomer(orderSummary[0]?.createdById)
    await validateListingOrderSummary(orderSummary)

    const invoice = await createInvoiceWithTransactions(orderSummary)
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