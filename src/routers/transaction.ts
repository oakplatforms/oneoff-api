import { Prisma, TransactionStatus } from '@prisma/client'
import express from 'express'
import { generateIncludes } from '../utils/generateIncludes'
import { getPrismaClient, generatePrismaError } from '../utils/prismaHelpers'

const prisma = getPrismaClient()
export const transactionRouter = express.Router()

/**
 * @openapi
 * /{marketplaceName}/transactions:
 *   get:
 *     tags:
 *       - Transaction
 *     summary: Retrieve a list of transactions.
 *     description: Fetches a list of transactions based on optional query parameters. You can filter transactions by status, listing ID, bid ID, or order ID and optionally include related entities.
 *     parameters:
 *       - in: path
 *         name: marketplaceName
 *         required: true
 *         schema:
 *           type: string
 *         description: The name of the marketplace to retrieve transactions from.
 *       - in: query
 *         name: status
 *         schema:
 *           type: string
 *           enum: [PENDING, COMPLETED, FAILED, CANCELED]
 *         description: Filter transactions by status.
 *       - in: query
 *         name: listingId
 *         schema:
 *           type: string
 *         description: Filter transactions by listing ID.
 *       - in: query
 *         name: bidId
 *         schema:
 *           type: string
 *         description: Filter transactions by bid ID.
 *       - in: query
 *         name: orderId
 *         schema:
 *           type: string
 *         description: Filter transactions by order ID.
 *       - in: query
 *         name: include
 *         schema:
 *           type: string
 *         description: Comma-separated list of related entities to include in the transaction data (e.g., 'bid,listing').
 *     responses:
 *       '200':
 *         description: Successfully retrieved the transactions.
 *         content:
 *           application/json:
 *             schema:
 *               type: array
 *               items:
 *                 $ref: '#/components/schemas/Transaction'
 *       '400':
 *         description: Bad request, typically due to invalid query parameters.
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
transactionRouter.get('/:marketplaceName/transactions', async (req, res) => {
  const { include, status, orderId } = req.query

  try {
    const transactions = await prisma.transaction.findMany({
      where: {
        AND: [
          status ? { status: status as TransactionStatus } : {},
          orderId
            ? { orderId: orderId as string }
            : {}
        ]
      },
      include: generateIncludes(include)
    })
    res.json(transactions)
  } catch (error) {
    const { statusCode, errorMessage } = generatePrismaError(error as Prisma.PrismaClientKnownRequestError)
    res.status(statusCode).send({ errorMessage })
  }
})

/**
 * @openapi
 * /{marketplaceName}/transaction/{id}:
 *   get:
 *     tags:
 *       - Transaction
 *     summary: Retrieve a specific transaction by ID.
 *     description: Fetches the details of a transaction by its unique ID. You can optionally include related entities using the `include` query parameter.
 *     parameters:
 *       - in: path
 *         name: marketplaceName
 *         required: true
 *         schema:
 *           type: string
 *         description: The name of the marketplace to retrieve the transaction from.
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *         description: The unique ID of the transaction to retrieve.
 *       - in: query
 *         name: include
 *         schema:
 *           type: string
 *         description: Comma-separated list of related entities to include in the transaction data (e.g., 'bid,listing').
 *     responses:
 *       '200':
 *         description: Successfully retrieved the transaction.
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Transaction'
 *       '400':
 *         description: Bad request, typically due to invalid parameters or if the transaction ID is not found.
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
transactionRouter.get('/:marketplaceName/transaction/:id', async (req, res) => {
  const { id } = req.params
  const { include } = req.query

  try {
    const transaction = await prisma.transaction.findUnique({
      where: { id },
      include: generateIncludes(include)
    })
  
    if (transaction) {
      res.json(transaction)
    } else {
      throw new Error('No transaction ID found')
    }
  } catch (error) {
    const { statusCode, errorMessage } = generatePrismaError(error as Prisma.PrismaClientKnownRequestError)
    res.status(statusCode).send({ errorMessage })
  }
})
