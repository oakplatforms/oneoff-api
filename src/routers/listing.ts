import { PrismaClient, Prisma } from '@prisma/client'
import express from 'express'
import { generateIncludes } from '../utils/generateIncludes'
import { getPrismaClient, generatePrismaError } from '../utils/prismaHelpers'
import { resolveBids } from '../services/resolver'
import { createListingTransactions } from '../services/transaction'

const prisma = getPrismaClient()
export const listingRouter = express.Router()

/**
 * @openapi
 * /{marketplaceName}/{brandName}/listings:
 *   get:
 *     tags:
 *       - Listing
 *     summary: Retrieve a list of listings.
 *     description: Fetches a list of listings for a specific marketplace and brand. Optional query parameters can be used to filter listings by `productId` or `profileId`, and to include related data.
 *     parameters:
 *       - in: path
 *         name: marketplaceName
 *         required: true
 *         schema:
 *           type: string
 *         description: The name of the marketplace to retrieve listings from.
 *       - in: path
 *         name: brandName
 *         required: true
 *         schema:
 *           type: string
 *         description: The name of the brand to retrieve listings from.
 *       - in: query
 *         name: productId
 *         schema:
 *           type: string
 *         description: Filter listings by product ID.
 *       - in: query
 *         name: profileId
 *         schema:
 *           type: string
 *         description: Filter listings by profile ID.
 *       - in: query
 *         name: include
 *         schema:
 *           type: string
 *         description: Comma-separated list of related entities to include in the listing data (e.g., 'product,profile').
 *     responses:
 *       '200':
 *         description: Successfully retrieved the list of listings.
 *         content:
 *           application/json:
 *             schema:
 *               type: array
 *               items:
 *                 $ref: '#/components/schemas/Listing'
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
listingRouter.get('/:marketplaceName/:brandName/listings', async (req, res) => {
  const { include, productId, profileId } = req.query
  try {
    const listings = await prisma.listing.findMany({
      where: productId || profileId ? {
        OR: [
          productId ? { productId: productId as string } : {},
          profileId ? { profileId: profileId as string } : {}
        ]
      } : {},
      include: generateIncludes(include)
    })
    res.json(listings)
  } catch (error) {
    const { statusCode, errorMessage } = generatePrismaError(error as Prisma.PrismaClientKnownRequestError)
    res.status(statusCode).send({ errorMessage })
  }
})

/**
 * @openapi
 * /{marketplaceName}/{brandName}/listing:
 *   post:
 *     tags:
 *       - Listing
 *     summary: Create a new listing.
 *     description: Adds a new listing to the database for a specific marketplace and brand. The request body must include details like `amount`, `quantity`, `status`, `profileId`, and `productId`. If the user already has a listing for this product, an error will be returned.
 *     parameters:
 *       - in: path
 *         name: marketplaceName
 *         required: true
 *         schema:
 *           type: string
 *         description: The name of the marketplace for the listing.
 *       - in: path
 *         name: brandName
 *         required: true
 *         schema:
 *           type: string
 *         description: The name of the brand for the listing.
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               amount:
 *                 type: number
 *                 description: The amount for the listing.
 *               quantity:
 *                 type: integer
 *                 description: The quantity of items in the listing.
 *               status:
 *                 type: string
 *                 description: The status of the listing.
 *               multiTransactionsEnabled:
 *                 type: boolean
 *                 description: Whether multiple transactions are enabled for the listing.
 *               profileId:
 *                 type: string
 *                 description: The profile ID associated with the listing.
 *               productId:
 *                 type: string
 *                 description: The product ID associated with the listing.
 *             required:
 *               - amount
 *               - quantity
 *               - status
 *               - profileId
 *               - productId
 *     responses:
 *       '200':
 *         description: Successfully created a new listing.
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Listing'
 *       '400':
 *         description: Bad request, typically due to invalid request data or if the user already has a listing for the product.
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
listingRouter.post(`/:marketplaceName/:brandName/listing`, async (req, res) => {
  const {
    amount,
    quantity,
    status,
    multiTransactionsEnabled,
    profileId,
    productId
  } = req.body

  try {
    const userListing = await prisma.listing.findFirst({
      where: {
        AND: [
          { profileId: profileId },
          { productId: productId },
        ],
      },
    })

    if (userListing) {
      res.json({ errorMessage: 'User already has a listing for this product' })
    } else {
      const listing = await prisma.listing.create({
        data: {
          amount,
          quantity,
          status,
          multiTransactionsEnabled,
          profile: { connect: { id: profileId } },
          product: { connect: { id: productId } }
        },
      })
  
      const bids = await resolveBids(listing)
      if (bids.length) {
        createListingTransactions(listing, bids)
      }

      res.json(listing)
    }

  } catch (error) {
    const { statusCode, errorMessage } = generatePrismaError(error as Prisma.PrismaClientKnownRequestError)
    res.status(statusCode).send({ errorMessage })
  }
})

/**
 * @openapi
 * /{marketplaceName}/{brandName}/listing/{listingId}/purchase:
 *   put:
 *     tags:
 *       - Listing
 *     summary: Purchase a listing.
 *     description: Creates a bid for a listing and processes the transaction. The request body must include the `profileId` of the buyer. If the listing is found, a bid will be created and the listing transactions will be processed.
 *     parameters:
 *       - in: path
 *         name: marketplaceName
 *         required: true
 *         schema:
 *           type: string
 *         description: The name of the marketplace for the listing.
 *       - in: path
 *         name: brandName
 *         required: true
 *         schema:
 *           type: string
 *         description: The name of the brand for the listing.
 *       - in: path
 *         name: listingId
 *         required: true
 *         schema:
 *           type: string
 *         description: The unique ID of the listing to be purchased.
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               profileId:
 *                 type: string
 *                 description: The profile ID of the buyer who is purchasing the listing.
 *             required:
 *               - profileId
 *     responses:
 *       '200':
 *         description: Successfully processed the purchase of the listing.
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Listing'
 *       '400':
 *         description: Bad request, typically due to invalid request data or if the listing cannot be found.
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
listingRouter.put(`/:marketplaceName/:brandName/listing/:listingId/purchase`, async (req, res) => {
  const { listingId } = req.params
  const { profileId } = req.body

  try {
    const listing = await prisma.listing.findUnique({
      where: {
        id: listingId,
      },
    })

    if (listing) {
      const bid = await prisma.bid.create({
        data: {
          amount: listing.amount,
          quantity: listing.quantity,
          status: 'ACTIVE',
          multiTransactionsEnabled: false,
          profile: { connect: { id: profileId } },
          product: { connect: { id: listing.productId as string } }
        },
      })

      createListingTransactions(listing, [bid])
    }

    res.json(listing)
  } catch (error) {
    const { statusCode, errorMessage } = generatePrismaError(error as Prisma.PrismaClientKnownRequestError)
    res.status(statusCode).send({ errorMessage })
  }
})

/**
 * @openapi
 * /{marketplaceName}/{brandName}/listing/{listingId}:
 *   put:
 *     tags:
 *       - Listing
 *     summary: Update a listing.
 *     description: Updates the details of an existing listing. The request body can contain any field to update. After updating the listing, related bids are resolved, and transactions may be created.
 *     parameters:
 *       - in: path
 *         name: marketplaceName
 *         required: true
 *         schema:
 *           type: string
 *         description: The name of the marketplace for the listing.
 *       - in: path
 *         name: brandName
 *         required: true
 *         schema:
 *           type: string
 *         description: The name of the brand for the listing.
 *       - in: path
 *         name: listingId
 *         required: true
 *         schema:
 *           type: string
 *         description: The unique ID of the listing to be updated.
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               amount:
 *                 type: number
 *                 description: The updated amount for the listing.
 *               quantity:
 *                 type: integer
 *                 description: The updated quantity of items in the listing.
 *               status:
 *                 type: string
 *                 description: The updated status of the listing.
 *               multiTransactionsEnabled:
 *                 type: boolean
 *                 description: Whether multiple transactions are enabled for the listing.
 *               profileId:
 *                 type: string
 *                 description: The profile ID associated with the listing.
 *               productId:
 *                 type: string
 *                 description: The product ID associated with the listing.
 *             additionalProperties: true
 *             description: Any fields related to the listing can be updated.
 *     responses:
 *       '200':
 *         description: Successfully updated the listing.
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Listing'
 *       '400':
 *         description: Bad request, typically due to invalid request data or inability to update the listing.
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
listingRouter.put(`/:marketplaceName/:brandName/listing/:listingId`, async (req, res) => {
  const { listingId } = req.params

  try {
    const listing = await prisma.listing.update({
      where: { id: listingId },
      data: {
        ...req.body,
      }
    })

    const bids = await resolveBids(listing)
    if (bids.length) {
      createListingTransactions(listing, bids)
    }

    res.json(listing || { errorMessage: 'Something went wrong: Cannot update listing by id' })
  } catch (error) {
    const { statusCode, errorMessage } = generatePrismaError(error as Prisma.PrismaClientKnownRequestError)
    res.status(statusCode).send({ errorMessage })
  }
})

/**
 * @openapi
 * /{marketplaceName}/{brandName}/listing/{id}:
 *   get:
 *     tags:
 *       - Listing
 *     summary: Retrieve a specific listing by ID.
 *     description: Fetches the details of a listing by its unique ID. You can optionally include related entities using the `include` query parameter.
 *     parameters:
 *       - in: path
 *         name: marketplaceName
 *         required: true
 *         schema:
 *           type: string
 *         description: The name of the marketplace to retrieve the listing from.
 *       - in: path
 *         name: brandName
 *         required: true
 *         schema:
 *           type: string
 *         description: The name of the brand to retrieve the listing from.
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *         description: The unique ID of the listing to retrieve.
 *       - in: query
 *         name: include
 *         schema:
 *           type: string
 *         description: Comma-separated list of related entities to include in the listing data (e.g., 'product,profile').
 *     responses:
 *       '200':
 *         description: Successfully retrieved the listing.
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Listing'
 *       '400':
 *         description: Bad request, typically due to invalid parameters or if the listing ID is not found.
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
listingRouter.get('/:marketplaceName/:brandName/listing/:id', async (req, res) => {
  const { id } = req.params
  const { include } = req.query

  try {
    const listing = await prisma.listing.findUnique({
      where: { id },
      include: generateIncludes(include)
    })
  
    res.json(listing || { errorMessage: 'Something went wrong: No listing ID found' })
  } catch (error) {
    const { statusCode, errorMessage } = generatePrismaError(error as Prisma.PrismaClientKnownRequestError)
    res.status(statusCode).send({ errorMessage })
  }
})

/**
 * @openapi
 * /{marketplaceName}/{brandName}/listing/{id}:
 *   delete:
 *     tags:
 *       - Listing
 *     summary: Delete a specific listing by ID.
 *     description: Deletes a listing by its unique ID from the specified marketplace and brand.
 *     parameters:
 *       - in: path
 *         name: marketplaceName
 *         required: true
 *         schema:
 *           type: string
 *         description: The name of the marketplace to delete the listing from.
 *       - in: path
 *         name: brandName
 *         required: true
 *         schema:
 *           type: string
 *         description: The name of the brand to delete the listing from.
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *         description: The unique ID of the listing to delete.
 *     responses:
 *       '200':
 *         description: Successfully deleted the listing.
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Listing'
 *       '400':
 *         description: Bad request, typically due to invalid parameters or if the listing ID is not found.
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
listingRouter.delete(`/:marketplaceName/:brandName/listing/:id`, async (req, res) => {
  const { id } = req.params

  try {
    const listing = await prisma.listing.delete({
      where: { id: id },
    })
    res.json(listing || { errorMessage: 'Something went wrong: No listing ID found' })
  } catch (error) {
    const { statusCode, errorMessage } = generatePrismaError(error as Prisma.PrismaClientKnownRequestError)
    res.status(statusCode).send({ errorMessage })
  }
})
