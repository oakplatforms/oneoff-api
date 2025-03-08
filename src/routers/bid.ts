import { Prisma, Status } from '@prisma/client'
import express from 'express'
import { generateIncludes } from '../utils/generateIncludes'
import { getPrismaClient, generatePrismaError } from '../utils/prismaHelpers'
import { resolveListings } from '../services/resolver'

const prisma = getPrismaClient()
export const bidRouter = express.Router()

/**
 * @openapi
 * /{marketplaceName}/{brandName}/bids:
 *   get:
 *     tags:
 *       - Bid
 *     summary: Retrieve bids by entity or profile.
 *     description: Fetches bids for a specific entity or profile. You can filter by `entityId`, `profileId`, or both. Optionally, include related entities using the `include` query parameter.
 *     parameters:
 *       - in: path
 *         name: marketplaceName
 *         required: true
 *         schema:
 *           type: string
 *         description: The name of the marketplace for which to retrieve the bids.
 *       - in: path
 *         name: brandName
 *         required: true
 *         schema:
 *           type: string
 *         description: The name of the brand for which to retrieve the bids.
 *       - in: query
 *         name: entityId
 *         schema:
 *           type: string
 *         description: The entity ID to filter bids by.
 *       - in: query
 *         name: profileId
 *         schema:
 *           type: string
 *         description: The profile ID to filter bids by.
 *       - in: query
 *         name: include
 *         schema:
 *           type: string
 *         description: Comma-separated list of related entities to include in the bid data (e.g., 'listing,profile').
 *     responses:
 *       '200':
 *         description: Successfully retrieved the bids.
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Bid'
 *       '400':
 *         description: Bad request, typically due to invalid parameters or missing filters.
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
bidRouter.get('/:marketplaceName/:brandName/bids', async (req, res) => {
  const { include, entityId, createdById, status } = req.query
  try {
    const bids = await prisma.bid.findMany({
      where: {
        AND: [
          status ? { status: status as Status } : {},
          entityId && createdById
            ? { entityId: entityId as string, createdById: createdById as string }
            : entityId
              ? { entityId: entityId as string }
              : createdById
                ? { createdById: createdById as string }
                : {}
        ]
      },
      include: generateIncludes(include)
    })
    res.json(bids)
  } catch (error) {
    const { statusCode, errorMessage } = generatePrismaError(error as Prisma.PrismaClientKnownRequestError)
    res.status(statusCode).send({ errorMessage })
  }
})

/**
 * @openapi
 * /{marketplaceName}/{brandName}/bid:
 *   post:
 *     tags:
 *       - Bid
 *     summary: Create a new bid.
 *     description: Adds a new bid to the database. If a bid for the specified entity and profile already exists, it will return an error. Otherwise, the bid is created, and any relevant listings are resolved to create bid transactions.
 *     parameters:
 *       - in: path
 *         name: marketplaceName
 *         required: true
 *         schema:
 *           type: string
 *         description: The name of the marketplace where the bid is being made.
 *       - in: path
 *         name: brandName
 *         required: true
 *         schema:
 *           type: string
 *         description: The name of the brand for which the bid is being made.
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               price:
 *                 type: number
 *                 description: The price of the bid.
 *               quantity:
 *                 type: integer
 *                 description: The quantity being bid.
 *               status:
 *                 type: string
 *                 description: The status of the bid (e.g., 'ACTIVE').
 *               multiTransactionsEnabled:
 *                 type: boolean
 *                 description: Whether multiple transactions are enabled for the bid.
 *               profileId:
 *                 type: string
 *                 description: The ID of the profile associated with the bid.
 *               entityId:
 *                 type: string
 *                 description: The ID of the entity associated with the bid.
 *               shippingCategories:
 *                 type: object
 *                 description: Manage shipping categories associated with the bid.
 *                 properties:
 *                   create:
 *                     type: array
 *                     description: List of shipping categories to associate with the bid.
 *                     items:
 *                       type: object
 *                       properties:
 *                         id:
 *                           type: string
 *                           description: The ID of the shipping category.
 *             required:
 *               - price
 *               - quantity
 *               - status
 *               - profileId
 *               - entityId
 *     responses:
 *       '200':
 *         description: Successfully created a new bid.
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 id:
 *                   type: string
 *                   description: The ID of the created bid.
 *                 price:
 *                   type: number
 *                   description: The price of the bid.
 *                 quantity:
 *                   type: integer
 *                   description: The quantity of the bid.
 *                 status:
 *                   type: string
 *                   description: The status of the bid.
 *                 multiTransactionsEnabled:
 *                   type: boolean
 *                   description: Whether multiple transactions are enabled for the bid.
 *                 profileId:
 *                   type: string
 *                   description: The ID of the profile associated with the bid.
 *                 entityId:
 *                   type: string
 *                   description: The ID of the entity associated with the bid.
 *                 shippingCategories:
 *                   type: array
 *                   description: The shipping categories associated with the bid.
 *                   items:
 *                     type: object
 *                     properties:
 *                       id:
 *                         type: string
 *                         description: The ID of the shipping category.
 *       '400':
 *         description: Bad request, typically if the user already has a bid for the entity or if invalid data is provided.
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
bidRouter.post(`/:marketplaceName/:brandName/bid`, async (req, res) => {
  const {
    price,
    quantity,
    status,
    multiTransactionsEnabled,
    createdById,
    entityId,
    bidShippingCategories,
    bidCustomShippingOptions
  } = req.body
  try {
    const account = await prisma.account.findUnique({
      where: { id: createdById },
    })
    if (!account) {
      throw new Error('Account does not exist')
    }
    const userBid = await prisma.bid.findFirst({
      where: {
        AND: [
          { createdById: createdById },
          { entityId: entityId },
          { status: 'ACTIVE' }
        ],
      },
    })
    if (userBid) {
      throw new Error('User already has a bid for this entity')
    } else if (price <= 0) {
      throw new Error('A bid cannot have a zero or negative price')
    } else {
      const listings = await resolveListings({
        price,
        entityId,
        createdById,
      })

      if (listings.length) {
        throw new Error('A cheaper listing already exists for this entity. To proceed, decrease your price or buy an existing listing.')
      }

      const bid = await prisma.bid.create({
        data: {
          price,
          quantity,
          status,
          multiTransactionsEnabled,
          createdBy: { connect: { id: createdById } },
          entity: { connect: { id: entityId } },
          bidShippingCategories: bidShippingCategories?.create?.length
            ? {
              create: bidShippingCategories.create?.map((bidShippingCategory: { shippingCategoryId: string }) => ({
                shippingCategoryId: bidShippingCategory.shippingCategoryId,
              })),
            }
            : undefined,
          bidCustomShippingOptions: bidCustomShippingOptions?.create?.length
            ? {
              create: bidCustomShippingOptions.create?.map((bidCustomShippingOption: { shippingOptionId: string }) => ({
                shippingOptionId: bidCustomShippingOption.shippingOptionId,
              })),
            }
            : undefined,
        },
        include: {
          createdBy: true
        }
      })
      res.json(bid)
    }
  } catch (error) {
    const { statusCode, errorMessage } = generatePrismaError(error as Prisma.PrismaClientKnownRequestError)
    res.status(statusCode).send({ errorMessage })
  }
})

/**
 * @openapi
 * /{marketplaceName}/{brandName}/bid/{id}:
 *   put:
 *     tags:
 *       - Bid
 *     summary: Update a bid by its ID.
 *     description: Updates an existing bid by its unique ID. Any fields provided in the request body will be updated. If successful, the updated bid is returned.
 *     parameters:
 *       - in: path
 *         name: marketplaceName
 *         required: true
 *         schema:
 *           type: string
 *         description: The name of the marketplace for which the bid is being updated.
 *       - in: path
 *         name: brandName
 *         required: true
 *         schema:
 *           type: string
 *         description: The name of the brand for which the bid is being updated.
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *         description: The unique ID of the bid to update.
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               price:
 *                 type: number
 *                 description: The new price of the bid.
 *               quantity:
 *                 type: integer
 *                 description: The new quantity of the bid.
 *               status:
 *                 type: string
 *                 description: The new status of the bid (e.g., 'ACTIVE').
 *               multiTransactionsEnabled:
 *                 type: boolean
 *                 description: Whether multiple transactions are enabled for the bid.
 *               profileId:
 *                 type: string
 *                 description: The ID of the profile associated with the bid.
 *               entityId:
 *                 type: string
 *                 description: The ID of the entity associated with the bid.
 *     responses:
 *       '200':
 *         description: Successfully updated the bid.
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Bid'
 *       '400':
 *         description: Bad request, typically due to invalid bid ID or request data.
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
bidRouter.put(`/:marketplaceName/:brandName/bid/:id`, async (req, res) => {
  const { id } = req.params
  const {
    price,
    entityId,
    createdById,
    bidShippingCategories,
    bidCustomShippingOptions
  } = req.body
  try {
    const existingBid = await prisma.bid.findUnique({
      where: { id },
    })

    if (!existingBid) {
      throw new Error('Bid does not exist')
    }

    const listings = await resolveListings({
      price,
      entityId,
      createdById,
    })

    if (listings.length) {
      throw new Error('A cheaper listing already exists for this entity. To proceed, decrease your price or buy an existing listing.')
    }

    const bid = await prisma.bid.update({
      where: { id },
      data: {
        ...req.body,
        bidShippingCategories: bidShippingCategories
          ? {
            create: bidShippingCategories.create?.map((bidShippingCategory: { shippingCategoryId: string }) => ({
              shippingCategoryId: bidShippingCategory.shippingCategoryId,
            })),
            deleteMany: bidShippingCategories.delete?.map((bidShippingCategoryId: string) => ({
              id: bidShippingCategoryId
            })),
          }
          : undefined,
        bidCustomShippingOptions: bidCustomShippingOptions
          ? {
            create: bidCustomShippingOptions.create?.map((bidCustomShippingOption: { shippingOptionId: string }) => ({
              shippingOptionId: bidCustomShippingOption.shippingOptionId,
            })),
            deleteMany: bidCustomShippingOptions.delete?.map((bidCustomShippingOptionId: string) => ({
              id: bidCustomShippingOptionId
            })),
          }
          : undefined,
      },
      include: {
        createdBy: true
      }
    })
    if (bid) {
      res.json(bid)
    } else {
      throw new Error('Cannot update Bid by id')
    }
  } catch (error) {
    const { statusCode, errorMessage } = generatePrismaError(error as Prisma.PrismaClientKnownRequestError)
    res.status(statusCode).send({ errorMessage })
  }
})

/**
 * @openapi
 * /{marketplaceName}/{brandName}/bid/{id}:
 *   get:
 *     tags:
 *       - Bid
 *     summary: Get a bid by its ID.
 *     description: Retrieves a bid by its unique ID. Optionally, related entities can be included in the response by passing the `include` query parameter.
 *     parameters:
 *       - in: path
 *         name: marketplaceName
 *         required: true
 *         schema:
 *           type: string
 *         description: The name of the marketplace.
 *       - in: path
 *         name: brandName
 *         required: true
 *         schema:
 *           type: string
 *         description: The name of the brand.
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *         description: The unique ID of the bid to retrieve.
 *       - in: query
 *         name: include
 *         schema:
 *           type: string
 *         description: Related entities to include in the response (e.g., profile, entity).
 *     responses:
 *       '200':
 *         description: Successfully retrieved the bid.
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Bid'
 *       '400':
 *         description: Bad request, typically due to an invalid bid ID.
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 errorMessage:
 *                   type: string
 *                   description: Description of the error that occurred.
 *       '404':
 *         description: No bid found with the provided ID.
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
bidRouter.get('/:marketplaceName/:brandName/bid/:id', async (req, res) => {
  const { id } = req.params
  const { include } = req.query

  try {
    const bid = await prisma.bid.findUnique({
      where: { id },
      include: generateIncludes(include)
    })

    if (bid) {
      res.json(bid)
    } else {
      throw new Error('No bid ID found')
    }
  } catch (error) {
    const { statusCode, errorMessage } = generatePrismaError(error as Prisma.PrismaClientKnownRequestError)
    res.status(statusCode).send({ errorMessage })
  }
})

/**
 * @openapi
 * /{marketplaceName}/{brandName}/bid/{id}:
 *   delete:
 *     tags:
 *       - Bid
 *     summary: Delete a bid by its ID.
 *     description: Deletes a bid by its unique ID. If the bid is successfully deleted, the deleted bid object will be returned.
 *     parameters:
 *       - in: path
 *         name: marketplaceName
 *         required: true
 *         schema:
 *           type: string
 *         description: The name of the marketplace.
 *       - in: path
 *         name: brandName
 *         required: true
 *         schema:
 *           type: string
 *         description: The name of the brand.
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *         description: The unique ID of the bid to delete.
 *     responses:
 *       '200':
 *         description: Successfully deleted the bid.
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Bid'
 *       '400':
 *         description: Bad request, typically due to an invalid bid ID.
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 errorMessage:
 *                   type: string
 *                   description: Description of the error that occurred.
 *       '404':
 *         description: No bid found with the provided ID.
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
bidRouter.delete(`/:marketplaceName/:brandName/bid/:id`, async (req, res) => {
  const { id } = req.params

  try {
    await prisma.bidShippingCategory.deleteMany({
      where: {
        bidId: id,
      },
    })
    const bid = await prisma.bid.delete({
      where: { id },
    })

    if (bid) {
      res.json(bid)
    } else {
      throw new Error('No bid ID found')
    }
  } catch (error) {
    const { statusCode, errorMessage } = generatePrismaError(error as Prisma.PrismaClientKnownRequestError)
    res.status(statusCode).send({ errorMessage })
  }
})
