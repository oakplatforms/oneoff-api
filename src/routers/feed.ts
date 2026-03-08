import { Prisma, Status } from '@prisma/client'
import express from 'express'
import { prismaClient, generatePrismaError } from '../utils/prismaHelpers'
import { validateAccount, AuthenticatedUser } from '../validation/user'

export const feedRouter = express.Router()

const prisma = prismaClient()

type FeedItemType = 'content'

interface FeedItem {
  type: FeedItemType
  id: string
  createdAt: Date
  data: unknown
}

const listingInclude = {
  account: {
    include: {
      profile: { select: { id: true, username: true, avatar: true } },
      seller: { select: { id: true } },
    },
  },
  entity: {
    include: {
      category: { select: { id: true, name: true, displayName: true } },
      content: {
        include: {
          gallery: {
            include: {
              images: { orderBy: { position: 'asc' as const } },
            },
          },
        },
      },
    },
  },
}

function buildListingWhere(
  accountId?: string
): Prisma.ListingWhereInput {
  return {
    status: Status.ACTIVE,
    entity: {
      content: {
        isNot: null,
      },
    },
    ...(accountId ? { accountId: { not: accountId } } : {}),
  }
}

/**
 * @openapi
 * /feed:
 *   get:
 *     tags:
 *       - Feed
 *     summary: Get personalized homepage feed
 *     description: Returns a balanced mix of listings with different content types (gallery, video, post). User's own listings are excluded.
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
 *                         enum: [content]
 *                       id:
 *                         type: string
 *                       createdAt:
 *                         type: string
 *                         format: date-time
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
    if (accountId) {
      await validateAccount(req.user as AuthenticatedUser, accountId as string, 'authenticated')
    }

    const parsedPage = parseInt(page as string) || 0
    const parsedLimit = parseInt(limit as string) || 10

    const where = buildListingWhere(accountId as string | undefined)

    console.log('FEED_DEBUG:', JSON.stringify({
      accountId: accountId || null,
      page: parsedPage,
      limit: parsedLimit,
      where,
    }))

    const listingsRaw = await prisma.listing.findMany({
      where,
      include: listingInclude,
      orderBy: { createdAt: 'desc' },
      skip: parsedPage * parsedLimit,
      take: parsedLimit + 1,
    })

    console.log('FEED_DEBUG_RESULTS:', JSON.stringify({
      listingsCount: listingsRaw.length,
    }))

    const hasMore = listingsRaw.length > parsedLimit
    const listings = listingsRaw.slice(0, parsedLimit)

    // Round-robin interleave by user so one user doesn't dominate the feed
    const byUser = new Map<string, typeof listings>()
    for (const listing of listings) {
      const userId = listing.accountId ?? listing.id
      if (!byUser.has(userId)) byUser.set(userId, [])
      byUser.get(userId)!.push(listing)
    }
    const interleaved: typeof listings = []
    const userQueues = Array.from(byUser.values())
    let added = true
    while (added) {
      added = false
      for (const queue of userQueues) {
        if (queue.length > 0) {
          interleaved.push(queue.shift()!)
          added = true
        }
      }
    }

    const feedItems: FeedItem[] = interleaved.map((listing) => ({
      type: 'content' as FeedItemType,
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
