import { Prisma } from '@prisma/client'
import express from 'express'
import { generateIncludes } from '../utils/generateIncludes'
import { getPrismaClient, generatePrismaError } from '../utils/prismaHelpers'
import { resolveListings } from '../services/resolver'
import { createBidTransactions } from '../services/transaction'

const prisma = getPrismaClient()
export const bidRouter = express.Router()

bidRouter.get('/:marketplaceName/:brandName/bids', async (req, res) => {
  const { include, productId, profileId } = req.query
  try {
    const bids = await prisma.bid.findMany({
        where: productId || profileId ? {
            OR: [
                productId ? { productId: productId as string } : {},
                profileId ? { profileId: profileId as string } : {}
            ]
            } : {},
        include: generateIncludes(include)
    })
    res.json(bids)
  } catch (error) {
    const { statusCode, errorMessage } = generatePrismaError(error as Prisma.PrismaClientKnownRequestError)
    res.status(statusCode).send({ errorMessage })
  }
})

bidRouter.post(`/:marketplaceName/:brandName/bid`, async (req, res) => {
  const {
    amount,
    quantity,
    status,
    multiTransactionsEnabled,
    profileId,
    productId,
  } = req.body

  try {
    const bid = await prisma.bid.create({
      data: {
        amount,
        quantity,
        status,
        multiTransactionsEnabled,
        profile: { connect: { id: profileId } },
        product: { connect: { id: productId } }
      },
    })
    
    const listings = await resolveListings(bid)
    if (listings.length) {
      await createBidTransactions(bid, listings)
    } 

    res.json(bid)
  } catch (error) {
    const { statusCode, errorMessage } = generatePrismaError(error as Prisma.PrismaClientKnownRequestError)
    res.status(statusCode).send({ errorMessage })
  }
})

bidRouter.put(`/:marketplaceName/:brandName/bid/:bidId`, async (req, res) => {
  const { bidId } = req.params

  try {
    const bid = await prisma.bid.update({
      where: { id: bidId },
      data: {
        ...req.body,
      }
    })

    const listings = await resolveListings(bid)
    if (listings.length) {
      await createBidTransactions(bid, listings)
    }

    res.json(bid || { errorMessage: 'Something went wrong: Cannot update Bid by id' })
  } catch (error) {
    const { statusCode, errorMessage } = generatePrismaError(error as Prisma.PrismaClientKnownRequestError)
    res.status(statusCode).send({ errorMessage })
  }
})


bidRouter.get('/:marketplaceName/:brandName/bid/:id', async (req, res) => {
  const { id } = req.params
  const { include } = req.query

  try {
    const bid = await prisma.bid.findUnique({
      where: { id },
      include: generateIncludes(include)
    })
  
    res.json(bid || { errorMessage: 'Something went wrong: No bid ID found' })
  } catch (error) {
    const { statusCode, errorMessage } = generatePrismaError(error as Prisma.PrismaClientKnownRequestError)
    res.status(statusCode).send({ errorMessage })
  }
})


bidRouter.delete(`/:marketplaceName/:brandName/bid/:id`, async (req, res) => {
  const { id } = req.params

  try {
    const bid = await prisma.bid.delete({
      where: { id: id },
    })
    res.json(bid || { errorMessage: 'Something went wrong: No bid ID found' })
  } catch (error) {
    const { statusCode, errorMessage } = generatePrismaError(error as Prisma.PrismaClientKnownRequestError)
    res.status(statusCode).send({ errorMessage })
  }
})
