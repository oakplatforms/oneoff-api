import { PrismaClient, Prisma } from '@prisma/client'
import express from 'express'
import { generateIncludes } from '../utils/generateIncludes'
import { getPrismaClient, generatePrismaError } from '../utils/prismaHelpers'
import { resolveBids } from '../services/resolver'
import { createListingTransactions } from '../services/transaction'

const prisma = getPrismaClient()
export const listingRouter = express.Router()

listingRouter.get('/:marketplaceName/:brandName/listings', async (req, res) => {
  const { include, productId, profileId } = req.query
  try {
    const listings = await prisma.listing.findMany({
      where: productId || profileId ? {
        OR: [
          productId ? { productId: productId as string } : {},
          profileId ? { profileId: profileId as string } : {}
        ]
      } : {},
      include: generateIncludes(include)
    })
    res.json(listings)
  } catch (error) {
    const { statusCode, errorMessage } = generatePrismaError(error as Prisma.PrismaClientKnownRequestError)
    res.status(statusCode).send({ errorMessage })
  }
})

listingRouter.post(`/:marketplaceName/:brandName/listing`, async (req, res) => {
  const {
    amount,
    quantity,
    status,
    multiTransactionsEnabled,
    profileId,
    productId
  } = req.body

  try {
    const listing = await prisma.listing.create({
      data: {
        amount,
        quantity,
        status,
        multiTransactionsEnabled,
        profile: { connect: { id: profileId } },
        product: { connect: { id: productId } }
      },
    })

    const bids = await resolveBids(listing)
    if (bids.length) {
      createListingTransactions(listing, bids)
    }

    res.json(listing)
  } catch (error) {
    const { statusCode, errorMessage } = generatePrismaError(error as Prisma.PrismaClientKnownRequestError)
    res.status(statusCode).send({ errorMessage })
  }
})

listingRouter.put(`/:marketplaceName/:brandName/listing/:listingId`, async (req, res) => {
  const { listingId } = req.params

  try {
    const listing = await prisma.listing.update({
      where: { id: listingId },
      data: {
        ...req.body,
      }
    })

    const bids = await resolveBids(listing)
    if (bids.length) {
      createListingTransactions(listing, bids)
    }
    
    res.json(listing || { errorMessage: 'Something went wrong: Cannot update listing by id' })
  } catch (error) {
    const { statusCode, errorMessage } = generatePrismaError(error as Prisma.PrismaClientKnownRequestError)
    res.status(statusCode).send({ errorMessage })
  }
})


listingRouter.get('/:marketplaceName/:brandName/listing/:id', async (req, res) => {
  const { id } = req.params
  const { include } = req.query

  try {
    const listing = await prisma.listing.findUnique({
      where: { id },
      include: generateIncludes(include)
    })
  
    res.json(listing || { errorMessage: 'Something went wrong: No listing ID found' })
  } catch (error) {
    const { statusCode, errorMessage } = generatePrismaError(error as Prisma.PrismaClientKnownRequestError)
    res.status(statusCode).send({ errorMessage })
  }
})


listingRouter.delete(`/:marketplaceName/:brandName/listing/:id`, async (req, res) => {
  const { id } = req.params

  try {
    const listing = await prisma.listing.delete({
      where: { id: id },
    })
    res.json(listing || { errorMessage: 'Something went wrong: No listing ID found' })
  } catch (error) {
    const { statusCode, errorMessage } = generatePrismaError(error as Prisma.PrismaClientKnownRequestError)
    res.status(statusCode).send({ errorMessage })
  }
})
