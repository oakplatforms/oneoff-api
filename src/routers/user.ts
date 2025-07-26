import { Prisma } from '@prisma/client'
import express from 'express'
import { getPrismaClient, generatePrismaError } from '../utils/prismaHelpers'
import { generateIncludes } from '../utils/generateIncludes'
import { paginatePrisma } from '../utils/paginatePrisma'

const prisma = getPrismaClient()
export const userRouter = express.Router()

/**
 * @openapi
 * /users:
 *   get:
 *     tags:
 *       - User
 *     summary: Retrieve a list of users.
 *     description: Fetches a list of users from the database. You can use the query parameter `include` to specify related data to include with the user objects.
 *     parameters:
 *       - in: query
 *         name: include
 *         schema:
 *           type: string
 *         description: Comma-separated list of related entities to include in the user data (e.g., 'profile,roles').
 *     responses:
 *       '200':
 *         description: Successfully retrieved the list of users.
 *         content:
 *           application/json:
 *             schema:
 *               type: array
 *               items:
 *                 $ref: '#/components/schemas/User'
 *       '400':
 *         description: Bad request, typically due to invalid query parameters.
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
userRouter.get('/users', async (req, res) => {
  const { include, usePagination, page, limit } = req.query

  try {
    const parsedLimit = parseInt(limit as string) || 10
    const parsedPage = parseInt(page as string) || 0

    const result = await paginatePrisma({
      prismaModel: prisma.user,
      where: {},
      include: generateIncludes(include),
      page: parsedPage,
      limit: parsedLimit,
      usePagination: usePagination === 'false' ? false : true,
    })

    res.json(result)
  } catch (error) {
    const { statusCode, prismaError } = generatePrismaError(error as Prisma.PrismaClientKnownRequestError)
    console.error('GET_USERS_ERROR:', prismaError)
    res.status(statusCode).send({ errorMessage: 'Failed to retrieve users.' })
  }
})

/**
 * @openapi
 * /user:
 *   post:
 *     tags:
 *       - User
 *     summary: Create a new user.
 *     description: Adds a new user to the database. The request body must include the `authId` and `account` details. If successful, the created user object will be returned.
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               authId:
 *                 type: string
 *                 description: The unique identifier for the user from Auth.
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
 *                 - authId
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
  const { authId, isAdmin, account, admin } = req.body
  const { profile: profileProps, carts: cartsProps, ...accountProps } = account || {}

  try {
    const user = await prisma.user.create({
      data: {
        authId,
        isAdmin,
        ...(isAdmin && admin && {
          admin: {
            create: {
              ...admin
            }
          }
        }),
        ...(!isAdmin && account && {
          account: {
            create: {
              ...accountProps,
              ...(cartsProps && {
                carts: {
                  create: cartsProps
                }
              }),
              ...(profileProps && {
                profile: {
                  create: profileProps
                }
              })
            }
          }
        }),
      },
    })
    res.json(user)
  } catch (error) {
    const { statusCode, prismaError, customError } = generatePrismaError(error as Prisma.PrismaClientKnownRequestError)
    console.error('CREATE_USER_ERROR:', prismaError || customError)
    res.status(statusCode).send({ errorMessage: customError || 'Failed to create user.' })
  }
})

/**
 * @openapi
 * /user/{id}:
 *   put:
 *     tags:
 *       - User
 *     summary: Update user and account details by user ID.
 *     description: Updates an existing user and associated account details in the database by user ID. The request body must include the `account` details. If successful, the updated user object will be returned.
 *     parameters:
 *       - in: path
 *         name: id
 *         schema:
 *           type: string
 *         required: true
 *         description: The unique identifier for the user.
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
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
 *                 - account
 *     responses:
 *       '200':
 *         description: Successfully updated the user and account details.
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
 *       '404':
 *         description: User not found.
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
userRouter.put(`/user/:id`, async (req, res) => {
  const { id } = req.params
  const { account } = req.body
  const { profile: profileProps, ...accountProps } = account || {}
  try {
    const user = await prisma.user.update({
      where: { id },
      data: {
        account: {
          update: {
            ...accountProps,
            ...(profileProps && {
              profile: {
                update: profileProps
              }
            })
          },
        },
      }})
    res.json(user)
  } catch (error) {
    const { statusCode, prismaError, customError } = generatePrismaError(error as Prisma.PrismaClientKnownRequestError)
    console.error('UPDATE_USER_ERROR:', prismaError || customError)
    res.status(statusCode).send({ errorMessage: customError || 'Failed to update user.' })
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
 *       - name: authId
 *         in: path
 *         description: The Auth Id of the user to retrieve.
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
userRouter.get('/user/:authId', async (req, res) => {
  const { authId } = req.params
  const { include } = req.query

  try {
    const users = await prisma.user.findMany({
      where: {
        authId: { contains: authId as string }
      },
      include: generateIncludes(include)
    })

    if (users?.[0]) {
      res.json(users?.[0])
    } else {
      throw new Error('No auth ID found')
    }
  } catch (error) {
    const { statusCode, prismaError, customError } = generatePrismaError(error as Prisma.PrismaClientKnownRequestError)
    console.error('GET_USER_ERROR:', prismaError || customError)
    res.status(statusCode).send({ errorMessage: customError || 'Failed to retrieve user.' })
  }
})

/**
 * @openapi
 * /user/{id}:
 *   delete:
 *     tags:
 *       - User
 *     summary: Delete a specific user by their ID.
 *     description: Deletes the user associated with the given ID. If the user does not exist or deletion fails, an error will be returned.
 *     parameters:
 *       - name: id
 *         in: path
 *         description: The ID of the user to delete.
 *         required: true
 *         schema:
 *           type: string
 *     responses:
 *       '200':
 *         description: Successfully deleted the user.
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/User'
 *       '400':
 *         description: Bad request or invalid user ID.
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 errorMessage:
 *                   type: string
 *                   description: Description of the error that occurred.
 *       '404':
 *         description: User not found.
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 errorMessage:
 *                   type: string
 *                   description: Description of the error that occurred.
 *       '500':
 *         description: Internal Server Error.
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 errorMessage:
 *                   type: string
 *                   description: Description of the error that occurred.
 */
userRouter.delete(`/user/:id`, async (req, res) => {
  const { id } = req.params

  try {
    const user = await prisma.user.delete({
      where: {
        id: id,
      },
    })
    if (user) {
      res.json(user)
    } else {
      throw new Error('No user ID found')
    }
  } catch (error) {
    const { statusCode, prismaError } = generatePrismaError(error as Prisma.PrismaClientKnownRequestError)
    console.error('DELETE_USER_ERROR:', prismaError)
    res.status(statusCode).send({ errorMessage: 'Failed to delete user.' })
  }
})

