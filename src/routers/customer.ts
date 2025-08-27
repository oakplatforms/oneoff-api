import express from 'express'
import { getPrismaClient, generatePrismaError } from '../utils/prismaHelpers'
import stripe from '../utils/stripe'
import { promoteUserToCustomer } from '../utils/promoteUserToCustomer'
import { Prisma } from '@prisma/client'
import Stripe from 'stripe'
import { validateAccount, AuthenticatedUser } from '../validation/user'
import { validateNewCustomer } from '../validation/customer'

const prisma = getPrismaClient()
export const customerRouter = express.Router()

/**
 * @openapi
 * /customer/{accountId}:
 *   post:
 *     tags:
 *       - Customer
 *     summary: Create a new customer profile
 *     description: Sets up a new customer for a given account. If the account exists and is not already a CUSTOMER type, it will be updated. A Stripe customer will also be created.
 *     parameters:
 *       - in: path
 *         name: accountId
 *         required: true
 *         schema:
 *           type: string
 *         description: The ID of the account to associate with the new customer.
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - firstName
 *               - lastName
 *               - phone
 *               - address
 *               - city
 *               - state
 *               - zipCode
 *             properties:
 *               firstName:
 *                 type: string
 *               lastName:
 *                 type: string
 *               phone:
 *                 type: string
 *               address:
 *                 type: string
 *               city:
 *                 type: string
 *               state:
 *                 type: string
 *               zipCode:
 *                 type: string
 *     responses:
 *       '200':
 *         description: Successfully created the customer account.
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Customer'
 *       '400':
 *         description: Account not found or bad request.
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 error:
 *                   type: string
 *       '500':
 *         description: Internal server error during customer creation.
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 error:
 *                   type: string
 */
customerRouter.post('/customer/:accountId', async (req, res) => {
  const { accountId } = req.params
  const { firstName, lastName, phone, address, city, state, zipCode } = req.body

  try {
    await validateNewCustomer(req.body)
    await validateAccount(req.user as AuthenticatedUser, accountId, 'sellerOrRegistered')
    const result = await prisma.$transaction(async (tx) => {
      const existingAccount = await tx.account.findUnique({
        where: { id: accountId },
        include: { user: true }
      })

      if (!existingAccount) {
        throw new Error('Account not found.')
      }

      if (existingAccount.type !== 'SELLER') {
        await tx.account.update({
          where: { id: accountId },
          data: { type: 'CUSTOMER' },
        })
      }

      const stripeCustomer = await stripe.customers.create({
        email: existingAccount.email || undefined,
        name: `${firstName} ${lastName}`.trim() || undefined,
        phone: phone || undefined,
        address: {
          line1: address,
          city,
          state,
          postal_code: zipCode,
        },
      })

      const newCustomer = await tx.customer.create({
        data: {
          account: { connect: { id: accountId } },
          firstName,
          lastName,
          phone,
          address,
          city,
          state,
          zipCode,
          paymentAccountId: stripeCustomer.id,
          paymentAccountStatus: 'COMPLETED',
        },
      })

      return { newCustomer, existingAccount }
    }, { timeout: 60000 })

    if (result.existingAccount.user) {
      try {
        await promoteUserToCustomer(result.existingAccount.user.authId)
      } catch (error) {
        console.error('Failed to promote user to customer role:', error)
      }
    }

    res.json(result.newCustomer)
  } catch (error) {
    const { statusCode, prismaError, customError } = generatePrismaError(error as Prisma.PrismaClientKnownRequestError)
    console.error('CREATE_CUSTOMER_ERROR:', prismaError || customError)
    res.status(statusCode).send({ errorMessage: customError || 'Failed to create customer.' })
  }
})

/**
 * @openapi
 * /customer/{accountId}:
 *   put:
 *     tags:
 *       - Customer
 *     summary: Update an existing customer profile
 *     description: Updates a customer's local and Stripe information. Requires a valid customer associated with the provided account ID.
 *     parameters:
 *       - in: path
 *         name: accountId
 *         required: true
 *         schema:
 *           type: string
 *         description: The ID of the account associated with the customer to update.
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               firstName:
 *                 type: string
 *               lastName:
 *                 type: string
 *               phone:
 *                 type: string
 *               address:
 *                 type: string
 *               zipCode:
 *                 type: string
 *               city:
 *                 type: string
 *               state:
 *                 type: string
 *               country:
 *                 type: string
 *     responses:
 *       '200':
 *         description: Successfully updated the customer account.
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Customer'
 *       '400':
 *         description: Missing Stripe customer ID or invalid input.
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 error:
 *                   type: string
 *       '500':
 *         description: Internal server error during update.
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 error:
 *                   type: string
 */
customerRouter.put('/customer/:accountId', async (req, res) => {
  const { accountId } = req.params
  const {
    firstName,
    lastName,
    phone,
    address,
    zipCode,
    city,
    state,
    country,
  } = req.body

  try {
    await validateAccount(req.user as AuthenticatedUser, accountId, 'customer')
    const result = await prisma.$transaction(async (tx) => {
      const updatedCustomer = await tx.customer.update({
        where: { accountId },
        data: {
          firstName,
          lastName,
          phone,
          address,
          zipCode,
          city,
          state,
        },
      })

      if (!updatedCustomer.paymentAccountId) {
        throw new Error('Customer ID not found')
      }

      const stripeUpdatedCustomerData: Stripe.CustomerUpdateParams = {
        ...(firstName || lastName ? { name: `${firstName} ${lastName}`.trim() } : {}),
        ...(phone ? { phone } : {}),
        ...(address || zipCode || city || state
          ? {
            address: {
              ...(address ? { line1: address } : {}),
              ...(zipCode ? { postal_code: zipCode } : {}),
              ...(city ? { city } : {}),
              ...(state ? { state } : {}),
              ...(country ? { country } : {}),
            },
          }
          : {}),
      }

      await stripe.customers.update(updatedCustomer.paymentAccountId, stripeUpdatedCustomerData)

      return updatedCustomer
    }, { timeout: 60000 })

    res.json(result)
  } catch (error) {
    const { statusCode, prismaError, customError } = generatePrismaError(error as Prisma.PrismaClientKnownRequestError)
    console.error('UPDATE_CUSTOMER_ERROR:', prismaError || customError)
    res.status(statusCode).send({ errorMessage: customError || 'Failed to update customer.' })
  }
})

/**
 * @openapi
 * /customer/payment-methods/{customerId}:
 *   get:
 *     tags:
 *       - Customer
 *     summary: Retrieve Stripe payment methods for a customer
 *     description: Returns a list of saved card payment methods for a given Stripe customer ID.
 *     parameters:
 *       - in: path
 *         name: customerId
 *         required: true
 *         schema:
 *           type: string
 *         description: The Stripe customer ID whose payment methods you want to retrieve.
 *     responses:
 *       '200':
 *         description: Successfully retrieved the customer's payment methods.
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 object:
 *                   type: string
 *                   example: list
 *                 data:
 *                   type: array
 *                   items:
 *                     $ref: '#/components/schemas/PaymentMethod'
 *       '400':
 *         description: Missing or invalid customerId.
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 error:
 *                   type: string
 *                   example: "Missing required parameter: customerId"
 *       '500':
 *         description: Server error while retrieving payment methods.
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 error:
 *                   type: string
 *                   example: Failed to retrieve payment methods
 */
customerRouter.get('/customer/payment-methods/:customerId', async (req, res) => {
  const { customerId } = req.params

  try {
    if (!customerId) {
      throw new Error('Missing required parameter: customerId')
    }
    const paymentMethods = await stripe.paymentMethods.list({
      customer: customerId,
      type: 'card',
    })

    return res.status(200).json(paymentMethods)
  } catch (error) {
    const { statusCode, prismaError, customError } = generatePrismaError(error as Prisma.PrismaClientKnownRequestError)
    console.error('GET_CUSTOMER_PAYMENT_METHODS_ERROR:', prismaError || customError)
    res.status(statusCode).send({ errorMessage: 'Failed to retrieve customer payment methods.' })
  }
})

/**
 * @openapi
 * /customer/payment-method/{customerId}:
 *   post:
 *     tags:
 *       - Customer
 *     summary: Add a payment method to a customer
 *     description: Attaches a Stripe payment method to the specified customer and sets it as the default payment method.
 *     parameters:
 *       - in: path
 *         name: customerId
 *         required: true
 *         schema:
 *           type: string
 *         description: The Stripe customer ID to which the payment method should be attached.
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - paymentMethodId
 *             properties:
 *               paymentMethodId:
 *                 type: string
 *                 example: pm_1JX8Yb2eZvKYlo2CJfXZ1234
 *     responses:
 *       '200':
 *         description: Payment method successfully added and set as default.
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: string
 *                   example: Payment method was successfully added
 *       '400':
 *         description: Missing required parameters.
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 error:
 *                   type: string
 *                   example: "Missing required parameters."
 *       '500':
 *         description: Error occurred while adding the payment method.
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 error:
 *                   type: string
 *                   example: There was an error while adding your payment method
 */
customerRouter.post('/customer/payment-method/:accountId', async (req, res) => {
  const { accountId } = req.params
  const { paymentMethodId } = req.body

  if (!accountId || !paymentMethodId) {
    throw new Error('Missing required parameters.')
  }

  try {
    await validateAccount(req.user as AuthenticatedUser, accountId, 'customer')
    const result = await prisma.$transaction(async (tx) => {
      const updatedCustomer = await tx.customer.update({
        where: { accountId },
        data: {
          hasPaymentMethod: true,
        },
      })
      if (!updatedCustomer.paymentAccountId) {
        throw new Error('Seller does not have a payment account ID.')
      }
      await stripe.paymentMethods.attach(paymentMethodId, { customer: updatedCustomer.paymentAccountId! })

      await stripe.customers.update(updatedCustomer.paymentAccountId!, {
        invoice_settings: { default_payment_method: paymentMethodId },
      })
      return { success: 'Payment method was successfully added'}
    }, { timeout: 60000 })
    res.json(result)
  } catch (error) {
    const { statusCode, prismaError, customError } = generatePrismaError(error as Prisma.PrismaClientKnownRequestError)
    console.error('CREATE_CUSTOMER_PAYMENT_METHOD_ERROR:', prismaError || customError)
    res.status(statusCode).send({ errorMessage: customError || 'Failed to create customer payment method.' })
  }
})

/**
 * @openapi
 * /customer/payment-method/{paymentMethodId}:
 *   delete:
 *     tags:
 *       - Customer
 *     summary: Remove a customer's payment method
 *     description: Detaches a Stripe payment method from a customer.
 *     parameters:
 *       - in: path
 *         name: paymentMethodId
 *         required: true
 *         schema:
 *           type: string
 *         description: The Stripe payment method ID to be removed.
 *     responses:
 *       '200':
 *         description: Payment method successfully removed.
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: string
 *                   example: Payment method was successfully removed
 *       '400':
 *         description: Missing required parameter.
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 error:
 *                   type: string
 *                   example: "Missing required parameter: paymentMethodId"
 *       '500':
 *         description: Error occurred while removing the payment method.
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 error:
 *                   type: string
 *                   example: There was an error while removing your payment method
 */
customerRouter.delete('/customer/payment-method/:accountId/:paymentMethodId', async (req, res) => {
  const { accountId, paymentMethodId } = req.params

  if (!accountId || !paymentMethodId) {
    throw new Error('Missing required parameters: accountId and paymentMethodId')
  }

  try {
    await validateAccount(req.user as AuthenticatedUser, accountId, 'customer')
    await stripe.paymentMethods.detach(paymentMethodId)

    return res.json({ success: 'Payment method was successfully removed' })
  } catch (error) {
    const { statusCode, prismaError, customError } = generatePrismaError(error as Prisma.PrismaClientKnownRequestError)
    console.error('DELETE_CUSTOMER_PAYMENT_METHOD_ERROR:', prismaError || customError)
    res.status(statusCode).send({ errorMessage: customError || 'Failed to delete customer payment method.' })
  }
})

export default customerRouter
