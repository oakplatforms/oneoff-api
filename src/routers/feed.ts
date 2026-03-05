import { ContentType, Prisma, Status } from '@prisma/client'
import express from 'express'
import { prismaClient, generatePrismaError } from '../utils/prismaHelpers'
import { validateAccount, AuthenticatedUser } from '../validation/user'

export const feedRouter = express.Router()

const prisma = prismaClient()

type FeedItemType = 'gallery' | 'video' | 'post'

interface FeedItem {
  type: FeedItemType
  id: string
  createdAt: Date
  data: unknown
}

const FEED_TYPE_MAP: Record<ContentType, FeedItemType | null> = {
  GALLERY: 'gallery',
  VIDEO: 'video',
  POST: 'post',
  IMAGE: null,
}

const listingInclude = {
  account: {
    include: {
      profile: { select: { username: true, avatar: true } },
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
          video: true,
          post: true,
        },
      },
    },
  },
}

function buildListingWhere(
  contentType: ContentType,
  accountId?: string
): Prisma.ListingWhereInput {
  const base: Prisma.ListingWhereInput = {
    status: Status.ACTIVE,
    entity: {
      content: {
        type: contentType,
        previewImage: { not: null },
      },
    },
    ...(accountId ? { accountId: { not: accountId } } : {}),
  }

  switch (contentType) {
  case 'GALLERY':
    return {
      ...base,
      entity: {
        content: {
          ...base.entity?.content as Prisma.ContentWhereInput,
          gallery: { images: { some: {} } },
        },
      },
    }
  case 'VIDEO':
    return {
      ...base,
      entity: {
        content: {
          ...base.entity?.content as Prisma.ContentWhereInput,
          video: { url: { not: null } },
        },
      },
    }
  case 'POST':
    return {
      ...base,
      entity: {
        content: {
          ...base.entity?.content as Prisma.ContentWhereInput,
          post: { body: { not: null } },
        },
      },
    }
  default:
    return base
  }
}

function interleaveItems(
  galleries: FeedItem[],
  videos: FeedItem[],
  posts: FeedItem[],
  limit: number
): FeedItem[] {
  const result: FeedItem[] = []
  const queues = [[...galleries], [...videos], [...posts]]

  let queueIndex = 0
  while (result.length < limit) {
    let found = false
    for (let i = 0; i < queues.length; i++) {
      const idx = (queueIndex + i) % queues.length
      if (queues[idx].length > 0) {
        result.push(queues[idx].shift()!)
        queueIndex = (idx + 1) % queues.length
        found = true
        break
      }
    }
    if (!found) break
  }

  return result
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
 *                         enum: [gallery, video, post]
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

    const galleryAllocation = Math.ceil(parsedLimit / 3)
    const videoAllocation = Math.floor(parsedLimit / 3)
    const postAllocation = parsedLimit - galleryAllocation - videoAllocation

    const galleryWhere = buildListingWhere('GALLERY', accountId as string | undefined)
    const videoWhere = buildListingWhere('VIDEO', accountId as string | undefined)
    const postWhere = buildListingWhere('POST', accountId as string | undefined)

    console.log('FEED_DEBUG:', JSON.stringify({
      accountId: accountId || null,
      page: parsedPage,
      limit: parsedLimit,
      galleryWhere,
      videoWhere,
      postWhere,
    }))

    const [galleriesRaw, videosRaw, postsRaw] = await Promise.all([
      prisma.listing.findMany({
        where: galleryWhere,
        include: listingInclude,
        orderBy: { createdAt: 'desc' },
        skip: parsedPage * galleryAllocation,
        take: galleryAllocation + 1,
      }),
      prisma.listing.findMany({
        where: videoWhere,
        include: listingInclude,
        orderBy: { createdAt: 'desc' },
        skip: parsedPage * videoAllocation,
        take: videoAllocation + 1,
      }),
      prisma.listing.findMany({
        where: postWhere,
        include: listingInclude,
        orderBy: { createdAt: 'desc' },
        skip: parsedPage * postAllocation,
        take: postAllocation + 1,
      }),
    ])

    console.log('FEED_DEBUG_RESULTS:', JSON.stringify({
      galleriesCount: galleriesRaw.length,
      videosCount: videosRaw.length,
      postsCount: postsRaw.length,
    }))

    const hasMore =
      galleriesRaw.length > galleryAllocation ||
      videosRaw.length > videoAllocation ||
      postsRaw.length > postAllocation

    const mapToFeedItems = (
      listings: typeof galleriesRaw,
      allocation: number,
      contentType: ContentType
    ): FeedItem[] =>
      listings.slice(0, allocation).map((listing) => ({
        type: FEED_TYPE_MAP[contentType] as FeedItemType,
        id: listing.id,
        createdAt: listing.createdAt,
        data: listing,
      }))

    const galleries = mapToFeedItems(galleriesRaw, galleryAllocation, 'GALLERY')
    const videos = mapToFeedItems(videosRaw, videoAllocation, 'VIDEO')
    const posts = mapToFeedItems(postsRaw, postAllocation, 'POST')

    const feedItems = interleaveItems(galleries, videos, posts, parsedLimit)

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
