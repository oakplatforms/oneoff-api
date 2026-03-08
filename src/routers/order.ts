import { Prisma, ProcessStatus } from '@prisma/client'
import express from 'express'
import { generateIncludes } from '../utils/generateIncludes'
import { prismaClient, generatePrismaError } from '../utils/prismaHelpers'
import { paginatePrisma } from '../utils/paginatePrisma'
import { AuthenticatedUser, validateAccount } from '../validation/user'
import stripe from '../utils/stripe'

const prisma = prismaClient()
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
  const { include, status, sellerId, customerId, cartId, usePagination, page, limit } = req.query

  try {
    const reqUser = req.user as AuthenticatedUser
    if (!reqUser || !reqUser.principalId) {
      throw new Error('User authentication required')
    }
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
    const { statusCode, prismaError, customError } = generatePrismaError(error as Prisma.PrismaClientKnownRequestError)
    console.error('GET_ORDERS_ERROR:', prismaError || customError || error)
    res.status(statusCode).send({ errorMessage: customError || 'Failed to retrieve orders.' })
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
    const reqUser = req.user as AuthenticatedUser
    if (!reqUser || !reqUser.principalId) {
      throw new Error('User authentication required')
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
    accountId,
    status
  }: {
    customerId?: string
    sellerId?: string
    cartId?: string
    listingsInOrder?: ListingsInOrder
    offerId?: string
    accountId?: string
    status?: ProcessStatus
  } = req.body

  try {
    if (status === ProcessStatus.COMPLETED || status === ProcessStatus.CANCELED || status === ProcessStatus.FAILED || status === ProcessStatus.IN_REVIEW) {
      throw new Error(`Cannot create an order with ${status} status.`)
    }
    if (!customerId || !sellerId || !listingsInOrder) {
      throw new Error('Missing required fields in request body.')
    }
    await validateAccount(req.user as AuthenticatedUser, accountId, 'customer')

    if (!accountId) {
      throw new Error('Account ID is required.')
    }

    let subTotal = 0
    const listingIds = listingsInOrder.create.map((item) => item.listingId)
    const listings = await prisma.listing.findMany({
      where: { id: { in: listingIds } },
      include: { entity: true },
    })

    if (cartId) {
      // Validate no duplicate entities in the same cart
      const entityIds = listings.map((l) => l.entityId).filter(Boolean) as string[]
      if (entityIds.length > 0) {
        const existingEntityInCart = await prisma.orderListing.findFirst({
          where: {
            order: {
              cartId,
              status: 'CREATED',
            },
            listing: {
              entityId: { in: entityIds },
            },
          },
        })

        if (existingEntityInCart) {
          throw new Error('This item is already in your cart.')
        }
      }

      // Validate no duplicate seller orders in the same cart
      const existingSellerOrder = await prisma.order.findFirst({
        where: {
          cartId,
          sellerId,
          status: 'CREATED',
        },
      })

      if (existingSellerOrder) {
        throw new Error('You already have an order from this seller in your cart. Please add items to the existing order.')
      }
    }

    for (const item of listingsInOrder.create) {
      const listing = listings.find((l) => l.id === item.listingId)

      if (!listing?.price || !item.quantityInOrder) {
        throw new Error(`Missing listing data or invalid quantity`)
      }

      //Validate that the customer is not adding their own listings
      if (listing.accountId === accountId) {
        throw new Error(`Cannot add your own listing to an order.`)
      }

      const remainingQuantity = (listing.quantity || 0) - item.quantityInOrder

      if (remainingQuantity < 0) {
        throw new Error(`Insufficient quantity for listing.`)
      }

      if (!listing.multiTransactionsEnabled && listing.quantity !== item.quantityInOrder) {
        throw new Error(`You must purchase all items for single-seller listing.`)
      }

      subTotal += Number(listing.price) * item.quantityInOrder
    }

    //Fetch customer and seller with account to create snapshots
    const [customer, seller] = await Promise.all([
      prisma.customer.findUnique({
        where: { id: customerId },
        include: { account: true },
      }),
      prisma.seller.findUnique({
        where: { id: sellerId },
        include: { account: true },
      }),
    ])

    if (!customer || !seller) {
      throw new Error('Customer or seller not found.')
    }

    //Create snapshots
    const customerSnapshot = {
      firstName: customer.firstName,
      lastName: customer.lastName,
      phone: customer.phone,
      address: customer.address,
      city: customer.city,
      state: customer.state,
      zipCode: customer.zipCode,
      email: customer.account?.email,
    }

    const sellerSnapshot = {
      firstName: seller.firstName,
      lastName: seller.lastName,
      phone: seller.phone,
      address: seller.address,
      city: seller.city,
      state: seller.state,
      zipCode: seller.zipCode,
      businessName: seller.businessName,
      email: seller.account?.email,
    }

    const newOrder = await prisma.order.create({
      data: {
        customerId,
        sellerId,
        cartId,
        status: ProcessStatus.CREATED,
        subTotal,
        offerId,
        customerSnapshot: customerSnapshot as Prisma.InputJsonValue,
        sellerSnapshot: sellerSnapshot as Prisma.InputJsonValue,
        orderListings: {
          create: listingsInOrder.create.map(({ listingId, quantityInOrder }) => {
            const listing = listings.find((l) => l.id === listingId)
            return {
              listingId,
              quantity: quantityInOrder,
              price: listing?.price,
            }
          }),
        },
      } as Prisma.OrderCreateInput,
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
    listingsInOrder,
    accountId,
    status
  }: {
    customerId?: string
    sellerId?: string
    cartId?: string
    listingsInOrder?: ListingsInOrder
    accountId?: string
    status?: ProcessStatus
  } = req.body

  try {
    if (status === ProcessStatus.COMPLETED || status === ProcessStatus.CANCELED || status === ProcessStatus.FAILED || status === ProcessStatus.IN_REVIEW) {
      throw new Error(`Cannot update an order to ${status} status via PUT endpoint.`)
    }
    if (!id) {
      throw new Error('Order ID is required')
    }
    await validateAccount(req.user as AuthenticatedUser, accountId, 'customer')

    if (!accountId) {
      throw new Error('Account ID is required.')
    }

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

      let listings: Awaited<ReturnType<typeof prisma.listing.findMany>> = []
      if (createAndUpdateItems.length) {
        const listingIds = createAndUpdateItems.map((item) => item.listingId)

        listings = await prisma.listing.findMany({
          where: { id: { in: listingIds } },
          include: { entity: true },
        })

        // Validate no duplicate entities when adding new listings to the order
        if (listingsInOrder?.create?.length && existingOrder.cartId) {
          const newEntityIds = listings
            .filter((l) => listingsInOrder.create.some((c) => c.listingId === l.id))
            .map((l) => l.entityId)
            .filter(Boolean) as string[]

          if (newEntityIds.length > 0) {
            const existingEntityInCart = await prisma.orderListing.findFirst({
              where: {
                order: {
                  cartId: existingOrder.cartId,
                  status: 'CREATED',
                },
                listing: {
                  entityId: { in: newEntityIds },
                },
              },
            })

            if (existingEntityInCart) {
              throw new Error('This item is already in your cart.')
            }
          }
        }

        for (const item of createAndUpdateItems) {
          const listing = listings.find((l) => l.id === item.listingId)

          if (!listing?.price || !item.quantityInOrder) {
            throw new Error(`Missing listing data or invalid quantity`)
          }

          //Validate that the customer is not adding their own listings
          if (listing.accountId === accountId) {
            throw new Error(`Cannot add your own listing to an order.`)
          }

          const previous = existingOrder.orderListings.find(
            (orderListing) => orderListing.listingId === item.listingId
          )
          const priceToUse = previous?.price || listing.price
          const newAmount = Number(priceToUse) * item.quantityInOrder

          if (previous) {
            const previousAmount = Number(previous.price || listing.price) * (previous.quantity || 0)
            subTotal = subTotal - previousAmount + newAmount
          } else {
            subTotal += newAmount
          }

          const remainingQuantity = (listing.quantity || 0) - item.quantityInOrder

          if (remainingQuantity < 0) {
            throw new Error(`Insufficient quantity for listing.`)
          }

          if (!listing.multiTransactionsEnabled && listing.quantity !== item.quantityInOrder) {
            throw new Error(`You must purchase all items for single-seller listing ${listing.id}.`)
          }
        }
      }

      if (listingsInOrder?.delete?.length) {
        for (const deletedId of listingsInOrder.delete) {
          const match = existingOrder.orderListings.find((orderListing) => orderListing.id === deletedId)
          const priceToUse = match?.price || match?.listing?.price
          if (priceToUse && match.quantity) {
            const deletedAmount = Number(priceToUse) * match.quantity
            subTotal -= deletedAmount
          }
        }
      }

      const isDeleted = listingsInOrder?.delete?.length === existingOrder.orderListings.length

      if (isDeleted) {
        const deletedOrder = await prisma.order.delete({
          where: { id }
        })
        return deletedOrder
      }

      const updatedOrder = await prisma.order.update({
        where: { id },
        data: {
          ...(customerId && { customer: { connect: { id: customerId } } }),
          ...(sellerId && { seller: { connect: { id: sellerId } } }),
          ...(cartId && { cart: { connect: { id: cartId } } }),
          ...(createAndUpdateItems.length || listingsInOrder?.delete?.length ? {
            subTotal,
            orderListings: listingsInOrder
              ? {
                create: listingsInOrder.create?.map(({ listingId, quantityInOrder }) => {
                  const listing = listings.find((l) => l.id === listingId)
                  return {
                    listingId,
                    quantity: quantityInOrder,
                    price: listing?.price,
                  }
                }),
                updateMany: listingsInOrder.update?.map(({ orderId, listingId, quantityInOrder }) => ({
                  where: { listingId, orderId },
                  data: { quantity: quantityInOrder },
                })),
                deleteMany: listingsInOrder.delete?.map((id) => ({ id })),
              }
              : undefined,
          } : {})
        } as Prisma.OrderUpdateInput
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
 * /order/{id}/request-review:
 *   put:
 *     tags:
 *       - Order
 *     summary: Request review for an order.
 *     description: Updates an order status to IN_REVIEW. This endpoint is the only way to set an order status to IN_REVIEW. Both the customer who placed the order and the seller associated with the order can request a review.
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *         description: The unique ID of the order to request review for.
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - accountId
 *             properties:
 *               accountId:
 *                 type: string
 *                 description: The account ID for validation.
 *     responses:
 *       '200':
 *         description: Successfully requested review for the order.
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
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
 *         description: Order not found.
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 errorMessage:
 *                   type: string
 *       '500':
 *         description: Internal Server Error during review request.
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 errorMessage:
 *                   type: string
 */
orderRouter.put('/order/:id/request-review', async (req, res) => {
  const { id } = req.params
  const { accountId } = req.body

  try {
    if (!id) {
      throw new Error('Order ID is required.')
    }

    await validateAccount(req.user as AuthenticatedUser, accountId, 'customerOrSeller')

    await prisma.$transaction(async (tx) => {
      const order = await tx.order.findUnique({
        where: { id },
        include: {
          customer: {
            include: {
              account: true,
            },
          },
          seller: {
            include: {
              account: true,
            },
          },
        },
      })

      if (!order) {
        throw new Error('Order not found.')
      }

      if (order.customer?.accountId !== accountId && order.seller?.accountId !== accountId) {
        throw new Error('You can only request review for orders you are associated with.')
      }

      await tx.order.update({
        where: { id },
        data: {
          status: ProcessStatus.IN_REVIEW,
        },
      })
    })

    res.json({ message: 'Order review requested successfully.' })
  } catch (error) {
    const { statusCode, prismaError, customError } = generatePrismaError(error as Prisma.PrismaClientKnownRequestError)
    console.error('REQUEST_REVIEW_ERROR:', prismaError || customError)
    res.status(statusCode).send({ errorMessage: customError || 'Failed to request review for order.' })
  }
})

/**
 * @openapi
 * /order/{id}/cancel-order:
 *   put:
 *     tags:
 *       - Order
 *     summary: Cancel an order.
 *     description: Cancels an order by setting its status to CANCELED. The order must be in PENDING status.
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *         description: The unique ID of the order to cancel.
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - accountId
 *             properties:
 *               accountId:
 *                 type: string
 *                 description: The account ID for validation.
 *     responses:
 *       '200':
 *         description: Successfully canceled the order.
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
 *         description: Missing required parameters, invalid request, or order cannot be canceled (not in PENDING status).
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 errorMessage:
 *                   type: string
 *       '404':
 *         description: Order not found.
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 errorMessage:
 *                   type: string
 *       '500':
 *         description: Internal Server Error during cancellation.
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 errorMessage:
 *                   type: string
 */
orderRouter.put('/order/:id/cancel-order', async (req, res) => {
  const { id } = req.params
  const { accountId } = req.body

  try {
    if (!id) {
      throw new Error('Order ID is required.')
    }

    await validateAccount(req.user as AuthenticatedUser, accountId, 'seller')

    await prisma.$transaction(async (tx) => {
      const order = await tx.order.findUnique({
        where: { id },
        omit: { paymentIntentId: false },
        include: {
          seller: {
            include: {
              account: true,
            },
          },
        },
      })

      if (!order) {
        throw new Error('Order not found.')
      }

      if (order.seller?.accountId !== accountId) {
        throw new Error('You can only cancel orders for your own listings.')
      }

      if (order.status !== ProcessStatus.PENDING) {
        throw new Error(`Order cannot be canceled. Order status must be PENDING, but current status is ${order.status}.`)
      }

      if (order.paymentIntentId) {
        await stripe.paymentIntents.cancel(order.paymentIntentId)
      }

      await tx.order.update({
        where: { id },
        data: {
          status: ProcessStatus.CANCELED,
        },
      })
    }, { timeout: 60000 })

    res.json({ message: 'Order canceled successfully.' })
  } catch (error) {
    const { statusCode, prismaError, customError } = generatePrismaError(error as Prisma.PrismaClientKnownRequestError)
    console.error('CANCEL_ORDER_ERROR:', prismaError || customError)
    res.status(statusCode).send({ errorMessage: customError || 'Failed to cancel order.' })
  }
})

