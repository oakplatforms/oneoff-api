import express from 'express'
import { ProcessStatus } from '@prisma/client'
import { prismaClient } from '../utils/prismaHelpers'
import { AuthenticatedUser } from '../validation/user'

const prisma = prismaClient()
export const activityRouter = express.Router()

/**
 * @openapi
 * /activity:
 *   get:
 *     tags:
 *       - Activity
 *     summary: Retrieve a unified activity feed of purchases and sales.
 *     description: Returns a merged, paginated list of orders where the authenticated user's account is either the buyer (customer) or seller, sorted by most recent first.
 *     parameters:
 *       - in: query
 *         name: accountId
 *         schema:
 *           type: string
 *         required: true
 *         description: The account ID to fetch activity for.
 *       - in: query
 *         name: page
 *         schema:
 *           type: integer
 *         description: Page number for pagination (default 0).
 *       - in: query
 *         name: limit
 *         schema:
 *           type: integer
 *         description: Number of items per page (default 20).
 *     responses:
 *       '200':
 *         description: Successfully retrieved the activity feed.
 */
activityRouter.get('/activity', async (req, res) => {
  const { accountId, page, limit } = req.query

  try {
    const reqUser = req.user as AuthenticatedUser
    if (!reqUser || !reqUser.principalId) {
      throw new Error('User authentication required')
    }

    if (!accountId) {
      return res.status(400).json({ error: 'accountId is required' })
    }

    const parsedPage = parseInt(page as string) || 0
    const parsedLimit = parseInt(limit as string) || 20

    // Get the customer and seller IDs for this account
    const account = await prisma.account.findUnique({
      where: { id: accountId as string },
      include: {
        customer: { select: { id: true } },
        seller: { select: { id: true } },
      },
    })

    if (!account) {
      return res.status(404).json({ error: 'Account not found' })
    }

    const customerId = account.customer?.id
    const sellerId = account.seller?.id

    // Build OR conditions for orders where user is buyer or seller
    const orConditions = []
    if (customerId) {
      orConditions.push({ customerId })
    }
    if (sellerId) {
      orConditions.push({ sellerId })
    }

    if (orConditions.length === 0) {
      return res.json({ data: [], page: 0, total: 0 })
    }

    const where = {
      OR: orConditions,
      status: { notIn: ['DELETED', 'CREATED'] as ProcessStatus[] },
    }

    const [orders, total] = await Promise.all([
      prisma.order.findMany({
        where,
        include: {
          customer: {
            include: {
              account: {
                include: {
                  profile: true,
                },
              },
            },
          },
          seller: {
            include: {
              account: {
                include: {
                  profile: true,
                },
              },
            },
          },
          orderListings: {
            include: {
              listing: {
                include: {
                  entity: true,
                },
              },
            },
          },
        },
        orderBy: { createdAt: 'desc' },
        skip: parsedPage * parsedLimit,
        take: parsedLimit,
      }),
      prisma.order.count({ where }),
    ])

    // Annotate each order with its type relative to the requesting account
    const data = orders.map(order => ({
      ...order,
      activityType: order.customerId === customerId ? 'purchase' : 'sale',
    }))

    return res.json({
      data,
      page: parsedPage,
      limit: parsedLimit,
      total,
    })
  } catch (error) {
    console.error('Activity feed error:', error)
    return res.status(500).json({ error: (error as Error).message })
  }
})
