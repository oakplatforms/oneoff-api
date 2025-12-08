import { Prisma, RefundType, RefundStatus, ShipmentType, TransactionType, ProcessStatus, TrackingStatus, ShipmentAccountType } from '@prisma/client'
import express from 'express'
import { generateIncludes } from '../utils/generateIncludes'
import { getPrismaClient, generatePrismaError } from '../utils/prismaHelpers'
import { paginatePrisma } from '../utils/paginatePrisma'
import { AuthenticatedUser, validateAccount } from '../validation/user'
import eventBridge from '../utils/eventBridge'
import { PutEventsCommand } from '@aws-sdk/client-eventbridge'
import stripe from '../utils/stripe'
import shippo, { carrierAccounts, fetchRateById, validShippoTemplateTypes } from '../utils/shippo'
import { calculateOrderWeight, OrderPayload } from '../utils/order'

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
  const { orderId, type, reason, image, accountId, status } = req.body

  try {
    if (!orderId || !type || !accountId) {
      throw new Error('Missing required fields: orderId, type, and accountId are required.')
    }

    if (status === RefundStatus.ACCEPTED || status === RefundStatus.DECLINED) {
      throw new Error(`Cannot create a refund with ${status} status.`)
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

    //Send EventBridge notification to seller
    try {
      await eventBridge.send(new PutEventsCommand({
        Entries: [
          {
            Source: 'tcgx',
            DetailType: 'order.refund.request.seller',
            Detail: JSON.stringify({
              orderId: newRefund.orderId,
              type: 'order.refund.request.seller',
            }),
            EventBusName: 'default',
          },
        ],
      }))
    } catch (err) {
      console.warn(`Failed to send refund request notification to seller for refund ${newRefund.id}:`, err)
    }

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
 *     description: Updates a refund request. Customers can update their refund request if it's still pending. Status cannot be set to ACCEPTED or DECLINED via this endpoint; use the accept-refund or decline-refund endpoints instead.
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
 *                 enum: [PENDING]
 *                 description: New status for the refund. Cannot be set to ACCEPTED or DECLINED via this endpoint.
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
 *         description: Invalid request (e.g., attempting to set status to ACCEPTED or DECLINED).
 *       '404':
 *         description: Refund not found.
 *       '500':
 *         description: Internal Server Error.
 */
refundRouter.put('/refund/:id', async (req, res) => {
  const { id } = req.params
  const { status, reason, image, accountId } = req.body

  try {
    if (!id) {
      throw new Error('Refund ID is required.')
    }

    if (status === RefundStatus.ACCEPTED || status === RefundStatus.DECLINED) {
      throw new Error(`Cannot update a refund to ${status} status via PUT endpoint.`)
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
      updateData.status = status as RefundStatus
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

/**
 * @openapi
 * /refund/{id}/accept-refund:
 *   put:
 *     tags:
 *       - Refund
 *     summary: Accept a refund request.
 *     description: Accepts a refund request by updating its status to ACCEPTED. Only sellers can accept refund requests for their orders. The refund must be in PENDING status.
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *         description: The unique ID of the refund to accept.
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
 *         description: Successfully accepted the refund.
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 refund:
 *                   $ref: '#/components/schemas/Refund'
 *                 message:
 *                   type: string
 *       '400':
 *         description: Missing required parameters, invalid request, or refund cannot be accepted (not in PENDING status).
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 errorMessage:
 *                   type: string
 *       '404':
 *         description: Refund not found.
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 errorMessage:
 *                   type: string
 *       '500':
 *         description: Internal Server Error during acceptance.
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 errorMessage:
 *                   type: string
 */
refundRouter.put('/refund/:id/accept-refund', async (req, res) => {
  const { id } = req.params
  const { accountId } = req.body

  try {
    if (!id) {
      throw new Error('Refund ID is required.')
    }

    if (!accountId) {
      throw new Error('Account ID is required.')
    }

    await validateAccount(req.user as AuthenticatedUser, accountId, 'seller')

    let refundOrderId: string | undefined

    await prisma.$transaction(async (tx) => {
      const refund = await tx.refund.findUnique({
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
              shipments: true,
              orderListings: {
                include: {
                  listing: {
                    include: {
                      entity: {
                        include: {
                          product: true,
                        },
                      },
                    },
                  },
                },
              },
              shippingMethod: {
                include: {
                  parcels: true,
                },
              },
            },
          },
        },
      })

      if (!refund) {
        throw new Error('Refund not found.')
      }

      refundOrderId = refund.orderId

      if (refund.order?.seller?.accountId !== accountId) {
        throw new Error('You can only accept refund requests for your own orders.')
      }

      if (refund.status !== RefundStatus.PENDING) {
        throw new Error(`Refund cannot be accepted. Refund status must be PENDING, but current status is ${refund.status}.`)
      }

      //Validate order has payment intent
      if (!refund.order?.paymentIntentId) {
        throw new Error('Order does not have a payment intent. Cannot process refund.')
      }

      //Validate seller has payment account
      const sellerPaymentAccountId = refund.order.seller?.paymentAccountId
      if (!sellerPaymentAccountId) {
        throw new Error('Seller does not have a payment account configured.')
      }

      //Retrieve payment intent to get the amount
      const paymentIntent = await stripe.paymentIntents.retrieve(refund.order.paymentIntentId)

      if (paymentIntent.status !== 'succeeded') {
        throw new Error(`Payment intent status is ${paymentIntent.status}. Only succeeded payment intents can be refunded.`)
      }

      //Check if payment intent has already been refunded by listing refunds
      const existingRefunds = await stripe.refunds.list({
        payment_intent: refund.order.paymentIntentId,
        limit: 1,
      })
      if (existingRefunds.data.length > 0) {
        throw new Error('Payment intent has already been refunded.')
      }

      const refundAmount = paymentIntent.amount

      //Check Connect account balance to ensure seller has sufficient funds
      //For destination charges, we need to check the connected account's balance
      const balance = await stripe.balance.retrieve({
        stripeAccount: sellerPaymentAccountId,
      })

      //Calculate available balance (pending + available)
      const availableBalance = balance.available.reduce((sum, bal) => {
        if (bal.currency === 'usd') {
          return sum + bal.amount
        }
        return sum
      }, 0)

      //Seller must refund the full amount the customer paid (totalAmount)
      //This is the entire order total, regardless of application fees or shipping fees
      if (availableBalance < refundAmount) {
        throw new Error(
          `Insufficient funds in seller account. Required: $${(refundAmount / 100).toFixed(2)}, Available: $${(availableBalance / 100).toFixed(2)}`
        )
      }

      //Create Stripe refund with reverse_transfer and refund_application_fee
      await stripe.refunds.create({
        payment_intent: refund.order.paymentIntentId,
        reverse_transfer: true,
        refund_application_fee: true,
        metadata: {
          orderId: refund.orderId,
          refundId: refund.id,
          reason: refund.reason || 'Seller accepted refund request',
        },
      })

      //Update refund status in database
      await tx.refund.update({
        where: { id },
        data: {
          status: RefundStatus.ACCEPTED,
        },
      })

      //Create return shipment and transaction
      if (!refund.order) {
        throw new Error('Order not found for return shipment creation.')
      }

      const order = refund.order
      const originalShipment = order.shipments.find((s: { type: string; status: string }) => s.type === ShipmentType.OUTBOUND && s.status !== ProcessStatus.DELETED)

      if (!originalShipment) {
        throw new Error('Original shipment not found for return.')
      }

      const isUntracked = originalShipment.shipmentAccountType === ShipmentAccountType.UNTRACKED

      let returnLabelUrl: string | undefined
      let returnTrackingNumber: string | undefined
      let returnShipmentRate: Prisma.Decimal = new Prisma.Decimal('0')
      let externalReturnShipmentId: string | undefined
      let externalReturnShipmentRateId: string | undefined

      if (!isUntracked) {
        //Create return shipment with inverted addresses using same config as original
        if (!order.customer || !order.seller) {
          throw new Error('Customer or seller information missing for return shipment.')
        }

        if (!originalShipment.externalShipmentRateId) {
          throw new Error('Original shipment does not have a rate ID.')
        }

        //Get the original rate to determine carrier and service level
        const originalRate = await fetchRateById(originalShipment.externalShipmentRateId)
        const carrier = originalRate.provider as keyof typeof carrierAccounts

        if (!carrierAccounts[carrier]) {
          throw new Error(`Carrier ${carrier} not supported for return shipment.`)
        }

        //Get parcel config from order's shipping method matching the carrier
        const shippingParcel = order.shippingMethod?.parcels.find(
          (parcel: { carrier: string }) => parcel.carrier === carrier
        )

        if (!shippingParcel) {
          throw new Error(`No parcel configuration found for carrier ${carrier}.`)
        }

        const fromAddress = {
          name: `${order.customer.firstName} ${order.customer.lastName}`,
          street1: order.customer.address ?? undefined,
          city: order.customer.city ?? undefined,
          state: order.customer.state ?? undefined,
          zip: order.customer.zipCode ?? undefined,
          country: 'US',
          phone: order.customer.phone ?? undefined,
          email: order.customer.account.email ?? undefined,
        }

        const toAddress = {
          name: `${order.seller.firstName} ${order.seller.lastName}`,
          street1: order.seller.address ?? undefined,
          city: order.seller.city ?? undefined,
          state: order.seller.state ?? undefined,
          zip: order.seller.zipCode ?? undefined,
          country: 'US',
          phone: order.seller.phone ?? undefined,
          email: order.seller.account.email ?? undefined,
        }

        //Get order weight
        const orderWeight = calculateOrderWeight(order as OrderPayload)

        //eslint-disable-next-line @typescript-eslint/no-explicit-any
        const parcelConfig: any = {
          weight: orderWeight?.toString(),
          massUnit: 'oz',
        }

        //Use template if it's a valid template type, otherwise use dimensions
        if (validShippoTemplateTypes.includes(shippingParcel.type)) {
          parcelConfig.template = shippingParcel.type
        } else {
          //For non-template types (like USPS_GroundAdvantage), use default dimensions
          parcelConfig.length = '11.5'
          parcelConfig.width = '6.125'
          parcelConfig.height = '0.25'
          parcelConfig.distanceUnit = 'in'
        }

        //Create Shippo return shipment with same carrier
        const returnShippoShipment = await shippo.shipments.create({
          addressFrom: fromAddress,
          addressTo: toAddress,
          parcels: [parcelConfig],
          carrierAccounts: [carrierAccounts[carrier]],
          metadata: `{"orderId": "${order.id}", "refundId": "${refund.id}", "type": "RETURN"}`,
          async: false,
        })

        if (!returnShippoShipment?.rates || returnShippoShipment.rates.length === 0) {
          throw new Error('No rates available for return shipment.')
        }

        //Try to find the same service level, otherwise use cheapest
        const sameServiceRate = returnShippoShipment.rates.find(
          (rate: { servicelevel?: { token?: string } }) => rate.servicelevel?.token === originalRate.servicelevel.token
        )

        const selectedRate = sameServiceRate || returnShippoShipment.rates.sort((a, b) => {
          const priceA = parseFloat(a.amount || '0')
          const priceB = parseFloat(b.amount || '0')
          return priceA - priceB
        })[0]

        externalReturnShipmentId = (returnShippoShipment as Record<string, unknown>)?.object_id as string | undefined
        externalReturnShipmentRateId = (selectedRate as Record<string, unknown>)?.object_id as string | undefined
        returnShipmentRate = new Prisma.Decimal(selectedRate.amount || '0')

        //Create Shippo transaction for return label
        const returnTransaction = await shippo.transactions.create({
          rate: externalReturnShipmentRateId!,
          labelFileType: 'PDF',
          async: false,
        })

        const { trackingNumber, labelUrl, status: transactionStatus, messages } = returnTransaction || {}

        if (transactionStatus !== 'SUCCESS') {
          throw new Error(`Return shipment transaction failed: ${messages?.[0]?.text || 'Unknown error'}`)
        }

        returnLabelUrl = labelUrl
        returnTrackingNumber = trackingNumber
      }

      //Create return Shipment record
      await tx.shipment.create({
        data: {
          orderId: order.id,
          type: ShipmentType.RETURN,
          shipmentAccountType: isUntracked ? ShipmentAccountType.UNTRACKED : ShipmentAccountType.SHIPPO,
          status: isUntracked ? ProcessStatus.PENDING : ProcessStatus.PENDING,
          rate: returnShipmentRate,
          trackingNumber: returnTrackingNumber,
          trackingStatus: returnTrackingNumber ? TrackingStatus.UNKNOWN : undefined,
          labelUrl: returnLabelUrl,
          externalShipmentId: externalReturnShipmentId,
          externalShipmentRateId: externalReturnShipmentRateId,
          name: originalShipment.name,
          displayName: `Return: ${originalShipment.displayName || originalShipment.name}`,
        },
      })

      //Create return Transaction record
      await tx.transaction.create({
        data: {
          orderId: order.id,
          accountId: order.customer?.accountId,
          //Convert from cents to dollars
          amount: refundAmount / 100,
          transactionType: TransactionType.REFUND,
          description: `Refund for order ${order.id}`,
        },
      })
    }, { timeout: 120000 })

    //Send EventBridge notification to customer
    try {
      await eventBridge.send(new PutEventsCommand({
        Entries: [
          {
            Source: 'tcgx',
            DetailType: 'order.refund.accepted.customer',
            Detail: JSON.stringify({
              orderId: refundOrderId,
              type: 'order.refund.accepted.customer',
            }),
            EventBusName: 'default',
          },
        ],
      }))
    } catch (err) {
      console.warn(`Failed to send refund accepted notification to customer for refund ${id}:`, err)
    }

    res.json({ message: 'Refund accepted successfully.' })
  } catch (error) {
    const { statusCode, prismaError, customError } = generatePrismaError(error as Prisma.PrismaClientKnownRequestError)
    console.error('ACCEPT_REFUND_ERROR:', prismaError || customError)
    res.status(statusCode).send({ errorMessage: customError || 'Failed to accept refund.' })
  }
})

/**
 * @openapi
 * /refund/{id}/decline-refund:
 *   put:
 *     tags:
 *       - Refund
 *     summary: Decline a refund request.
 *     description: Declines a refund request by updating its status to DECLINED. Only sellers can decline refund requests for their orders. The refund must be in PENDING status.
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *         description: The unique ID of the refund to decline.
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
 *         description: Successfully declined the refund.
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 refund:
 *                   $ref: '#/components/schemas/Refund'
 *                 message:
 *                   type: string
 *       '400':
 *         description: Missing required parameters, invalid request, or refund cannot be declined (not in PENDING status).
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 errorMessage:
 *                   type: string
 *       '404':
 *         description: Refund not found.
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 errorMessage:
 *                   type: string
 *       '500':
 *         description: Internal Server Error during decline.
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 errorMessage:
 *                   type: string
 */
refundRouter.put('/refund/:id/decline-refund', async (req, res) => {
  const { id } = req.params
  const { accountId } = req.body

  try {
    if (!id) {
      throw new Error('Refund ID is required.')
    }

    if (!accountId) {
      throw new Error('Account ID is required.')
    }

    await validateAccount(req.user as AuthenticatedUser, accountId, 'seller')

    let refundOrderId: string | undefined

    await prisma.$transaction(async (tx) => {
      const refund = await tx.refund.findUnique({
        where: { id },
        include: {
          order: {
            include: {
              seller: {
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

      refundOrderId = refund.orderId

      if (refund.order?.seller?.accountId !== accountId) {
        throw new Error('You can only decline refund requests for your own orders.')
      }

      if (refund.status !== RefundStatus.PENDING) {
        throw new Error(`Refund cannot be declined. Refund status must be PENDING, but current status is ${refund.status}.`)
      }

      await tx.refund.update({
        where: { id },
        data: {
          status: RefundStatus.DECLINED,
        },
      })
    })

    //Send EventBridge notification to customer
    try {
      await eventBridge.send(new PutEventsCommand({
        Entries: [
          {
            Source: 'tcgx',
            DetailType: 'order.refund.declined.customer',
            Detail: JSON.stringify({
              orderId: refundOrderId,
              type: 'order.refund.declined.customer',
            }),
            EventBusName: 'default',
          },
        ],
      }))
    } catch (err) {
      console.warn(`Failed to send refund declined notification to customer for refund ${id}:`, err)
    }

    res.json({ message: 'Refund declined successfully.' })
  } catch (error) {
    const { statusCode, prismaError, customError } = generatePrismaError(error as Prisma.PrismaClientKnownRequestError)
    console.error('DECLINE_REFUND_ERROR:', prismaError || customError)
    res.status(statusCode).send({ errorMessage: customError || 'Failed to decline refund.' })
  }
})

