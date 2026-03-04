import { Prisma } from '@prisma/client'
import express from 'express'
import { generateIncludes } from '../utils/generateIncludes'
import { prismaClient, generatePrismaError } from '../utils/prismaHelpers'
import { AuthenticatedUser, validateAccount } from '../validation/user'

const prisma = prismaClient()
export const savedItemRouter = express.Router()

// GET /saved-items
savedItemRouter.get('/saved-items', async (req, res) => {
  const { accountId, include, page, limit } = req.query

  try {
    if (!accountId) {
      throw new Error('accountId is required')
    }

    await validateAccount(req.user as AuthenticatedUser, accountId as string, 'authenticated')

    const parsedPage = parseInt(page as string) || 0
    const parsedLimit = parseInt(limit as string) || 20

    const where: Prisma.SavedItemWhereInput = {
      accountId: accountId as string,
    }

    const savedItems = await prisma.savedItem.findMany({
      where,
      include: {
        listing: {
          include: {
            entity: {
              include: {
                entityTags: {
                  include: {
                    tag: true,
                  },
                },
              },
            },
            account: {
              include: {
                profile: true,
                seller: true,
              },
            },
          },
        },
        ...generateIncludes(include as string),
      },
      orderBy: { createdAt: 'desc' },
      skip: parsedPage * parsedLimit,
      take: parsedLimit,
    })

    const total = await prisma.savedItem.count({ where })

    res.json({
      data: savedItems,
      total,
      page: parsedPage,
      limit: parsedLimit,
      hasMore: (parsedPage + 1) * parsedLimit < total,
    })
  } catch (error) {
    const { statusCode, prismaError, customError } = generatePrismaError(error as Prisma.PrismaClientKnownRequestError)
    console.error('GET_SAVED_ITEMS_ERROR:', prismaError, customError)
    res.status(statusCode).send({ errorMessage: customError || 'Failed to retrieve saved items.' })
  }
})

// POST /saved-item
savedItemRouter.post('/saved-item', async (req, res) => {
  const { accountId, listingId } = req.body

  try {
    if (!accountId) {
      throw new Error('accountId is required')
    }

    if (!listingId) {
      throw new Error('listingId is required')
    }

    await validateAccount(req.user as AuthenticatedUser, accountId, 'authenticated')

    // Return existing if already saved
    const existing = await prisma.savedItem.findUnique({
      where: {
        accountId_listingId: { accountId, listingId },
      },
    })

    if (existing) {
      res.json(existing)
      return
    }

    const savedItem = await prisma.savedItem.create({
      data: {
        account: { connect: { id: accountId } },
        listing: { connect: { id: listingId } },
      },
      include: {
        listing: true,
      },
    })

    res.json(savedItem)
  } catch (error) {
    const { statusCode, prismaError, customError } = generatePrismaError(error as Prisma.PrismaClientKnownRequestError)
    console.error('CREATE_SAVED_ITEM_ERROR:', prismaError, customError)
    res.status(statusCode).send({ errorMessage: customError || 'Failed to save item.' })
  }
})

// DELETE /saved-item/:accountId/:id
savedItemRouter.delete('/saved-item/:accountId/:id', async (req, res) => {
  const { accountId, id } = req.params

  try {
    if (!accountId || !id) {
      throw new Error('accountId and id are required')
    }

    await validateAccount(req.user as AuthenticatedUser, accountId, 'authenticated')

    const savedItem = await prisma.savedItem.findFirst({
      where: { id, accountId },
    })

    if (!savedItem) {
      throw new Error('Saved item not found or does not belong to this account')
    }

    const deleted = await prisma.savedItem.delete({
      where: { id },
    })

    res.json(deleted)
  } catch (error) {
    const { statusCode, prismaError, customError } = generatePrismaError(error as Prisma.PrismaClientKnownRequestError)
    console.error('DELETE_SAVED_ITEM_ERROR:', prismaError, customError)
    res.status(statusCode).send({ errorMessage: customError || 'Failed to remove saved item.' })
  }
})

// POST /saved-item/toggle
savedItemRouter.post('/saved-item/toggle', async (req, res) => {
  const { accountId, listingId } = req.body

  try {
    if (!accountId) {
      throw new Error('accountId is required')
    }

    if (!listingId) {
      throw new Error('listingId is required')
    }

    await validateAccount(req.user as AuthenticatedUser, accountId, 'authenticated')

    const existing = await prisma.savedItem.findUnique({
      where: {
        accountId_listingId: { accountId, listingId },
      },
    })

    if (existing) {
      await prisma.savedItem.delete({ where: { id: existing.id } })
      res.json({ action: 'removed', savedItem: existing })
    } else {
      const savedItem = await prisma.savedItem.create({
        data: {
          account: { connect: { id: accountId } },
          listing: { connect: { id: listingId } },
        },
        include: {
          listing: true,
        },
      })
      res.json({ action: 'saved', savedItem })
    }
  } catch (error) {
    const { statusCode, prismaError, customError } = generatePrismaError(error as Prisma.PrismaClientKnownRequestError)
    console.error('TOGGLE_SAVED_ITEM_ERROR:', prismaError, customError)
    res.status(statusCode).send({ errorMessage: customError || 'Failed to toggle saved item.' })
  }
})
