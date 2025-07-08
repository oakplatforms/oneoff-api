import { Prisma, Status } from '@prisma/client'
import express from 'express'
import { generateIncludes } from '../utils/generateIncludes'
import { getPrismaClient, generatePrismaError } from '../utils/prismaHelpers'
import { resolveListings } from '../services/resolver'
import { validateCustomer } from '../validation/customer'
import { validateExistingBid } from '../validation/bid'
import { paginatePrisma } from '../utils/paginatePrisma'

const prisma = getPrismaClient()
export const bidRouter = express.Router()

/**
 * @openapi
 * /bids:
 *   get:
 *     tags:
 *       - Bid
 *     summary: Retrieve bids by entity or profile.
 *     description: Fetches bids for a specific entity or profile. You can filter by `entityId`, `profileId`, or both. Optionally, include related entities using the `include` query parameter.
 *     parameters:
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
bidRouter.get('/bids', async (req, res) => {
  const { include, entityId, accountId, status, usePagination, page, limit } = req.query

  try {
    const parsedLimit = parseInt(limit as string) || 10
    const parsedPage = parseInt(page as string) || 0

    const where = {
      AND: [
        status ? { status: status as Status } : {},
        entityId && accountId
          ? { entityId: entityId as string, accountId: accountId as string }
          : entityId
            ? { entityId: entityId as string }
            : accountId
              ? { accountId: accountId as string }
              : {}
      ]
    }

    const result = await paginatePrisma({
      prismaModel: prisma.bid,
      where,
      include: generateIncludes(include),
      page: parsedPage,
      limit: parsedLimit,
      usePagination: usePagination === 'false' ? false : true,
    })

    res.json(result)
  } catch (error) {
    const { statusCode, prismaError } = generatePrismaError(error as Prisma.PrismaClientKnownRequestError)
    console.error('GET_BIDS_ERROR:', prismaError)
    res.status(statusCode).send({ errorMessage: 'Failed to retrieve bids.' })
  }
})

/**
 * @openapi
 * /bid/highest-bid:
 *   get:
 *     tags:
 *       - Bid
 *     summary: Retrieve the highest active bid for a specific entity.
 *     description: Fetches the highest active bid placed for a specific entity (product) by price. If there are ties, the earliest created bid will be returned.
 *     parameters:
 *       - name: entityId
 *         in: query
 *         description: The unique ID of the entity (product) to find the highest bid for.
 *         required: true
 *         schema:
 *           type: string
 *       - name: include
 *         in: query
 *         description: Optional query parameter to include related data (e.g., account, product details).
 *         schema:
 *           type: string
 *     responses:
 *       '200':
 *         description: Successfully retrieved the highest bid.
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Bid'
 *       '400':
 *         description: Missing entity ID or invalid parameters.
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 errorMessage:
 *                   type: string
 *                   description: Description of the validation error.
 *       '500':
 *         description: Internal server error, typically due to database or server issues.
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 errorMessage:
 *                   type: string
 *                   description: Detailed error message for debugging.
 */
bidRouter.get('/bid/highest-bid', async (req, res) => {
  const { include, entityId } = req.query

  if (!entityId) {
    res.status(400).send({ errorMessage: 'Entity ID is required to retrieve highest bid' })
    return
  }

  try {
    const bid = await prisma.bid.findFirst({
      where: {
        AND: [
          { status: 'ACTIVE' },
          { entityId: entityId as string },
        ],
      },
      orderBy: [
        { price: 'desc' },
        { createdAt: 'asc' }
      ],
      include: generateIncludes(include)
    })

    res.json(bid)
  } catch (error) {
    const { statusCode, prismaError } = generatePrismaError(error as Prisma.PrismaClientKnownRequestError)
    console.error('GET_HIGHEST_BID_ERROR:', prismaError)
    res.status(statusCode).send({ errorMessage: 'Failed to retrieve highest bid.' })
  }
})

/**
 * @openapi
 * /bid:
 *   post:
 *     tags:
 *       - Bid
 *     summary: Create a new bid.
 *     description: Adds a new bid to the database. If a bid for the specified entity and profile already exists, it will return an error. Otherwise, the bid is created, and any relevant listings are resolved to create bid transactions.
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
bidRouter.post(`/bid`, async (req, res) => {
  const {
    price,
    quantity,
    status,
    multiTransactionsEnabled,
    accountId,
    entityId
  } = req.body
  try {
    await validateCustomer(accountId)
    const userBid = await prisma.bid.findFirst({
      where: {
        AND: [
          { accountId: accountId },
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
        accountId,
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
          account: { connect: { id: accountId } },
          entity: { connect: { id: entityId } }
        },
        include: {
          account: true
        }
      })
      res.json(bid)
    }
  } catch (error) {
    const { statusCode, prismaError, customError } = generatePrismaError(error as Prisma.PrismaClientKnownRequestError)
    console.error('CREATE_BID_ERROR:', prismaError)
    res.status(statusCode).send({ errorMessage: customError || 'Failed to create bid.' })
  }
})

/**
 * @openapi
 * /bid/{id}:
 *   put:
 *     tags:
 *       - Bid
 *     summary: Update a bid by its ID.
 *     description: Updates an existing bid by its unique ID. Any fields provided in the request body will be updated. If successful, the updated bid is returned.
 *     parameters:
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
bidRouter.put(`/bid/:id`, async (req, res) => {
  const { id } = req.params
  const {
    price,
    entityId,
    accountId,
  } = req.body
  try {
    await validateCustomer(accountId)
    await validateExistingBid(id)

    const listings = await resolveListings({
      price,
      entityId,
      accountId,
    })

    if (listings.length) {
      throw new Error('A cheaper listing already exists for this entity. To proceed, decrease your price or buy an existing listing.')
    }

    const bid = await prisma.bid.update({
      where: { id },
      data: {
        ...req.body,
      },
      include: {
        account: true
      }
    })
    if (bid) {
      res.json(bid)
    } else {
      throw new Error('Cannot update Bid by id')
    }
  } catch (error) {
    const { statusCode, prismaError, customError } = generatePrismaError(error as Prisma.PrismaClientKnownRequestError)
    console.error('UPDATE_BID_ERROR:', prismaError || customError)
    res.status(statusCode).send({ errorMessage: customError || 'Failed to update bid.' })
  }
})

/**
 * @openapi
 * /bid/{id}:
 *   get:
 *     tags:
 *       - Bid
 *     summary: Get a bid by its ID.
 *     description: Retrieves a bid by its unique ID. Optionally, related entities can be included in the response by passing the `include` query parameter.
 *     parameters:
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
bidRouter.get('/bid/:id', async (req, res) => {
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
    const { statusCode, prismaError } = generatePrismaError(error as Prisma.PrismaClientKnownRequestError)
    console.error('GET_BID_ERROR:', prismaError)
    res.status(statusCode).send({ errorMessage: 'Failed to retrieve bid.' })
  }
})

/**
 * @openapi
 * /bid/{id}:
 *   delete:
 *     tags:
 *       - Bid
 *     summary: Delete a bid by its ID.
 *     description: Deletes a bid by its unique ID. If the bid is successfully deleted, the deleted bid object will be returned.
 *     parameters:
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
bidRouter.delete(`/bid/:id`, async (req, res) => {
  const { id } = req.params

  try {
    const bid = await prisma.bid.delete({
      where: { id },
    })

    if (bid) {
      res.json(bid)
    } else {
      throw new Error('No bid ID found')
    }
  } catch (error) {
    const { statusCode, prismaError } = generatePrismaError(error as Prisma.PrismaClientKnownRequestError)
    console.error('DELETE_BID_ERROR:', prismaError)
    res.status(statusCode).send({ errorMessage: 'Failed to delete bid.' })
  }
})
