import { Prisma, Status } from '@prisma/client'
import express from 'express'
import { generateIncludes } from '../utils/generateIncludes'
import { getPrismaClient, generatePrismaError } from '../utils/prismaHelpers'
import { resolveBids } from '../services/resolver'
import { createInvoiceBasedOnResolvedBids } from '../services/invoice'

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
  const { include, productId, profileId, status } = req.query
  try {
    const listings = await prisma.listing.findMany({
      where: {
        AND: [
          status ? { status: status as Status } : {},
          productId && profileId
            ? { productId: productId as string, profileId: profileId as string }
            : productId
            ? { productId: productId as string }
            : profileId
            ? { profileId: profileId as string }
            : {}
        ]
      },
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
 * /{marketplaceName}/{brandName}/listing/lowest-ask:
 *   get:
 *     tags:
 *       - Listing
 *     summary: Retrieve the lowest ask listing.
 *     description: Fetches the listing with the lowest price for a specific product in a given marketplace and brand. The listing returned is the one with the lowest price, and if multiple listings have the same price, the oldest listing is returned.
 *     parameters:
 *       - in: path
 *         name: marketplaceName
 *         required: true
 *         schema:
 *           type: string
 *         description: The name of the marketplace to retrieve the lowest ask from.
 *       - in: path
 *         name: brandName
 *         required: true
 *         schema:
 *           type: string
 *         description: The name of the brand to retrieve the lowest ask from.
 *       - in: query
 *         name: productId
 *         schema:
 *           type: string
 *         description: Filter listings by product ID.
 *       - in: query
 *         name: include
 *         schema:
 *           type: string
 *         description: Comma-separated list of related entities to include in the listing data (e.g., 'product,profile').
 *     responses:
 *       '200':
 *         description: Successfully retrieved the lowest ask listing.
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Listing'
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
listingRouter.get('/:marketplaceName/:brandName/listing/lowest-ask', async (req, res) => {
  const { include, productId } = req.query

  if (!productId) {
    throw new Error('Product ID is required to retrieve lowest ask listing')
  } else {
    try {
      const listing = await prisma.listing.findFirst({
        where: {
          AND: [
            { status: 'ACTIVE' },
            { productId: productId as string },
          ],
        },
        orderBy: [
          { price: 'asc' },
          { createdAt: 'asc' }
        ],
        include: generateIncludes(include)
      })
  
      res.json(listing)
    } catch (error) {
      const { statusCode, errorMessage } = generatePrismaError(error as Prisma.PrismaClientKnownRequestError)
      res.status(statusCode).send({ errorMessage })
    }
  }
})

/**
 * @openapi
 * /{marketplaceName}/{brandName}/listing:
 *   post:
 *     tags:
 *       - Listing
 *     summary: Create a new listing.
 *     description: Adds a new listing to the database for a specific marketplace and brand. The request body must include details like `price`, `quantity`, `status`, `profileId`, `productId`, and optionally `listingShippingCategories`. If the user already has a listing for this product, an error will be returned.
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
 *               price:
 *                 type: number
 *                 description: The price for the listing.
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
 *               listingShippingCategories:
 *                 type: object
 *                 description: Shipping categories to associate with the listing.
 *                 properties:
 *                   create:
 *                     type: array
 *                     description: List of shipping categories to create and associate with the listing.
 *                     items:
 *                       type: object
 *                       properties:
 *                         shippingCategoryId:
 *                           type: string
 *                           description: ID of the shipping category to associate.
 *             required:
 *               - price
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
 *               type: object
 *               properties:
 *                 id:
 *                   type: string
 *                   description: The ID of the newly created listing.
 *                 price:
 *                   type: number
 *                   description: The price for the listing.
 *                 quantity:
 *                   type: integer
 *                   description: The quantity of items in the listing.
 *                 status:
 *                   type: string
 *                   description: The status of the listing.
 *                 multiTransactionsEnabled:
 *                   type: boolean
 *                   description: Whether multiple transactions are enabled for the listing.
 *                 profileId:
 *                   type: string
 *                   description: The profile ID associated with the listing.
 *                 productId:
 *                   type: string
 *                   description: The product ID associated with the listing.
 *                 listingShippingCategories:
 *                   type: array
 *                   description: List of shipping categories associated with the listing.
 *                   items:
 *                     type: object
 *                     properties:
 *                       shippingCategoryId:
 *                         type: string
 *                         description: ID of the shipping category.
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
    price,
    quantity,
    status,
    multiTransactionsEnabled,
    profileId,
    productId,
    listingShippingCategories,
    listingCustomShippingOptions
  } = req.body

  try {
    const profile = await prisma.profile.findUnique({
      where: { id: profileId },
    })
    if (!profile) {
      throw new Error('Profile does not exist')
    }
    const userListing = await prisma.listing.findFirst({
      where: {
        AND: [
          { profileId: profileId },
          { productId: productId },
          { status: 'ACTIVE' }
        ],
      },
    })
    
    if (userListing) {
      throw new Error('User already has a listing for this product')
    } else if (price <= 0) {
      throw new Error('A listing cannot have a zero or negative price')
    } else {
      const listing = await prisma.listing.create({
        data: {
          price,
          quantity,
          status,
          multiTransactionsEnabled,
          profile: { connect: { id: profileId } },
          product: { connect: { id: productId } },
          listingShippingCategories: listingShippingCategories?.create?.length
            ? {
                create: listingShippingCategories.create?.map((listingShippingCategory: { shippingCategoryId: string }) => ({
                  shippingCategoryId: listingShippingCategory.shippingCategoryId,
                })),
              }
            : undefined,
          listingCustomShippingOptions: listingCustomShippingOptions?.create?.length
            ? {
                create: listingCustomShippingOptions.create?.map((listingCustomShippingOption: { shippingOptionId: string }) => ({
                  shippingOptionId: listingCustomShippingOption.shippingOptionId,
                })),
              }
            : undefined,
        },
        include: {
          profile: true
        }
      })
      const bids = await resolveBids(listing)

      if (bids.length) {
        await createInvoiceBasedOnResolvedBids(listing, bids)
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
 * /{marketplaceName}/{brandName}/listing/{id}:
 *   put:
 *     tags:
 *       - Listing
 *     summary: Update an existing listing.
 *     description: Updates an existing listing in the database for a specific marketplace and brand. The request body can include fields like `price`, `quantity`, `status`, and optionally `listingShippingCategories` for associating or disassociating shipping categories.
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
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *         description: The ID of the listing to be updated.
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               price:
 *                 type: number
 *                 description: The price for the listing.
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
 *               listingShippingCategories:
 *                 type: object
 *                 description: Manage shipping categories associated with the listing.
 *                 properties:
 *                   create:
 *                     type: array
 *                     description: List of shipping categories to create and associate with the listing.
 *                     items:
 *                       type: object
 *                       properties:
 *                         shippingCategoryId:
 *                           type: string
 *                           description: ID of the shipping category to associate.
 *                   delete:
 *                     type: array
 *                     description: List of shipping category associations to delete by their IDs.
 *                     items:
 *                       type: string
 *             required:
 *               - price
 *               - quantity
 *               - status
 *     responses:
 *       '200':
 *         description: Successfully updated the listing.
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 id:
 *                   type: string
 *                   description: The ID of the updated listing.
 *                 price:
 *                   type: number
 *                   description: The updated price for the listing.
 *                 quantity:
 *                   type: integer
 *                   description: The updated quantity of items in the listing.
 *                 status:
 *                   type: string
 *                   description: The updated status of the listing.
 *                 multiTransactionsEnabled:
 *                   type: boolean
 *                   description: Whether multiple transactions are enabled for the listing.
 *                 profileId:
 *                   type: string
 *                   description: The profile ID associated with the listing.
 *                 productId:
 *                   type: string
 *                   description: The product ID associated with the listing.
 *                 listingShippingCategories:
 *                   type: array
 *                   description: The updated list of shipping categories associated with the listing.
 *                   items:
 *                     type: object
 *                     properties:
 *                       id:
 *                         type: string
 *                         description: The ID of the shipping category association.
 *                       shippingCategoryId:
 *                         type: string
 *                         description: The ID of the shipping category.
 *       '400':
 *         description: Bad request, typically due to invalid request data or if the listing cannot be updated.
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
listingRouter.put(`/:marketplaceName/:brandName/listing/:id`, async (req, res) => {
  const { id } = req.params
  const { listingShippingCategories, listingCustomShippingOptions } = req.body

  try {
    const listing = await prisma.listing.update({
      where: { id },
      data: {
        ...req.body,
        listingShippingCategories: listingShippingCategories
          ? {
              create: listingShippingCategories.create?.map((listingShippingCategory: { shippingCategoryId: string }) => ({
                shippingCategoryId: listingShippingCategory.shippingCategoryId,
              })),
              deleteMany: listingShippingCategories.delete?.map((listingShippingCategoryId: string) => ({
                id: listingShippingCategoryId
              })),
            }
          : undefined,
        listingCustomShippingOptions: listingCustomShippingOptions
          ? {
              create: listingCustomShippingOptions.create?.map((listingCustomShippingOption: { shippingOptionId: string }) => ({
                shippingOptionId: listingCustomShippingOption.shippingOptionId,
              })),
              deleteMany: listingCustomShippingOptions.delete?.map((listingCustomShippingOptionId: string) => ({
                id: listingCustomShippingOptionId
              })),
            }
          : undefined,
      },
      include: {
        profile: true
      }
    })

    const bids = await resolveBids(listing)
    if (bids.length) {
      await createInvoiceBasedOnResolvedBids(listing, bids)
    }
    if (listing) {
      res.json(listing)
    } else {
      throw new Error('Cannot update listing by id')
    }
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
  
    if (listing) {
      res.json(listing)
    } else {
      throw new Error('No listing ID found')
    }
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
    await prisma.listingShippingCategory.deleteMany({
      where: {
        listingId: id,
      },
    })
    const listing = await prisma.listing.delete({
      where: { id },
    })
    
    if (listing) {
      res.json(listing)
    } else {
      throw new Error('No listing ID found')
    }
  } catch (error) {
    const { statusCode, errorMessage } = generatePrismaError(error as Prisma.PrismaClientKnownRequestError)
    res.status(statusCode).send({ errorMessage })
  }
})
