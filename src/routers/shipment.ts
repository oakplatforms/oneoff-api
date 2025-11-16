import express from 'express'
import { generatePrismaError, getPrismaClient } from '../utils/prismaHelpers'
import shippo, { carrierAccounts, fetchRateById } from '../utils/shippo'
import { Prisma, ShipmentAccountType, ShipmentType, ProcessStatus } from '@prisma/client'
import { calculateOrderWeight, OrderPayload } from '../utils/order'
import { AuthenticatedUser, validateAccount } from '../validation/user'

const prisma = getPrismaClient()

export const shipmentRouter = express.Router()

/**
 * @openapi
 * /shipment/{id}:
 *   get:
 *     tags:
 *       - Shipments
 *     summary: Retrieve a shipment by ID
 *     description: Fetch a specific shipment by its ID, including metadata such as tracking number, status, and label URL.
 *     parameters:
 *       - name: id
 *         in: path
 *         required: true
 *         schema:
 *           type: string
 *         description: The ID of the shipment to retrieve.
 *     responses:
 *       '200':
 *         description: Shipment found and returned successfully.
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 shipment:
 *                   type: object
 *                   properties:
 *                     id:
 *                       type: string
 *                     status:
 *                       type: string
 *                     trackingNumber:
 *                       type: string
 *                     labelUrl:
 *                       type: string
 *                     createdAt:
 *                       type: string
 *                       format: date-time
 *                     updatedAt:
 *                       type: string
 *                       format: date-time
 *       '404':
 *         description: Shipment not found.
 *       '500':
 *         description: Failed to retrieve shipment.
 */
shipmentRouter.get('/shipment/:id', async (req, res) => {
  const { id } = req.params

  try {
    if (!id) {
      throw new Error('Shipment ID is required')
    }

    const shipment = await prisma.shipment.findUnique({
      where: { id },
    })

    if (!shipment) {
      throw new Error('Shipment not found.')
    }

    return res.json({ shipment })
  } catch (error) {
    const { statusCode, prismaError, customError } = generatePrismaError(error as Prisma.PrismaClientKnownRequestError)
    console.error('GET_SHIPMENT_ERROR:', prismaError || customError)
    return res.status(statusCode).json({ errorMessage: customError || 'Failed to retrieve shipment.' })
  }
})

/**
 * @openapi
 * /shipment/rates:
 *   post:
 *     tags:
 *       - Shipments
 *     summary: Get shipping rates for a shipment
 *     description: Calculates available shipping rates using Shippo based on order details, shipping method, and seller-configured parcel templates.
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               orderId:
 *                 type: string
 *                 description: The ID of the order associated with the shipment.
 *               shippingMethodId:
 *                 type: string
 *                 description: The ID of the shipping method selected for this shipment.
 *             required:
 *               - orderId
 *               - shippingMethodId
 *     responses:
 *       '200':
 *         description: Successfully retrieved shipping rates from Shippo.
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 rates:
 *                   type: array
 *                   items:
 *                     type: object
 *                     properties:
 *                       objectId:
 *                         type: string
 *                         description: The Shippo object ID for the rate.
 *                       provider:
 *                         type: string
 *                         description: The shipping carrier (e.g., USPS, FedEx, UPS).
 *                       serviceLevel:
 *                         type: object
 *                         properties:
 *                           name:
 *                             type: string
 *                             description: The name of the shipping service.
 *                           token:
 *                             type: string
 *                             description: The service-level token identifier.
 *                       amount:
 *                         type: string
 *                         description: The rate cost in USD.
 *                       estimatedDays:
 *                         type: integer
 *                         description: Estimated delivery time in business days.
 *       '400':
 *         description: Invalid request payload or missing data required for rate calculation.
 *       '500':
 *         description: Failed to fetch rates from Shippo or internal server error.
 */
shipmentRouter.post('/shipment/rates', async (req, res) => {
  const { orderId, accountId } = req.body

  try {
    if (!orderId) {
      throw new Error('Missing orderId in request body.')
    }
    await validateAccount(req.user as AuthenticatedUser, accountId, 'customer')

    const result = await prisma.$transaction(async (tx) => {
      const order = await tx.order.findUnique({
        where: { id: orderId },
        include: {
          customer: {
            include: {
              account: { include: { profile: true } },
            }
          },
          seller: {
            include: {
              account: { include: { profile: true } },
              sellerShippingMethods: { include: { shippingMethod: true } },
              sellerShippingOptions: {
                include: {
                  shippingOption: true,
                },
              },
            },
          },
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
      })

      if (!order || !order.customer || !order.seller) {
        throw new Error('Order or participants not found.')
      }

      const fromAddress = {
        name: `${order.seller.firstName} ${order.seller.lastName}`,
        street1: order.seller.address ?? undefined,
        city: order.seller.city ?? undefined,
        state: order.seller.state ?? undefined,
        zip: order.seller.zipCode ?? undefined,
        country: 'US',
        phone: order.seller.phone ?? undefined,
        email: order.seller.account.email ?? undefined,
      }

      const toAddress = {
        name: `${order.customer.firstName} ${order.customer.lastName}`,
        street1: order.customer.address ?? undefined,
        city: order.customer.city ?? undefined,
        state: order.customer.state ?? undefined,
        zip: order.customer.zipCode ?? undefined,
        country: 'US',
        phone: order.customer.phone ?? undefined,
        email: order.customer.account.email ?? undefined,
      }

      const supportedCarriers = order.seller?.shippingCarrierTypes || []
      const allShipments = []
      const orderWeight = calculateOrderWeight(order as OrderPayload)

      //Parcel types that are valid Shippo templates
      const validTemplateTypes = [
        'USPS_FlatRateEnvelope',
        'USPS_SoftPack',
        'UPS_Box_10kg',
        'UPS_Box_25kg',
        'UPS_Pad_Pak',
        'FedEx_Envelope',
        'FedEx_Padded_Pak',
        'FedEx_Box_10kg',
        'FedEx_Box_25kg',
      ]

      for (const carrier of supportedCarriers) {
        const shippingParcel = order.shippingMethod?.parcels.find(
          parcel => parcel.carrier === carrier
        )

        if (shippingParcel) {
          //eslint-disable-next-line @typescript-eslint/no-explicit-any
          const parcelConfig: any = {
            weight: orderWeight?.toString(),
            massUnit: 'oz',
          }

          //Use template if it's a valid template type, otherwise use dimensions
          if (validTemplateTypes.includes(shippingParcel.type)) {
            parcelConfig.template = shippingParcel.type
          } else {
            //For non-template types (like USPS_GroundAdvantage), use default dimensions
            parcelConfig.length = '11.5'
            parcelConfig.width = '6.125'
            parcelConfig.height = '0.25'
            parcelConfig.distanceUnit = 'in'
          }

          const shippoShipment = await shippo.shipments.create({
            addressFrom: fromAddress,
            addressTo: toAddress,
            parcels: [parcelConfig],
            carrierAccounts: [carrierAccounts[carrier]],
            metadata: `{"shipmentMethodId": ${order.shippingMethod?.id}}`,
            async: false,
          })

          if (Array.isArray(shippoShipment?.rates)) {
            allShipments.push(shippoShipment)
          }
        }
      }

      const allRates = allShipments.flatMap(s => s.rates || [])

      const sortedRates = allRates.sort((a, b) => {
        const priceA = parseFloat(a.amount || '0')
        const priceB = parseFloat(b.amount || '0')
        return priceA - priceB
      })

      return {
        rates: sortedRates,
        errors: allShipments.flatMap(s => s.messages || []),
        metadata: allShipments[0]?.metadata || null,
      }
    }, { timeout: 60000 })

    res.json(result)
  } catch (error) {
    const { statusCode, prismaError, customError } = generatePrismaError(error as Prisma.PrismaClientKnownRequestError)
    console.error('CREATE_SHIPMENT_RATE_ERROR:', prismaError || customError)
    return res.status(statusCode).json({ errorMessage: customError || 'Failed to fetch rates from Shippo.' })
  }
})

/**
 * @openapi
 * /shipment:
 *   post:
 *     tags:
 *       - Shipments
 *     summary: Create a shipment using a selected Shippo rate or non-refundable option
 *     description: Stores a new shipment in the database using a selected rate retrieved from Shippo by its rate ID, or creates a non-refundable shipment if rateId is not provided.
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               orderId:
 *                 type: string
 *                 description: The ID of the order the shipment is for.
 *               rateId:
 *                 type: string
 *                 description: The Shippo rate object ID selected by the user. If not provided, a non-refundable shipment will be created.
 *             required:
 *               - orderId
 *     responses:
 *       '200':
 *         description: Successfully created shipment and stored rate details.
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 shipment:
 *                   type: object
 *                   properties:
 *                     id:
 *                       type: string
 *                       description: Internal shipment ID.
 *                     orderId:
 *                       type: string
 *                     externalShipmentId:
 *                       type: string
 *                       description: ID of the Shippo shipment associated with the selected rate.
 *                     externalShipmentRateId:
 *                       type: string
 *                       description: The Shippo rate object ID used to create the shipment.
 *                     rate:
 *                       type: string
 *                       description: Cost of the selected rate in USD.
 *                     status:
 *                       type: string
 *                       enum: [CREATED, PROCESSING, FAILED]
 *                     createdAt:
 *                       type: string
 *                       format: date-time
 *       '400':
 *         description: Missing or invalid orderId or rateId.
 *       '404':
 *         description: Order not found.
 *       '500':
 *         description: Failed to create shipment due to Shippo error or database failure.
 */
shipmentRouter.post('/shipment', async (req, res) => {
  const { orderId, rateId, accountId } = req.body

  try {
    await validateAccount(req.user as AuthenticatedUser, accountId, 'customer')
    if (!orderId) {
      throw new Error('Missing orderId.')
    }

    const order = await prisma.order.findUnique({
      where: { id: orderId },
      include: {
        shippingMethod: true,
        orderListings: true,
      },
    })

    if (!order) {
      throw new Error('Order not found.')
    }

    if (!order.shippingMethod) {
      throw new Error('Order shipping method not found.')
    }

    const totalQuantity = order.orderListings.reduce(
      (sum, orderListing) => sum + (orderListing.quantity ?? 0),
      0
    )

    if (order.shippingMethod.maxQuantity !== null && totalQuantity > order.shippingMethod.maxQuantity) {
      throw new Error(
        `Order quantity (${totalQuantity}) exceeds the maximum quantity (${order.shippingMethod.maxQuantity}) allowed for this shipping method.`
      )
    }

    let newShipment

    if (!rateId) {
      newShipment = await prisma.shipment.create({
        data: {
          displayName: order.shippingMethod.displayName || order.shippingMethod.name,
          name: order.shippingMethod.name,
          orderId: order.id,
          type: ShipmentType.OUTBOUND,
          shipmentAccountType: ShipmentAccountType.UNTRACKED,
          status: ProcessStatus.CREATED,
          rate: order.shippingMethod.fixedRate || new Prisma.Decimal('0'),
          externalShipmentId: null,
          externalShipmentRateId: null,
        },
      })
    } else {
      const rate = await fetchRateById(rateId)

      if (!rate || !rate.amount || !rate.shipment) {
        throw new Error('Invalid or incomplete rate.')
      }

      newShipment = await prisma.shipment.create({
        data: {
          displayName: `${rate.provider} ${rate.servicelevel.name}`,
          name: rate.servicelevel.token,
          description: `${rate?.estimated_days} business ${rate?.estimated_days === 1 ? 'day' : 'days'}`,
          orderId: order.id,
          type: ShipmentType.OUTBOUND,
          shipmentAccountType: ShipmentAccountType.SHIPPO,
          status: ProcessStatus.CREATED,
          rate: new Prisma.Decimal(rate.amount),
          externalShipmentId: rate.shipment,
          externalShipmentRateId: rate.object_id,
        },
      })
    }

    return res.json({ shipment: newShipment })
  } catch (error) {
    const { statusCode, prismaError, customError } = generatePrismaError(error as Prisma.PrismaClientKnownRequestError)
    console.error('CREATE_SHIPMENT_ERROR:', prismaError || customError)
    return res.status(statusCode).json({ errorMessage: customError || 'Failed to create shipment.' })
  }
})

/**
 * @openapi
 * /shipment/{id}:
 *   delete:
 *     tags:
 *       - Shipments
 *     summary: Soft delete a shipment by marking its status as 'DELETED'
 *     description: Updates the status of the specified shipment to 'DELETED' instead of removing it from the database.
 *     parameters:
 *       - name: id
 *         in: path
 *         required: true
 *         schema:
 *           type: string
 *         description: The ID of the shipment to mark as deleted.
 *     responses:
 *       '200':
 *         description: Shipment status successfully updated to DELETED.
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 shipment:
 *                   type: object
 *                   properties:
 *                     id:
 *                       type: string
 *                     status:
 *                       type: string
 *                       enum: [DELETED]
 *       '404':
 *         description: Shipment not found.
 *       '500':
 *         description: Failed to update shipment status.
 */
shipmentRouter.delete('/shipment/:id', async (req, res) => {
  const { id } = req.params

  try {
    const shipment = await prisma.shipment.findUnique({ where: { id } })
    if (!shipment) {
      throw new Error('Shipment not found.')
    }

    await prisma.shipment.delete({ where: { id } })

    return res.json({ message: 'Shipment deleted successfully.' })
  } catch (error) {
    const { statusCode, prismaError, customError } = generatePrismaError(error as Prisma.PrismaClientKnownRequestError)
    console.error('DELETE_SHIPMENT_ERROR:', prismaError || customError)
    return res.status(statusCode).json({ errorMessage: customError || 'Failed to delete shipment.' })
  }
})
