import { Prisma, RefundType, RefundStatus } from '@prisma/client'
import express from 'express'
import { generateIncludes } from '../utils/generateIncludes'
import { getPrismaClient, generatePrismaError } from '../utils/prismaHelpers'
import { paginatePrisma } from '../utils/paginatePrisma'
import { AuthenticatedUser, validateAccount } from '../validation/user'

const prisma = getPrismaClient()
export const refundRouter = express.Router()

/**
 * @openapi
 * /refunds:
 *   get:
 *     tags:
 *       - Refund
 *     summary: Retrieve a list of refunds
 *     description: Fetches a list of refunds based on optional query parameters. You can filter refunds by status, type, or orderId and optionally include related entities.
 *     parameters:
 *       - in: query
 *         name: status
 *         schema:
 *           type: string
 *           enum: [PENDING, ACCEPTED, DECLINED]
 *         description: Filter refunds by status.
 *       - in: query
 *         name: type
 *         schema:
 *           type: string
 *           enum: [DAMAGE, WRONG_PRODUCT, COUNTERFEIT, NOT_AS_DESCRIBED, DEFECTIVE, MISSING_ITEMS, OTHER]
 *         description: Filter refunds by type.
 *       - in: query
 *         name: orderId
 *         schema:
 *           type: string
 *         description: Filter refunds by order ID.
 *       - in: query
 *         name: include
 *         schema:
 *           type: string
 *         description: Comma-separated list of related entities to include (e.g., 'order').
 *       - in: query
 *         name: page
 *         schema:
 *           type: integer
 *       - in: query
 *         name: limit
 *         schema:
 *           type: integer
 *       - in: query
 *         name: usePagination
 *         schema:
 *           type: boolean
 *     responses:
 *       '200':
 *         description: Successfully retrieved the refunds.
 *         content:
 *           application/json:
 *             schema:
 *               type: array
 *               items:
 *                 $ref: '#/components/schemas/Refund'
 *       '400':
 *         description: Bad request.
 *       '500':
 *         description: Internal Server Error.
 */
refundRouter.get('/refunds', async (req, res) => {
  const { include, status, type, orderId, usePagination, page, limit } = req.query

  try {
    const parsedLimit = parseInt(limit as string) || 10
    const parsedPage = parseInt(page as string) || 0

    const where: Prisma.RefundWhereInput = {
      AND: [
        status ? { status: status as RefundStatus } : {},
        type ? { type: type as RefundType } : {},
        orderId ? { orderId: orderId as string } : {},
      ],
    }

    const result = await paginatePrisma({
      prismaModel: prisma.refund,
      where,
      include: generateIncludes(include as string),
      page: parsedPage,
      limit: parsedLimit,
      usePagination: usePagination === 'false' ? false : true,
    })

    res.json(result)
  } catch (error) {
    const { statusCode, prismaError, customError } = generatePrismaError(error as Prisma.PrismaClientKnownRequestError)
    console.error('GET_REFUNDS_ERROR:', prismaError || customError)
    res.status(statusCode).send({ errorMessage: customError || 'Failed to retrieve refunds.' })
  }
})

/**
 * @openapi
 * /refund:
 *   post:
 *     tags:
 *       - Refund
 *     summary: Create a new refund request
 *     description: Creates a new refund request for an order. Only customers can create refund requests.
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - orderId
 *               - type
 *               - accountId
 *             properties:
 *               orderId:
 *                 type: string
 *                 description: ID of the order to request a refund for.
 *               type:
 *                 type: string
 *                 enum: [DAMAGE, WRONG_PRODUCT, COUNTERFEIT, NOT_AS_DESCRIBED, DEFECTIVE, MISSING_ITEMS, OTHER]
 *                 description: Type of refund request.
 *               reason:
 *                 type: string
 *                 description: Optional reason for the refund request.
 *               image:
 *                 type: string
 *                 description: Optional image URL for supporting evidence.
 *               accountId:
 *                 type: string
 *                 description: ID of the customer account creating the refund.
 *     responses:
 *       '200':
 *         description: Successfully created the refund request.
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Refund'
 *       '400':
 *         description: Missing or invalid required fields.
 *       '500':
 *         description: Internal Server Error.
 */
refundRouter.post('/refund', async (req, res) => {
  const { orderId, type, reason, image, accountId } = req.body

  try {
    if (!orderId || !type || !accountId) {
      throw new Error('Missing required fields: orderId, type, and accountId are required.')
    }

    await validateAccount(req.user as AuthenticatedUser, accountId, 'customer')

    //Verify the order exists and belongs to the customer
    const order = await prisma.order.findUnique({
      where: { id: orderId },
      include: {
        customer: {
          include: {
            account: true,
          },
        },
      },
    })

    if (!order) {
      throw new Error('Order not found.')
    }

    if (order.customer?.accountId !== accountId) {
      throw new Error('You can only create refund requests for your own orders.')
    }

    //Check if a refund already exists for this order
    const existingRefund = await prisma.refund.findUnique({
      where: { orderId },
    })

    if (existingRefund) {
      throw new Error('A refund request already exists for this order.')
    }

    const newRefund = await prisma.refund.create({
      data: {
        orderId,
        type: type as RefundType,
        reason,
        image,
        status: RefundStatus.PENDING,
      },
      include: {
        order: true,
      },
    })

    res.json(newRefund)
  } catch (error) {
    const { statusCode, prismaError, customError } = generatePrismaError(error as Prisma.PrismaClientKnownRequestError)
    console.error('CREATE_REFUND_ERROR:', prismaError || customError)
    res.status(statusCode).send({ errorMessage: customError || 'Failed to create refund request.' })
  }
})

/**
 * @openapi
 * /refund/{id}:
 *   get:
 *     tags:
 *       - Refund
 *     summary: Get a refund by ID
 *     description: Retrieves a single refund by its ID.
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *         description: The ID of the refund to retrieve.
 *       - in: query
 *         name: include
 *         schema:
 *           type: string
 *         description: Comma-separated list of related entities to include (e.g., 'order').
 *     responses:
 *       '200':
 *         description: Successfully retrieved the refund.
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Refund'
 *       '404':
 *         description: Refund not found.
 *       '500':
 *         description: Internal Server Error.
 */
refundRouter.get('/refund/:id', async (req, res) => {
  const { id } = req.params
  const { include } = req.query

  try {
    if (!id) {
      throw new Error('Refund ID is required.')
    }

    const refund = await prisma.refund.findUnique({
      where: { id },
      include: generateIncludes(include as string),
    })

    if (refund) {
      res.json(refund)
    } else {
      res.status(404).send({ errorMessage: 'Refund not found.' })
    }
  } catch (error) {
    const { statusCode, prismaError, customError } = generatePrismaError(error as Prisma.PrismaClientKnownRequestError)
    console.error('GET_REFUND_ERROR:', prismaError || customError)
    res.status(statusCode).send({ errorMessage: customError || 'Failed to retrieve refund.' })
  }
})

/**
 * @openapi
 * /refund/{id}:
 *   put:
 *     tags:
 *       - Refund
 *     summary: Update a refund request
 *     description: Updates a refund request. Sellers can accept or decline refunds. Customers can update their refund request if it's still pending.
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *         description: The ID of the refund to update.
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               status:
 *                 type: string
 *                 enum: [PENDING, ACCEPTED, DECLINED]
 *                 description: New status for the refund (only sellers can change to ACCEPTED or DECLINED).
 *               sellerDeclineReason:
 *                 type: string
 *                 description: Reason for declining the refund (required when status is DECLINED).
 *               reason:
 *                 type: string
 *                 description: Updated reason (only if status is PENDING).
 *               image:
 *                 type: string
 *                 description: Updated image URL (only if status is PENDING).
 *               accountId:
 *                 type: string
 *                 description: ID of the account making the update (customer or seller).
 *     responses:
 *       '200':
 *         description: Successfully updated the refund.
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Refund'
 *       '400':
 *         description: Invalid request (e.g., missing sellerDeclineReason when declining).
 *       '404':
 *         description: Refund not found.
 *       '500':
 *         description: Internal Server Error.
 */
refundRouter.put('/refund/:id', async (req, res) => {
  const { id } = req.params
  const { status, sellerDeclineReason, reason, image, accountId } = req.body

  try {
    if (!id) {
      throw new Error('Refund ID is required.')
    }

    if (!accountId) {
      throw new Error('Account ID is required.')
    }

    const refund = await prisma.refund.findUnique({
      where: { id },
      include: {
        order: {
          include: {
            seller: {
              include: {
                account: true,
              },
            },
            customer: {
              include: {
                account: true,
              },
            },
          },
        },
      },
    })

    if (!refund) {
      throw new Error('Refund not found.')
    }

    const isSeller = refund.order?.seller?.accountId === accountId
    const isCustomer = refund.order?.customer?.accountId === accountId

    if (!isSeller && !isCustomer) {
      throw new Error('You do not have permission to update this refund.')
    }

    //Build update data
    const updateData: Prisma.RefundUpdateInput = {}

    if (status) {
      const newStatus = status as RefundStatus

      //Only sellers can accept or decline
      if ((newStatus === RefundStatus.ACCEPTED || newStatus === RefundStatus.DECLINED) && !isSeller) {
        throw new Error('Only sellers can accept or decline refund requests.')
      }

      //If declining, require a decline reason
      if (newStatus === RefundStatus.DECLINED && !sellerDeclineReason) {
        throw new Error('sellerDeclineReason is required when declining a refund.')
      }

      updateData.status = newStatus

      if (newStatus === RefundStatus.DECLINED && sellerDeclineReason) {
        updateData.sellerDeclineReason = sellerDeclineReason
      }
    }

    //Customers can only update reason or image if status is PENDING
    if (isCustomer && refund.status !== RefundStatus.PENDING) {
      throw new Error('You can only update refund requests that are still pending.')
    }

    if (reason !== undefined) {
      updateData.reason = reason
    }

    if (image !== undefined) {
      updateData.image = image
    }

    const updatedRefund = await prisma.refund.update({
      where: { id },
      data: updateData,
      include: {
        order: true,
      },
    })

    res.json(updatedRefund)
  } catch (error) {
    const { statusCode, prismaError, customError } = generatePrismaError(error as Prisma.PrismaClientKnownRequestError)
    console.error('UPDATE_REFUND_ERROR:', prismaError || customError)
    res.status(statusCode).send({ errorMessage: customError || 'Failed to update refund.' })
  }
})

