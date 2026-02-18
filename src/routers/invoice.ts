import { Prisma } from '@prisma/client'
import express from 'express'
import { generatePrismaError, prismaClient } from '../utils/prismaHelpers'
import { createInvoiceWithTransactions } from '../services/invoice'
import { validateOrdersForInvoice } from '../validation/invoice'
import { generateIncludes } from '../utils/generateIncludes'
import { validateAccount, AuthenticatedUser } from '../validation/user'
export const invoiceRouter = express.Router()

const prisma = prismaClient()
/**
 * @openapi
 * /invoice/{id}:
 *   get:
 *     tags:
 *       - Invoice
 *     summary: Get invoice by ID
 *     description: Retrieves an invoice by its unique identifier.
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *         description: The unique identifier of the invoice.
 *       - in: query
 *         name: include
 *         required: false
 *         schema:
 *           type: string
 *         description: Comma-separated list of related entities to include in the response.
 *     responses:
 *       '200':
 *         description: Invoice successfully retrieved.
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Invoice'
 *       '404':
 *         description: Invoice not found.
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 errorMessage:
 *                   type: string
 *                   example: No invoice ID found
 */
invoiceRouter.get('/invoice/:id', async (req, res) => {
  const { id } = req.params
  const { include } = req.query

  try {
    if (!id) {
      throw new Error('Invoice ID is required')
    }
    const invoice = await prisma.invoice.findUnique({
      where: { id },
      include: generateIncludes(include as string),
    })

    if (invoice) {
      res.json(invoice)
    } else {
      throw new Error('No invoice ID found')
    }
  } catch (error) {
    const { statusCode, prismaError, customError } = generatePrismaError(error as Prisma.PrismaClientKnownRequestError)
    console.error('GET_INVOICE_ERROR:', prismaError || customError)
    res.status(statusCode).send({ errorMessage: customError || 'Failed to retrieve invoice.' })
  }
})

/**
 * @openapi
 * /invoice:
 *   post:
 *     tags:
 *       - Invoice
 *     summary: Create invoice for Buy Now listings
 *     description: Creates an invoice based on the listings in the order summary (Buy Now flow).
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
  const { orderIds, accountId } = req.body

  try {
    if (!orderIds || !Array.isArray(orderIds) || orderIds.length === 0) {
      throw new Error('Missing or invalid orderIds in request body.')
    }
    await validateAccount(req.user as AuthenticatedUser, accountId, 'customer')
    await validateOrdersForInvoice(orderIds)
    const invoice = await createInvoiceWithTransactions(orderIds)
    if (invoice) {
      res.json(invoice)
    } else {
      throw new Error('There was an error while creating your invoice')
    }
  } catch (error) {
    const { statusCode, prismaError, customError } = generatePrismaError(error as Prisma.PrismaClientKnownRequestError)
    console.error('CREATE_INVOICE_ERROR:', prismaError || customError)
    res.status(statusCode).send({ errorMessage: customError || 'Failed to create invoice.' })
  }
})
