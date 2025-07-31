import { Prisma } from '@prisma/client'
import express from 'express'
import { generateIncludes } from '../utils/generateIncludes'
import { getPrismaClient, generatePrismaError } from '../utils/prismaHelpers'
import { paginatePrisma } from '../utils/paginatePrisma'
import { validateRole, AuthenticatedUser } from '../validation/user'

const prisma = getPrismaClient()
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
      include: generateIncludes(include),
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
      include: generateIncludes(include),
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

