import { Prisma } from '@prisma/client'
import express from 'express'
import { generateIncludes } from '../utils/generateIncludes'
import { getPrismaClient, generatePrismaError } from '../utils/prismaHelpers'

const prisma = getPrismaClient()
export const invoiceRouter = express.Router()

/**
 * @openapi
 * /{marketplaceName}/invoice/{id}:
 *   get:
 *     tags:
 *       - Invoice
 *     summary: Retrieve a specific invoice by ID.
 *     description: Fetches the details of an invoice by its unique ID. You can optionally include related entities using the `include` query parameter.
 *     parameters:
 *       - in: path
 *         name: marketplaceName
 *         required: true
 *         schema:
 *           type: string
 *         description: The name of the marketplace to retrieve the invoice from.
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *         description: The unique ID of the invoice to retrieve.
 *       - in: query
 *         name: include
 *         schema:
 *           type: string
 *         description: Comma-separated list of related entities to include in the invoice data (e.g., 'order,customer').
 *     responses:
 *       '200':
 *         description: Successfully retrieved the invoice.
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Invoice'
 *       '400':
 *         description: Bad request, typically due to invalid parameters or if the invoice ID is not found.
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 errorMessage:
 *                   type: string
 *                   description: Description of the error that occurred.
 *       '500':
 *         description: Internal Server Error. An error occurred while processing the request.
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 errorMessage:
 *                   type: string
 *                   description: Description of the error that occurred.
 */

invoiceRouter.get('/:marketplaceName/invoice/:id', async (req, res) => {
  const { id } = req.params
  const { include } = req.query

  try {
    const invoice = await prisma.invoice.findUnique({
      where: { id },
      include: generateIncludes(include)
    })
  
    if (invoice) {
      res.json(invoice)
    } else {
      res.status(400).json({ errorMessage: 'Something went wrong: No invoice ID found' })
    }
  } catch (error) {
    console.log('error')
    const { statusCode, errorMessage } = generatePrismaError(error as Prisma.PrismaClientKnownRequestError)
    res.status(statusCode).send({ errorMessage })
  }
})
