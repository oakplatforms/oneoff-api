import { Prisma } from '@prisma/client'
import express from 'express'
import { generateIncludes } from '../utils/generateIncludes'
import { getPrismaClient, generatePrismaError } from '../utils/prismaHelpers'

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
  const { include } = req.query

  try {
    const accounts = await prisma.account.findMany({
      include: generateIncludes(include)
    })
    res.json(accounts)
  } catch (error) {
    const { statusCode, errorMessage } = generatePrismaError(error as Prisma.PrismaClientKnownRequestError)
    res.status(statusCode).send({ errorMessage })
  }
})
