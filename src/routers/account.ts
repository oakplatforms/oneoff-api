import { Prisma } from '@prisma/client'
import express from 'express'
import { generateIncludes } from '../utils/generateIncludes'
import { prismaClient, generatePrismaError } from '../utils/prismaHelpers'
import { paginatePrisma } from '../utils/paginatePrisma'
import { validateRole, validateAccount, AuthenticatedUser } from '../validation/user'
import stripe from '../utils/stripe'
import { deleteUserFromCognito } from '../utils/deleteUserFromCognito'
import { deleteS3Object } from '../utils/deleteS3Object'

const prisma = prismaClient()
export const accountRouter = express.Router()

/**
 * @openapi
 * /accounts:
 *   get:
 *     tags:
 *       - Account
 *     summary: Retrieve all accounts
 *     description: Returns a list of all accounts. Optionally, you can include related entities using the `include` query parameter.
 *     parameters:
 *       - in: query
 *         name: include
 *         schema:
 *           type: string
 *         description: Comma-separated list of related entities to include in the account data (e.g., 'seller,customer,profile').
 *     responses:
 *       '200':
 *         description: Successfully retrieved the list of accounts.
 *         content:
 *           application/json:
 *             schema:
 *               type: array
 *               items:
 *                 $ref: '#/components/schemas/Account'
 *       '500':
 *         description: Internal Server Error. An error occurred while fetching the accounts.
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 errorMessage:
 *                   type: string
 *                   description: Description of the error that occurred.
 */
accountRouter.get('/accounts', async (req, res) => {
  const { include, usePagination, page, limit } = req.query

  try {
    validateRole(req.user as AuthenticatedUser, 'admin')
    const parsedLimit = parseInt(limit as string) || 10
    const parsedPage = parseInt(page as string) || 0

    const result = await paginatePrisma({
      prismaModel: prisma.account,
      where: {},
      include: generateIncludes(include as string),
      page: parsedPage,
      limit: parsedLimit,
      usePagination: usePagination === 'false' ? false : true,
    })

    res.json(result)
  } catch (error) {
    const { statusCode, prismaError, customError } = generatePrismaError(error as Prisma.PrismaClientKnownRequestError)
    console.error('GET_ACCOUNTS_ERROR:', prismaError || customError)
    res.status(statusCode).send({ errorMessage: customError || 'Failed to retrieve accounts.' })
  }
})

/**
 * @openapi
 * /account/{id}:
 *   get:
 *     tags:
 *       - Account
 *     summary: Retrieve a specific account by ID
 *     description: Returns a single account by its ID. Optionally, you can include related entities using the `include` query parameter.
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *         description: The unique identifier of the account to retrieve.
 *       - in: query
 *         name: include
 *         schema:
 *           type: string
 *         description: Comma-separated list of related entities to include in the account data (e.g., 'seller,customer,profile').
 *     responses:
 *       '200':
 *         description: Successfully retrieved the account.
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Account'
 *       '400':
 *         description: Bad request, typically due to invalid account ID format.
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 errorMessage:
 *                   type: string
 *                   description: Description of the error that occurred.
 *       '404':
 *         description: Account not found.
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 errorMessage:
 *                   type: string
 *                   description: Description of the error that occurred.
 *       '500':
 *         description: Internal Server Error. An error occurred while fetching the account.
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 errorMessage:
 *                   type: string
 *                   description: Description of the error that occurred.
 */
accountRouter.get('/account/:id', async (req, res) => {
  const { id } = req.params
  const { include } = req.query

  try {
    if (!id) {
      return res.status(400).json({ errorMessage: 'Account ID is required.' })
    }

    const account = await prisma.account.findUnique({
      where: { id },
      include: generateIncludes(include as string),
    })

    if (!account) {
      return res.status(404).json({ errorMessage: 'Account not found.' })
    }

    res.json(account)
  } catch (error) {
    const { statusCode, prismaError, customError } = generatePrismaError(error as Prisma.PrismaClientKnownRequestError)
    console.error('GET_ACCOUNT_BY_ID_ERROR:', prismaError || customError)
    res.status(statusCode).send({ errorMessage: customError || 'Failed to retrieve account.' })
  }
})

/**
 * @openapi
 * /account/{id}:
 *   delete:
 *     tags:
 *       - Account
 *     summary: Delete an account and all associated data
 *     description: Permanently deletes an account and all associated data including Stripe customer, Cognito user, and database records. Cannot delete accounts with pending orders.
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *         description: The unique identifier of the account to delete.
 *     responses:
 *       '200':
 *         description: Account and all associated data successfully deleted.
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: string
 *                   example: Account and all associated data were successfully deleted
 *       '400':
 *         description: Missing required parameter or account has pending orders.
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 errorMessage:
 *                   type: string
 *                   description: Description of the error that occurred.
 *       '404':
 *         description: Account not found.
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 errorMessage:
 *                   type: string
 *                   description: Description of the error that occurred.
 *       '500':
 *         description: Internal Server Error. An error occurred while deleting the account.
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 errorMessage:
 *                   type: string
 *                   description: Description of the error that occurred.
 */
accountRouter.delete('/account/:id', async (req, res) => {
  const { id } = req.params

  if (!id) {
    return res.status(400).json({ errorMessage: 'Account ID is required.' })
  }

  try {
    await validateAccount(req.user as AuthenticatedUser, id, 'authenticated')

    await prisma.$transaction(
      async (tx) => {
        //Get account with all related data
        const account = await tx.account.findUnique({
          where: { id },
          include: {
            user: {
              omit: { authId: false },
            },
            profile: true,
            seller: {
              omit: { paymentAccountId: false },
            },
            customer: {
              omit: { paymentAccountId: false },
            },
            listings: {
              select: { image: true },
            },
            contents: {
              select: {
                entity: {
                  select: { image: true },
                },
                gallery: {
                  select: {
                    images: {
                      select: { image: true, blurredImage: true },
                    },
                  },
                },
              },
            },
          }
        })

        if (!account) {
          throw new Error('Account not found.')
        }

        //Delete Stripe customer if exists
        const customer = account.customer as Record<string, unknown>
        if (customer?.paymentAccountId) {
          await stripe.customers.del(customer.paymentAccountId as string)
        }

        //Delete Cognito user if exists
        const user = account.user as Record<string, unknown>
        if (user?.authId) {
          await deleteUserFromCognito(user.authId as string)
        }

        //Delete S3 artifacts
        const s3Keys: string[] = []

        if (account.profile?.avatar) s3Keys.push(account.profile.avatar)
        if (account.profile?.banner) s3Keys.push(account.profile.banner)

        const seller = account.seller as Record<string, unknown>
        if (seller?.image) s3Keys.push(seller.image as string)

        for (const listing of account.listings) {
          if (listing.image) s3Keys.push(listing.image)
        }

        for (const content of account.contents) {
          if (content.entity?.image) s3Keys.push(content.entity.image)
          if (content.gallery) {
            for (const img of content.gallery.images) {
              if (img.image) s3Keys.push(img.image)
              if (img.blurredImage) s3Keys.push(img.blurredImage)
            }
          }
        }

        await Promise.all(s3Keys.map((key) => deleteS3Object(key).catch((err) => {
          console.error('DELETE_S3_OBJECT_ERROR:', key, err)
        })))

        //Delete account (this will cascade delete related records due to foreign key constraints)
        await tx.account.delete({
          where: { id }
        })
      },
      { timeout: 60000 }
    )

    return res.json({ success: 'Account and all associated data were successfully deleted' })
  } catch (error) {
    const { statusCode, prismaError, customError } = generatePrismaError(
      error as Prisma.PrismaClientKnownRequestError
    )
    console.error('DELETE_ACCOUNT_ERROR:', prismaError || customError)
    return res
      .status(statusCode)
      .send({ errorMessage: customError || 'Failed to delete account.' })
  }
})

export default accountRouter
