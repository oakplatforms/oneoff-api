import { PrismaClient, Prisma } from '@prisma/client'
import express from 'express'
import { generateIncludes } from '../utils/generateIncludes'
import { generatePrismaError } from '../utils/generatePrismaError'

const prisma = new PrismaClient()
export const userRouter = express.Router()

/**
 * @openapi
 * /user:
 *   post:
 *     tags:
 *       - User
 *     summary: Create a new user.
 *     description: Adds a new user to the database. The request body must include the `cognitoId` and `account` details. If successful, the created user object will be returned.
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               cognitoId:
 *                 type: string
 *                 description: The unique identifier for the user from Cognito.
 *               account:
 *                 type: object
 *                 properties:
 *                   username:
 *                     type: string
 *                     description: The username of the account.
 *                   email:
 *                     type: string
 *                     description: The email associated with the account.
 *               required:
 *                 - cognitoId
 *                 - account
 *     responses:
 *       '200':
 *         description: Successfully created a new user.
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/User'
 *       '400':
 *         description: Bad request, typically due to invalid request data.
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 errorMessage:
 *                   type: string
 *                   description: Description of the error that occurred.
 *       '500':
 *         description: Internal Server Error. An error occurred while processing the request.
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 errorMessage:
 *                   type: string
 *                   description: Description of the error that occurred.
 */
userRouter.post(`/user`, async (req, res) => {
  const { cognitoId, account } = req.body

  try {
    const result = await prisma.user.create({
      data: {
        cognitoId,
        account: {
          create: account,
        },
      },
    })
    res.json(result)
  } catch (error) {
    const { statusCode, errorMessage } = generatePrismaError(error as Prisma.PrismaClientKnownRequestError)
    res.status(statusCode).send({ errorMessage })
  }
})

/**
 * @openapi
 * /user/{id}:
 *   get:
 *     tags:
 *       - User
 *     summary: Retrieve a specific user by their ID.
 *     description: Fetches details of a user identified by their ID. If the user does not exist, an appropriate message will be returned.
 *     parameters:
 *       - name: id
 *         in: path
 *         description: The ID of the user to retrieve.
 *         required: true
 *         schema:
 *           type: string
 *       - name: include
 *         in: query
 *         description: Optional query parameter to include related entities or additional data.
 *         required: false
 *         schema:
 *           type: string
 *     responses:
 *       '200':
 *         description: Successfully retrieved the user details.
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/User'
 *       '404':
 *         description: User not found. The specified ID does not match any existing user.
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 errorMessage:
 *                   type: string
 *                   description: Description of the error that occurred.
 *       '500':
 *         description: Internal Server Error. An error occurred while processing the request.
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 errorMessage:
 *                   type: string
 *                   description: Description of the error that occurred.
 */
userRouter.get('/user/:id', async (req, res) => {
  const { id } = req.params
  const { include } = req.query

  try {
    const user = await prisma.user.findUnique({
      where: {
        id
      },
      include: generateIncludes(include)
    })
  
    res.json(user || { errorMessage: 'Something went wrong: No User ID found' })
  } catch (error) {
    const { statusCode, errorMessage } = generatePrismaError(error as Prisma.PrismaClientKnownRequestError)
    res.status(statusCode).send({ errorMessage })
  }
})
