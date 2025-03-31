import express from 'express'
import { getPrismaClient, generatePrismaError } from '../utils/prismaHelpers'
import stripe from '../utils/stripe'
import { Prisma } from '@prisma/client'
import Stripe from 'stripe'

const prisma = getPrismaClient()
export const customerRouter = express.Router()

customerRouter.post('/customer/:accountId', async (req, res) => {
  const { accountId } = req.params
  const { firstName, lastName, phone, address, city, state, zipCode } = req.body

  try {
    const result = await prisma.$transaction(async (prisma) => {
      const existingAccount = await prisma.account.findUnique({
        where: { id: accountId },
      })

      if (!existingAccount) {
        throw new Error('Account not found.')
      }

      if (existingAccount.type !== 'SELLER') {
        await prisma.account.update({
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

      const updatedCustomer = await prisma.customer.create({
        data: {
          accountId,
          paymentAccountId: stripeCustomer.id,
          paymentAccountStatus: 'COMPLETED',
          firstName,
          lastName,
          phone,
          address,
          city,
          state,
          zipCode
        },
      })

      return updatedCustomer
    })

    res.json(result)
  } catch (error) {
    console.error('Error setting up customer:', error)
    const { statusCode } = generatePrismaError(error as Prisma.PrismaClientKnownRequestError)
    return res.status(statusCode).json({ error: 'There was an error while creating your customer account' })
  }
})

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
    const result = await prisma.$transaction(async (prisma) => {
      const updatedCustomer = await prisma.customer.update({
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
        return res.status(400).json({ error: 'Stripe customer ID not found' })
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
    console.error('Error updating customer:', error)
    const { statusCode } = generatePrismaError(error as Prisma.PrismaClientKnownRequestError)
    return res.status(statusCode).json({ error: 'There was an error while updating your customer account' })
  }
})

customerRouter.get('/customer/payment-methods/:customerId', async (req, res) => {
  const { customerId } = req.params

  if (!customerId) {
    return res.status(400).json({ error: 'Missing required parameter: customerId' })
  }

  try {
    const paymentMethods = await stripe.paymentMethods.list({
      customer: customerId,
      type: 'card',
    })

    return res.status(200).json(paymentMethods)
  } catch (error) {
    console.error('Error fetching payment methods:', error)
    return res.status(500).json({ error: 'Failed to retrieve payment methods' })
  }
})

customerRouter.post('/customer/add-payment-method/:customerId', async (req, res) => {
  const { customerId } = req.params
  const { paymentMethodId } = req.body

  if (!customerId || !paymentMethodId) {
    return res.status(400).json({ error: 'Missing required parameters.' })
  }

  try {
    await stripe.paymentMethods.attach(paymentMethodId, { customer: customerId })

    await stripe.customers.update(customerId, {
      invoice_settings: { default_payment_method: paymentMethodId },
    })

    return res.status(200).json({ success: 'Payment method was successfully added' })
  } catch (error) {
    console.error('Error adding payment method:', error)
    return res.status(500).json({ error: 'There was an error while adding your payment method' })
  }
})

customerRouter.delete('/customer/payment-method/:paymentMethodId', async (req, res) => {
  const { paymentMethodId } = req.params

  if (!paymentMethodId) {
    return res.status(400).json({ error: 'Missing required parameter: paymentMethodId' })
  }

  try {
    await stripe.paymentMethods.detach(paymentMethodId)

    return res.json({ success: 'Payment method was successfully removed' })
  } catch (error) {
    console.error('Error removing payment method:', error)
    return res.status(500).json({ error: 'There was an error while removing your payment method' })
  }
})

export default customerRouter
