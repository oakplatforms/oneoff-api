import { Prisma } from '@prisma/client'
import express from 'express'
import { generateIncludes } from '../utils/generateIncludes'
import { getPrismaClient, generatePrismaError } from '../utils/prismaHelpers'
import { paginatePrisma } from '../utils/paginatePrisma'
import { AuthenticatedUser, validateAccount } from '../validation/user'

const prisma = getPrismaClient()
export const offerRouter = express.Router()

/**
 * @openapi
 * /offers:
 *   get:
 *     summary: Retrieve a list of offers
 *     tags:
 *       - Offer
 *     parameters:
 *       - in: query
 *         name: include
 *         required: false
 *         schema:
 *           type: string
 *         description: Comma-separated list of related entities to include (e.g., 'bid,listing,order').
 *       - in: query
 *         name: page
 *         required: false
 *         schema:
 *           type: integer
 *       - in: query
 *         name: limit
 *         required: false
 *         schema:
 *           type: integer
 *       - in: query
 *         name: usePagination
 *         required: false
 *         schema:
 *           type: boolean
 *     responses:
 *       '200':
 *         description: A list of offers
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Offer'
 */
offerRouter.get('/offers', async (req, res) => {
  const { include, usePagination, page, limit } = req.query

  try {
    const result = await paginatePrisma({
      prismaModel: prisma.offer,
      where: {},
      include: generateIncludes(include),
      page: parseInt(page as string) || 0,
      limit: parseInt(limit as string) || 10,
      usePagination: usePagination === 'false' ? false : true,
    })

    res.json(result)
  } catch (error) {
    const { statusCode, prismaError, customError } = generatePrismaError(error as Prisma.PrismaClientKnownRequestError)
    console.error('GET_OFFERS_ERROR:', prismaError, customError)
    res.status(statusCode).send({ errorMessage: customError || 'Failed to retrieve offers.' })
  }
})

/**
 * @openapi
 * /offer:
 *   post:
 *     summary: Create an offer
 *     tags:
 *       - Offer
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               status:
 *                 type: string
 *               bidId:
 *                 type: string
 *               listingId:
 *                 type: string
 *               orderId:
 *                 type: string
 *               accountId:
 *                 type: string
 *     responses:
 *       '200':
 *         description: Created offer response
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Offer'
 */
offerRouter.post('/offer', async (req, res) => {
  const { status, bidId, accountId, quantityInOffer } = req.body

  try {
    if (!bidId || !accountId || !quantityInOffer) {
      throw new Error('Missing required bidId, accountId, or quantityInOffer.')
    }
    await validateAccount(req.user as AuthenticatedUser, accountId, 'seller')

    const bid = await prisma.bid.findUnique({
      where: { id: bidId },
      select: { price: true, entityId: true },
    })

    if (!bid || !bid.entityId) {
      throw new Error('Bid not found or missing entityId.')
    }

    const offer = await prisma.offer.create({
      data: {
        status,
        bid: { connect: { id: bidId } },
        listing: {
          create: {
            price: bid.price,
            quantity: quantityInOffer,
            isOffer: true,
            status: 'ACTIVE',
            account: { connect: { id: accountId } },
            entity: { connect: { id: bid.entityId } },
          },
        },
      },
      include: {
        listing: true,
        bid: true,
      },
    })

    res.json(offer)
  } catch (error) {
    const { statusCode, prismaError, customError } = generatePrismaError(error as Prisma.PrismaClientKnownRequestError)
    console.error('CREATE_OFFER_ERROR:', prismaError || customError)
    res.status(statusCode).send({ errorMessage: customError || 'Failed to create offer.' })
  }
})

/**
 * @openapi
 * /offer/{id}:
 *   put:
 *     tags:
 *       - Offer
 *     summary: Update an offer by ID
 *     description: Updates an existing offer. You can modify status, linked entities, or the account.
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *         description: The ID of the offer to update.
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               status:
 *                 type: string
 *               bidId:
 *                 type: string
 *               listingId:
 *                 type: string
 *               orderId:
 *                 type: string
 *               accountId:
 *                 type: string
 *     responses:
 *       '200':
 *         description: Successfully updated the offer.
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Offer'
 *       '404':
 *         description: Offer not found.
 *       '500':
 *         description: Internal Server Error.
 */
offerRouter.put('/offer/:id', async (req, res) => {
  const { id } = req.params
  const { status, accountId } = req.body

  try {
    if (!id) {
      throw new Error('Offer ID is required')
    }
    await validateAccount(req.user as AuthenticatedUser, accountId, 'seller')
    const updatedOffer = await prisma.offer.update({
      where: { id },
      data: { status },
    })
    res.json(updatedOffer)
  } catch (error) {
    const { statusCode, prismaError, customError } = generatePrismaError(error as Prisma.PrismaClientKnownRequestError)
    console.error('UPDATE_OFFER_ERROR:', prismaError || customError)
    res.status(statusCode).send({ errorMessage: customError || 'Failed to update offer.' })
  }
})

/**
 * @openapi
 * /offer/{id}:
 *   get:
 *     tags:
 *       - Offer
 *     summary: Get an offer by ID
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *       - in: query
 *         name: include
 *         required: false
 *         schema:
 *           type: string
 *     responses:
 *       '200':
 *         description: Successfully retrieved the offer.
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Offer'
 *       '404':
 *         description: Offer not found.
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 errorMessage:
 *                   type: string
 *       '500':
 *         description: Internal Server Error.
 */
offerRouter.get('/offer/:id', async (req, res) => {
  const { id } = req.params
  const { include } = req.query

  try {
    if (!id) {
      throw new Error('Offer ID is required')
    }
    const offer = await prisma.offer.findUnique({
      where: { id },
      include: generateIncludes(include),
    })

    if (offer) {
      res.json(offer)
    } else {
      res.status(404).send({ errorMessage: 'Offer not found.' })
    }
  } catch (error) {
    const { statusCode, prismaError, customError } = generatePrismaError(error as Prisma.PrismaClientKnownRequestError)
    console.error('GET_OFFER_ERROR:', prismaError, customError)
    res.status(statusCode).send({ errorMessage: customError || 'Failed to retrieve offer.' })
  }
})

/**
 * @openapi
 * /offer/{id}:
 *   delete:
 *     tags:
 *       - Offer
 *     summary: Delete an offer by ID
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *     responses:
 *       '200':
 *         description: Successfully deleted the offer.
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Offer'
 *       '404':
 *         description: Offer not found.
 *       '500':
 *         description: Internal Server Error.
 */
offerRouter.delete('/offer/:accountId/:id', async (req, res) => {
  const { id, accountId } = req.params

  try {
    if (!id) {
      throw new Error('Offer ID is required')
    }
    await validateAccount(req.user as AuthenticatedUser, accountId, 'customer')
    const offer = await prisma.offer.delete({
      where: { id },
    })
    res.json(offer)
  } catch (error) {
    const { statusCode, prismaError, customError } = generatePrismaError(error as Prisma.PrismaClientKnownRequestError)
    console.error('DELETE_OFFER_ERROR:', prismaError, customError)
    res.status(statusCode).send({ errorMessage: customError || 'Failed to delete offer.' })
  }
})
