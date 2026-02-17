import { Prisma, Status } from '@prisma/client'
import express from 'express'
import { getPrismaClient, generatePrismaError } from '../utils/prismaHelpers'
import { validateAccount, AuthenticatedUser } from '../validation/user'

export const feedRouter = express.Router()

const prisma = getPrismaClient()

type FeedItemType = 'listing'

interface FeedItem {
  type: FeedItemType
  id: string
  createdAt: Date
  data: unknown
}

/**
 * @openapi
 * /feed:
 *   get:
 *     tags:
 *       - Feed
 *     summary: Get personalized homepage feed
 *     description: Returns a feed of listings for the homepage. User's own listings are excluded.
 *     parameters:
 *       - in: query
 *         name: accountId
 *         schema:
 *           type: string
 *         description: Current user's account ID for personalization (excludes own items).
 *       - in: query
 *         name: page
 *         schema:
 *           type: integer
 *           default: 0
 *         description: Page number for pagination (0-based).
 *       - in: query
 *         name: limit
 *         schema:
 *           type: integer
 *           default: 10
 *         description: Number of items per page.
 *     responses:
 *       '200':
 *         description: Successfully retrieved the feed.
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 data:
 *                   type: array
 *                   items:
 *                     type: object
 *                     properties:
 *                       type:
 *                         type: string
 *                         enum: [listing]
 *                       id:
 *                         type: string
 *                       data:
 *                         type: object
 *                 page:
 *                   type: integer
 *                 limit:
 *                   type: integer
 *                 hasMore:
 *                   type: boolean
 *       '500':
 *         description: Internal Server Error.
 */
feedRouter.get('/feed', async (req, res) => {
  const { accountId, page, limit } = req.query

  try {
    //If accountId is provided, validate that it belongs to the logged-in user
    if (accountId) {
      await validateAccount(req.user as AuthenticatedUser, accountId as string, 'authenticated')
    }

    const parsedPage = parseInt(page as string) || 0
    const parsedLimit = parseInt(limit as string) || 10

    const listingsWhere: Prisma.ListingWhereInput = {
      AND: [
        { status: Status.ACTIVE },
        { image: { not: null } },
        { image: { not: '' } },
        ...(accountId ? [{ accountId: { not: accountId as string } }] : []),
      ],
    }

    const listings = await prisma.listing.findMany({
      where: listingsWhere,
      include: {
        account: {
          include: {
            profile: { select: { username: true, avatar: true } },
          },
        },
        entity: {
          include: {
            category: { select: { id: true, name: true, displayName: true } },
          },
        },
      },
      orderBy: { createdAt: 'desc' },
      skip: parsedPage * parsedLimit,
      take: parsedLimit + 1,
    })

    const hasMore = listings.length > parsedLimit
    const trimmedListings = hasMore ? listings.slice(0, parsedLimit) : listings

    const feedItems: FeedItem[] = trimmedListings.map((listing) => ({
      type: 'listing' as FeedItemType,
      id: listing.id,
      createdAt: listing.createdAt,
      data: listing,
    }))

    res.json({
      data: feedItems,
      page: parsedPage,
      limit: parsedLimit,
      hasMore,
    })
  } catch (error) {
    const { statusCode, prismaError, customError } = generatePrismaError(error as Prisma.PrismaClientKnownRequestError)
    console.error('GET_FEED_ERROR:', prismaError, customError)
    res.status(statusCode).send({ errorMessage: customError || 'Failed to retrieve feed.' })
  }
})
