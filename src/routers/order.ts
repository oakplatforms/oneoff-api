import { Prisma, ProcessStatus } from '@prisma/client'
import express from 'express'
import { generateIncludes } from '../utils/generateIncludes'
import { getPrismaClient, generatePrismaError } from '../utils/prismaHelpers'
import { paginatePrisma } from '../utils/paginatePrisma'
import { AuthenticatedUser, validateAccount } from '../validation/user'

const prisma = getPrismaClient()
export const orderRouter = express.Router()

export type ListingsInOrder = {
  create: [{ listingId: string, quantityInOrder: number }],
  update: [{ orderId: string, listingId: string, quantityInOrder: number }],
  delete: [string]
}

type OrderShippingOptionsPayload = {
  create?: string[]
  delete?: string[]
};

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
  const { include, status, sellerId, customerId, cartId, usePagination, page, limit } = req.query

  try {
    const parsedLimit = parseInt(limit as string) || 10
    const parsedPage = parseInt(page as string) || 0

    const where = {
      AND: [
        status
          ? { status: status as ProcessStatus }
          : { status: { notIn: ['DELETED', 'CREATED'] as ProcessStatus[] } },
        ...(sellerId || customerId || cartId
          ? [
            {
              ...(sellerId ? { sellerId: sellerId as string } : {}),
              ...(customerId ? { customerId: customerId as string } : {}),
              ...(cartId ? { cartId: cartId as string } : {}),
            },
          ]
          : []),
      ],
    }

    const result = await paginatePrisma({
      prismaModel: prisma.order,
      where,
      include: generateIncludes(include as string),
      orderBy: { createdAt: 'desc' },
      page: parsedPage,
      limit: parsedLimit,
      usePagination: usePagination === 'false' ? false : true,
    })

    res.json(result)
  } catch (error) {
    const { statusCode, prismaError } = generatePrismaError(error as Prisma.PrismaClientKnownRequestError)
    console.error('GET_ORDERS_ERROR:', prismaError)
    res.status(statusCode).send({ errorMessage: 'Failed to retrieve orders.' })
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
    if (!id) {
      throw new Error('Order ID is required')
    }
    const order = await prisma.order.findUnique({
      where: { id },
      include: generateIncludes(include as string)
    })

    if (order) {
      res.json(order)
    } else {
      throw new Error('No order ID found')
    }
  } catch (error) {
    const { statusCode, prismaError, customError } = generatePrismaError(error as Prisma.PrismaClientKnownRequestError)
    console.error('GET_ORDER_ERROR:', prismaError || customError)
    res.status(statusCode).send({ errorMessage: customError || 'Failed to retrieve order.' })
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
    offerId,
    accountId
  }: {
    customerId?: string
    sellerId?: string
    cartId?: string
    listingsInOrder?: ListingsInOrder
    offerId?: string
    accountId?: string
  } = req.body

  try {
    if (!customerId || !sellerId || !listingsInOrder) {
      throw new Error('Missing required fields in request body.')
    }
    await validateAccount(req.user as AuthenticatedUser, accountId, 'customer')
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
        offerId,
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
    const { statusCode, prismaError, customError } = generatePrismaError(error as Prisma.PrismaClientKnownRequestError)
    console.error('CREATE_ORDER_ERROR:', prismaError || customError)
    res.status(statusCode).send({ errorMessage: customError || 'Failed to create order.' })
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
    cartId,
    shippingMethodId,
    listingsInOrder,
    orderShippingOptions,
    accountId
  }: {
    customerId?: string
    sellerId?: string
    cartId?: string
    shippingMethodId?: string
    listingsInOrder?: ListingsInOrder
    orderShippingOptions?: OrderShippingOptionsPayload
    accountId?: string
  } = req.body

  try {
    if (!id) {
      throw new Error('Order ID is required')
    }
    await validateAccount(req.user as AuthenticatedUser, accountId, 'customer')
    const result = await prisma.$transaction(async (prisma) => {
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

      const isDeleted = listingsInOrder?.delete?.length === existingOrder.orderListings.length

      const updatedOrder = await prisma.order.update({
        where: { id },
        data: {
          ...(customerId && { customer: { connect: { id: customerId } } }),
          ...(sellerId && { seller: { connect: { id: sellerId } } }),
          ...(cartId && { cart: { connect: { id: cartId } } }),
          ...(shippingMethodId && {
            shippingMethod: { connect: { id: shippingMethodId } }
          }),
          ...(isDeleted && { status: 'DELETED' }),
          ...(createAndUpdateItems.length || listingsInOrder?.delete?.length ? {
            subTotal,
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
          ...(orderShippingOptions?.create || orderShippingOptions?.delete ? {
            orderShippingOptions: {
              ...(orderShippingOptions?.delete
                ? { deleteMany: { shippingOptionId: { in: orderShippingOptions.delete } } }
                : {}),
              ...(orderShippingOptions?.create
                ? {
                  create: orderShippingOptions.create.map((optionId: string) => ({
                    shippingOption: { connect: { id: optionId } },
                  })),
                }
                : {}),
            }
          } : {})
        } as Prisma.OrderUpdateInput,
        include: {
          shipments: true,
          shippingMethod: true,
        },
      })

      if (!updatedOrder) {
        throw new Error('Order update failed — no order returned.')
      }

      return updatedOrder
    })

    res.json(result)
  } catch (error) {
    const { statusCode, prismaError, customError } = generatePrismaError(error as Prisma.PrismaClientKnownRequestError)
    console.error('UPDATE_ORDER_ERROR:', prismaError || customError)
    res.status(statusCode).send({ errorMessage: customError || 'Failed to update order.' })
  }
})

/**
 * @openapi
 * /order/remove-shipping:
 *   delete:
 *     tags:
 *       - Order
 *     summary: Remove shipping from an order.
 *     description: Deletes a shipment and removes the shipping method association from the order.
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - orderId
 *               - shipmentId
 *             properties:
 *               orderId:
 *                 type: string
 *                 description: The ID of the order to remove shipping from.
 *               shipmentId:
 *                 type: string
 *                 description: The ID of the shipment to delete.
 *               accountId:
 *                 type: string
 *                 description: The account ID for validation.
 *     responses:
 *       '200':
 *         description: Successfully removed shipping from the order.
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 order:
 *                   $ref: '#/components/schemas/Order'
 *                 message:
 *                   type: string
 *       '400':
 *         description: Missing required parameters or invalid request.
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 errorMessage:
 *                   type: string
 *       '404':
 *         description: Order or shipment not found.
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 errorMessage:
 *                   type: string
 *       '500':
 *         description: Internal Server Error during removal.
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 errorMessage:
 *                   type: string
 */
orderRouter.delete('/order/remove-shipping', async (req, res) => {
  const { orderId, shipmentId, accountId } = req.body

  try {
    if (!orderId || !shipmentId) {
      throw new Error('Order ID and shipment ID are required.')
    }
    await validateAccount(req.user as AuthenticatedUser, accountId, 'customer')

    const result = await prisma.$transaction(async (tx) => {
      //Verify the order exists
      const order = await tx.order.findUnique({
        where: { id: orderId },
        include: {
          shipments: true,
        },
      })

      if (!order) {
        throw new Error('Order not found.')
      }

      //Verify the shipment exists and belongs to the order
      const shipment = await tx.shipment.findUnique({
        where: { id: shipmentId },
      })

      if (!shipment) {
        throw new Error('Shipment not found.')
      }

      if (shipment.orderId !== orderId) {
        throw new Error('Shipment does not belong to the specified order.')
      }

      //Delete the shipment
      await tx.shipment.delete({
        where: { id: shipmentId },
      })

      //Remove the shippingMethod association from the order
      const updatedOrder = await tx.order.update({
        where: { id: orderId },
        data: {
          shippingMethod: { disconnect: true },
        },
        include: {
          shipments: true,
          shippingMethod: true,
        },
      })

      return updatedOrder
    })

    res.json({ order: result, message: 'Shipping removed from order successfully.' })
  } catch (error) {
    const { statusCode, prismaError, customError } = generatePrismaError(error as Prisma.PrismaClientKnownRequestError)
    console.error('REMOVE_SHIPPING_FROM_ORDER_ERROR:', prismaError || customError)
    res.status(statusCode).send({ errorMessage: customError || 'Failed to remove shipping from order.' })
  }
})

