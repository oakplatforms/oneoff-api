
import { Prisma, ProcessStatus } from '@prisma/client'
import express from 'express'
import { generateIncludes } from '../utils/generateIncludes'
import { getPrismaClient, generatePrismaError } from '../utils/prismaHelpers'
import { createInvoiceBasedOnListingsInCart  } from '../services/invoice'

const prisma = getPrismaClient()
export const orderRouter = express.Router()

orderRouter.post('/:marketplaceName/orders/buy-now', async (req, res) => {
  const { ordersInCart } = req.body

    try {
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

/**
 * @openapi
 * /{marketplaceName}/orders:
 *   get:
 *     tags:
 *       - Order
 *     summary: Retrieve a list of orders.
 *     description: Fetches a list of orders based on optional query parameters. You can filter orders by status, createdById, purchasedById, or soldById and optionally include related entities.
 *     parameters:
 *       - in: path
 *         name: marketplaceName
 *         required: true
 *         schema:
 *           type: string
 *         description: The name of the marketplace to retrieve orders from.
 *       - in: query
 *         name: status
 *         schema:
 *           type: string
 *           enum: [PENDING, PROCESSING, COMPLETED, CANCELED]
 *         description: Filter orders by status.
 *       - in: query
 *         name: createdById
 *         schema:
 *           type: string
 *         description: Filter orders by the ID of the user who created the order.
 *       - in: query
 *         name: purchasedById
 *         schema:
 *           type: string
 *         description: Filter orders by the ID of the user who purchased the order.
 *       - in: query
 *         name: soldById
 *         schema:
 *           type: string
 *         description: Filter orders by the ID of the user who sold the order.
 *       - in: query
 *         name: include
 *         schema:
 *           type: string
 *         description: Comma-separated list of related entities to include in the order data (e.g., 'transactions,customer').
 *     responses:
 *       '200':
 *         description: Successfully retrieved the orders.
 *         content:
 *           application/json:
 *             schema:
 *               type: array
 *               items:
 *                 $ref: '#/components/schemas/Order'
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
orderRouter.get('/:marketplaceName/orders', async (req, res) => {
  const { include, status, createdById, purchasedById, soldById } = req.query

  try {
    const orders = await prisma.order.findMany({
      where: {
        AND: [
          status ? { status: status as ProcessStatus } : {},
          purchasedById && soldById
            ? { purchasedById: purchasedById as string, soldById: soldById as string, }
            : createdById
            ? { createdById: createdById as string }
            : purchasedById
            ? { purchasedById: purchasedById as string }
            : soldById
            ? { soldById: soldById as string }
            : {}
        ]
      },
      include: generateIncludes(include)
    })
    res.json(orders)
  } catch (error) {
    const { statusCode, errorMessage } = generatePrismaError(error as Prisma.PrismaClientKnownRequestError)
    res.status(statusCode).send({ errorMessage })
  }
})

/**
 * @openapi
 * /{marketplaceName}/order/{id}:
 *   get:
 *     tags:
 *       - Order
 *     summary: Retrieve a specific order by ID.
 *     description: Fetches the details of an order by its unique ID. You can optionally include related entities using the `include` query parameter.
 *     parameters:
 *       - in: path
 *         name: marketplaceName
 *         required: true
 *         schema:
 *           type: string
 *         description: The name of the marketplace to retrieve the order from.
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *         description: The unique ID of the order to retrieve.
 *       - in: query
 *         name: include
 *         schema:
 *           type: string
 *         description: Comma-separated list of related entities to include in the order data (e.g., 'transaction,customer').
 *     responses:
 *       '200':
 *         description: Successfully retrieved the order.
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Order'
 *       '400':
 *         description: Bad request, typically due to invalid parameters or if the order ID is not found.
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
orderRouter.get('/:marketplaceName/order/:id', async (req, res) => {
  const { id } = req.params
  const { include } = req.query

  try {
    const order = await prisma.order.findUnique({
      where: { id },
      include: generateIncludes(include)
    })
  
    if (order) {
      res.json(order)
    } else {
      res.status(400).json({ errorMessage: 'Something went wrong: No order ID found' })
    }
  } catch (error) {
    console.log('error')
    const { statusCode, errorMessage } = generatePrismaError(error as Prisma.PrismaClientKnownRequestError)
    res.status(statusCode).send({ errorMessage })
  }
})
