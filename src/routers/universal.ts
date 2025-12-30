import express from 'express'
import { getPrismaClient, generatePrismaError } from '../utils/prismaHelpers'
import { validateTickerFormat } from '../validation/ticker'
import { Prisma } from '@prisma/client'
import { generateIncludes } from '../utils/generateIncludes'

const prisma = getPrismaClient()
export const universalRouter = express.Router()

/**
 * @openapi
 * /{ticker}:
 *   get:
 *     tags:
 *       - Universal
 *     summary: Retrieve a record by its 6-character ticker
 *     description: |
 *       Universal endpoint that fetches any record by its ticker.
 *       The first character determines the table:
 *       - B → Bid
 *       - P → Product
 *       - S → Listing
 *       - C → List (type COLLECTION)
 *       - F → List (type FAVORITE)
 *     parameters:
 *       - in: path
 *         name: ticker
 *         required: true
 *         schema:
 *           type: string
 *           pattern: '^[A-Z0-9]{6}$'
 *         description: The 6-character ticker (e.g., B72UE9, S3K4M2, C8R9T4)
 *       - in: query
 *         name: include
 *         schema:
 *           type: string
 *         description: Comma-separated list of related entities to include in the response
 *     responses:
 *       '200':
 *         description: Successfully retrieved the record
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 type:
 *                   type: string
 *                   enum: [Bid, Product, Listing, List]
 *                   description: The type of record returned
 *                 data:
 *                   type: object
 *                   description: The record data
 *       '400':
 *         description: Invalid ticker format
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 errorMessage:
 *                   type: string
 *       '404':
 *         description: Record not found
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 errorMessage:
 *                   type: string
 *       '500':
 *         description: Internal server error
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 errorMessage:
 *                   type: string
 */
universalRouter.get('/:ticker', async (req, res) => {
  const { ticker } = req.params
  const { include } = req.query

  try {
    // Validate ticker format
    validateTickerFormat(ticker)

    const prefix = ticker[0].toUpperCase()
    const includes = generateIncludes(include as string)

    let record: any = null
    let recordType: string = ''

    switch (prefix) {
      case 'B':
        // Bid
        record = await prisma.bid.findUnique({
          where: { ticker: ticker.toUpperCase() },
          include: includes
        })
        recordType = 'Bid'
        break

      case 'P':
        // Product
        record = await prisma.product.findUnique({
          where: { ticker: ticker.toUpperCase() },
          include: includes
        })
        recordType = 'Product'
        break

      case 'S':
        // Listing
        record = await prisma.listing.findUnique({
          where: { ticker: ticker.toUpperCase() },
          include: includes
        })
        recordType = 'Listing'
        break

      case 'C':
        // List (COLLECTION)
        record = await prisma.list.findFirst({
          where: {
            ticker: ticker.toUpperCase(),
            type: 'COLLECTION'
          },
          include: includes
        })
        recordType = 'List'
        break

      case 'F':
        // List (FAVORITE)
        record = await prisma.list.findFirst({
          where: {
            ticker: ticker.toUpperCase(),
            type: 'FAVORITE'
          },
          include: includes
        })
        recordType = 'List'
        break

      default:
        throw new Error(`Invalid ticker prefix '${prefix}'. Valid prefixes are: B, P, S, C, F`)
    }

    if (!record) {
      return res.status(404).json({
        errorMessage: `No ${recordType} found with ticker ${ticker}`
      })
    }

    res.json({
      type: recordType,
      data: record
    })

  } catch (error) {
    const { statusCode, prismaError, customError } = generatePrismaError(error as Prisma.PrismaClientKnownRequestError)
    console.error('UNIVERSAL_TICKER_ERROR:', prismaError || customError)
    res.status(statusCode).send({ errorMessage: customError || 'Failed to retrieve record by ticker.' })
  }
})

