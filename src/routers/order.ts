import { Prisma, ProcessStatus } from '@prisma/client'
import express from 'express'
import { generateIncludes } from '../utils/generateIncludes'
import { getPrismaClient, generatePrismaError } from '../utils/prismaHelpers'

const prisma = getPrismaClient()
export const orderRouter = express.Router()

export type ListingsInOrder = {
  create: [{ listingId: string, quantityInOrder: number }],
  update: [{ orderId: string, listingId: string, quantityInOrder: number }],
  delete: [string]
}

/**
 * @openapi
 * /orders:
 *   get:
 *     tags:
 *       - Order
 *     summary: Retrieve a list of orders.
 *     description: Fetches a list of orders based on optional query parameters. You can filter orders by status, createdById, purchasedById, or soldById and optionally include related entities.
 *     parameters:
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
orderRouter.get('/orders', async (req, res) => {
  const { include, status, sellerId, customerId, cartId } = req.query

  try {
    const orders = await prisma.order.findMany({
      where: {
        AND: [
          status
            ? { status: status as ProcessStatus }
            : { status: { notIn: ['DELETED', 'CREATED'] } },
          sellerId && customerId && cartId
            ? { sellerId: sellerId as string, customerId: customerId as string, cartId: cartId as string }
            : sellerId
              ? { sellerId: sellerId as string }
              : customerId
                ? { customerId: customerId as string }
                : cartId
                  ? { cartId: cartId as string }
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
 * /order/{id}:
 *   get:
 *     tags:
 *       - Order
 *     summary: Retrieve a specific order by ID.
 *     description: Fetches the details of an order by its unique ID. You can optionally include related entities using the `include` query parameter.
 *     parameters:
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
orderRouter.get('/order/:id', async (req, res) => {
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
      throw new Error('No order ID found')
    }
  } catch (error) {
    const { statusCode, errorMessage } = generatePrismaError(error as Prisma.PrismaClientKnownRequestError)
    res.status(statusCode).send({ errorMessage })
  }
})

/**
 * @openapi
 * /order:
 *   post:
 *     tags:
 *       - Order
 *     summary: Create a new order.
 *     description: Creates a new order with associated listings and calculates the subtotal and total.
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - customerId
 *               - sellerId
 *               - listingsInOrder
 *             properties:
 *               customerId:
 *                 type: string
 *                 description: ID of the customer placing the order.
 *               sellerId:
 *                 type: string
 *                 description: ID of the seller associated with the order.
 *               cartId:
 *                 type: string
 *                 description: Optional ID of the cart used to create the order.
 *               shipmentId:
 *                 type: string
 *                 description: Optional ID of the associated shipment.
 *               listingsInOrder:
 *                 type: array
 *                 description: Listings included in the order and their quantities.
 *                 items:
 *                   type: object
 *                   required:
 *                     - listingId
 *                     - quantityInOrder
 *                   properties:
 *                     listingId:
 *                       type: string
 *                     quantityInOrder:
 *                       type: number
 *     responses:
 *       '200':
 *         description: Successfully created the order.
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Order'
 *       '400':
 *         description: Missing or invalid required fields.
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 errorMessage:
 *                   type: string
 *       '500':
 *         description: Internal Server Error while creating the order.
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 errorMessage:
 *                   type: string
 */
orderRouter.post('/order', async (req, res) => {
  const {
    customerId,
    sellerId,
    cartId,
    listingsInOrder,
  }: {
    customerId?: string
    sellerId?: string
    cartId?: string
    listingsInOrder?: ListingsInOrder
  } = req.body

  if (!customerId || !sellerId || !listingsInOrder) {
    return res.status(400).json({ error: 'Missing required fields in request body.' })
  }

  try {
    let subTotal = 0
    const listingIds = listingsInOrder.create.map((item) => item.listingId)
    const listings = await prisma.listing.findMany({
      where: { id: { in: listingIds } },
    })

    for (const item of listingsInOrder.create) {
      const listing = listings.find((l) => l.id === item.listingId)

      if (!listing?.price || !item.quantityInOrder) {
        throw new Error(`Order failed: Missing listing data or invalid quantity for ${item.listingId}`)
      }

      const remainingQuantity = (listing.quantity || 0) - item.quantityInOrder

      if (remainingQuantity < 0) {
        throw new Error(`Order failed: Insufficient quantity for listing ${listing.id}.`)
      }

      if (!listing.multiTransactionsEnabled && listing.quantity !== item.quantityInOrder) {
        throw new Error(`Order failed: You must purchase all items for single-seller listing ${listing.id}.`)
      }

      subTotal += Number(listing.price) * item.quantityInOrder
    }

    const newOrder = await prisma.order.create({
      data: {
        customerId,
        sellerId,
        cartId,
        status: 'CREATED',
        subTotal,
        total: subTotal,
        orderListings: {
          create: listingsInOrder.create.map(({ listingId, quantityInOrder }) => ({
            listingId,
            quantity: quantityInOrder,
          })),
        },
      },
    })

    res.json(newOrder)
  } catch (error) {
    const { statusCode, errorMessage } = generatePrismaError(
      error as Prisma.PrismaClientKnownRequestError
    )
    res.status(statusCode).send({ errorMessage })
  }
})

/**
 * @openapi
 * /order/{id}:
 *   put:
 *     tags:
 *       - Order
 *     summary: Update an existing order by ID.
 *     description: Updates an order with optional new customer/seller/cart/shipment references and listing quantities.
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *         description: The unique ID of the order to update.
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               customerId:
 *                 type: string
 *                 description: Updated customer ID.
 *               sellerId:
 *                 type: string
 *                 description: Updated seller ID.
 *               cartId:
 *                 type: string
 *                 description: Updated cart ID.
 *               shipmentId:
 *                 type: string
 *                 description: Optional ID of a new shipment to associate.
 *               listingsInOrder:
 *                 type: array
 *                 description: Updated listings and their quantities.
 *                 items:
 *                   type: object
 *                   required:
 *                     - listingId
 *                     - quantityInOrder
 *                   properties:
 *                     listingId:
 *                       type: string
 *                     quantityInOrder:
 *                       type: number
 *     responses:
 *       '200':
 *         description: Successfully updated the order.
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Order'
 *       '400':
 *         description: Missing required parameters or invalid request.
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 errorMessage:
 *                   type: string
 *       '500':
 *         description: Internal Server Error during update.
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 errorMessage:
 *                   type: string
 */
orderRouter.put('/order/:id', async (req, res) => {
  const { id } = req.params
  const {
    customerId,
    sellerId,
    shipmentId,
    cartId,
    listingsInOrder,
  }: {
    customerId?: string
    sellerId?: string
    shipmentId?: string
    cartId?: string
    listingsInOrder?: ListingsInOrder
  } = req.body

  try {
    const existingOrder = await prisma.order.findUnique({
      where: { id },
      include: {
        orderListings: {
          include: {
            listing: true,
          }
        }
      }
    })

    if (!existingOrder) {
      throw new Error('Order not found.')
    }

    let subTotal = Number(existingOrder.subTotal || 0)

    const createAndUpdateItems = [
      ...(listingsInOrder?.create || []),
      ...(listingsInOrder?.update || []),
    ]

    if (createAndUpdateItems.length) {
      const listingIds = createAndUpdateItems.map((item) => item.listingId)

      const listings = await prisma.listing.findMany({
        where: { id: { in: listingIds } }
      })

      for (const item of createAndUpdateItems) {
        const listing = listings.find((l) => l.id === item.listingId)

        if (!listing?.price || !item.quantityInOrder) {
          throw new Error(`Order failed: Missing listing data or invalid quantity`)
        }

        const previous = existingOrder.orderListings.find(
          (orderListing) => orderListing.listingId === item.listingId
        )
        const newAmount = Number(listing.price) * item.quantityInOrder

        if (previous) {
          const previousAmount = Number(listing.price) * (previous.quantity || 0)
          subTotal = subTotal - previousAmount + newAmount
        } else {
          subTotal += newAmount
        }

        const remainingQuantity = (listing.quantity || 0) - item.quantityInOrder

        if (remainingQuantity < 0) {
          throw new Error(`Order failed: Insufficient quantity for listing.`)
        }

        if (!listing.multiTransactionsEnabled && listing.quantity !== item.quantityInOrder) {
          throw new Error(`Order failed: You must purchase all items for single-seller listing ${listing.id}.`)
        }
      }
    }

    if (listingsInOrder?.delete?.length) {
      for (const deletedId of listingsInOrder.delete) {
        const match = existingOrder.orderListings.find((orderListing) => orderListing.id === deletedId)
        if (match?.listing?.price && match.quantity) {
          const deletedAmount = Number(match.listing.price) * match.quantity
          subTotal -= deletedAmount
        }
      }
    }

    const updatedOrder = await prisma.order.update({
      where: { id },
      data: {
        ...(customerId && { customerId }),
        ...(sellerId && { sellerId }),
        ...(cartId && { cartId }),
        ...(shipmentId && { shipments: { connect: { id: shipmentId } } }),
        ...(listingsInOrder?.delete?.length === existingOrder.orderListings.length && { status: 'DELETED' }),
        ...(createAndUpdateItems.length || listingsInOrder?.delete?.length ? {
          subTotal,
          total: subTotal,
        } : {}),
        ...(createAndUpdateItems.length || listingsInOrder?.delete?.length ? {
          orderListings: listingsInOrder
            ? {
              create: listingsInOrder.create?.map(({ listingId, quantityInOrder }) => ({
                listingId,
                quantity: quantityInOrder,
              })),
              updateMany: listingsInOrder.update?.map(({ orderId, listingId, quantityInOrder }) => ({
                where: { listingId, orderId },
                data: { quantity: quantityInOrder },
              })),
              deleteMany: listingsInOrder.delete?.map((id) => ({ id })),
            }
            : undefined,
        } : {}),
      },
    })

    res.json(updatedOrder)
  } catch (error) {
    const { statusCode, errorMessage } = generatePrismaError(
      error as Prisma.PrismaClientKnownRequestError
    )
    res.status(statusCode).send({ errorMessage })
  }
})

