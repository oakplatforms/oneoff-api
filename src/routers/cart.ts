import { Prisma } from '@prisma/client'
import express from 'express'
import { getPrismaClient, generatePrismaError } from '../utils/prismaHelpers'
import { generateIncludes } from '../utils/generateIncludes'
import { validateCart, validateCartAccount } from '../validation/cart'
import { validateAccount, AuthenticatedUser } from '../validation/user'

const prisma = getPrismaClient()
export const cartRouter = express.Router()

/**
 * @openapi
 * /cart:
 *   post:
 *     summary: Create a new cart
 *     tags:
 *       - Cart
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - accountId
 *             properties:
 *               accountId:
 *                 type: string
 *                 description: ID of the account that owns the cart
 *     responses:
 *       '200':
 *         description: Successfully created the cart
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Cart'
 */
cartRouter.post('/cart', async (req, res) => {
  const { accountId, isPrimary } = req.body

  try {
    await validateAccount(req.user as AuthenticatedUser, accountId, 'customer')
    await validateCartAccount(accountId, isPrimary)
    const cart = await prisma.cart.create({
      data: {
        account: { connect: { id: accountId } },
        isPrimary
      },
    })
    res.json(cart)
  } catch (error) {
    const { statusCode, prismaError, customError } = generatePrismaError(error as Prisma.PrismaClientKnownRequestError)
    console.error('CREATE_CART_ERROR:', prismaError || customError)
    res.status(statusCode).send({ errorMessage: customError || 'Failed to create cart.' })
  }
})

/**
 * @openapi
 * /cart/{id}:
 *   put:
 *     summary: Update a cart by ID
 *     tags:
 *       - Cart
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *         description: The ID of the cart to update
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               accountId:
 *                 type: string
 *                 description: Updated account ID for the cart (optional)
 *     responses:
 *       '200':
 *         description: Successfully updated the cart
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Cart'
 *       '400':
 *         description: Invalid update request
 *       '500':
 *         description: Internal Server Error
 */
cartRouter.put('/cart/:id', async (req, res) => {
  const { id } = req.params
  const { accountId } = req.body

  try {
    await validateAccount(req.user as AuthenticatedUser, accountId, 'customer')
    await validateCart(id)
    const cart = await prisma.cart.update({
      where: { id },
      data: {
        ...(accountId && { account: { connect: { id: accountId } } }),
      },
    })
    res.json(cart)
  } catch (error) {
    const { statusCode, prismaError, customError } = generatePrismaError(error as Prisma.PrismaClientKnownRequestError)
    console.error('UPDATE_CART_ERROR:', prismaError || customError)
    res.status(statusCode).send({ errorMessage: customError || 'Failed to update cart.' })
  }
})

/**
 * @openapi
 * /cart/{id}:
 *   get:
 *     summary: Get a cart by ID
 *     tags:
 *       - Cart
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *         description: ID of the cart to retrieve
 *       - in: query
 *         name: include
 *         schema:
 *           type: string
 *         description: Comma-separated list of related entities to include
 *     responses:
 *       '200':
 *         description: Found cart
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Cart'
 */
cartRouter.get('/cart/:id', async (req, res) => {
  const { id } = req.params
  const { include } = req.query

  try {
    if (!id) {
      throw new Error('Cart ID is required')
    }
    const cart = await prisma.cart.findUnique({
      where: { id },
      include: generateIncludes(include as string),
    })
    if (cart) res.json(cart)
    else res.status(404).send({ errorMessage: 'Cart not found' })
  } catch (error) {
    const { statusCode, prismaError, customError } = generatePrismaError(error as Prisma.PrismaClientKnownRequestError)
    console.error('GET_CART_ERROR:', prismaError || customError)
    res.status(statusCode).send({ errorMessage: customError || 'Failed to retrieve cart.' })
  }
})

/**
 * @openapi
 * /cart/{id}:
 *   delete:
 *     summary: Delete a cart by ID
 *     tags:
 *       - Cart
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *         description: ID of the cart to delete
 *     responses:
 *       '200':
 *         description: Successfully deleted cart
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Cart'
 *       '404':
 *         description: Cart not found
 */
cartRouter.delete('/cart/:accountId/:id', async (req, res) => {
  const { id, accountId } = req.params
  try {
    await validateAccount(req.user as AuthenticatedUser, accountId, 'customer')
    const cart = await prisma.cart.delete({ where: { id } })
    res.json(cart)
  } catch (error) {
    const { statusCode, prismaError, customError } = generatePrismaError(error as Prisma.PrismaClientKnownRequestError)
    console.error('DELETE_CART_ERROR:', prismaError || customError)
    res.status(statusCode).send({ errorMessage: customError || 'Failed to delete cart.' })
  }
})
