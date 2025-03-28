import { Prisma } from '@prisma/client'
import express from 'express'
import { getPrismaClient, generatePrismaError } from '../utils/prismaHelpers'
import stripe from '../utils/stripe'
import Stripe from 'stripe'
const prisma = getPrismaClient()

export const sellerRouter = express.Router()

sellerRouter.post('/seller/:accountId', async (req, res) => {
  const { accountId } = req.params
  const {
    sellerType,
    firstName,
    lastName,
    phone,
    address,
    zipCode,
    city,
    state,
    ssn,
    ssnLastFour,
    businessName,
    website,
    mcc,
    taxId,
    dateOfBirth,
    agreedToTerms
  } = req.body

  try {
    const result = await prisma.$transaction(async (prisma) => {
      const updatedAccount = await prisma.account.update({
        where: { id: accountId },
        data: { type: 'SELLER' },
      })

      if (!updatedAccount) {
        throw new Error('Account not found.')
      }

      await prisma.seller.create({
        data: {
          accountId,
          sellerType,
          firstName,
          lastName,
          phone,
          address,
          zipCode,
          city,
          state,
          businessName,
          website,
        }
      })

      const stripeAccountData: Stripe.AccountCreateParams = {
        type: 'custom',
        email: updatedAccount.email || undefined,
        business_type: 'individual',
        country: 'US',
        capabilities: {
          card_payments: { requested: true },
          transfers: { requested: true },
        },
        individual: {
          first_name: firstName,
          last_name: lastName,
          email: updatedAccount.email || undefined,
          ssn_last_4: ssnLastFour,
          id_number: ssn || undefined,
          phone,
          dob: dateOfBirth,
          address: {
            line1: address,
            postal_code: zipCode,
            city,
            state
          }
        },
        company: {
          name: businessName,
          tax_id: taxId,
          phone,
          address: {
            line1: address,
            postal_code: zipCode,
            city,
            state
          },
        },
        business_profile: {
          url: website,
          mcc: mcc,
        },
        ...(agreedToTerms ? { tos_acceptance: {
          date: Math.floor(Date.now() / 1000),
          ip: req.ip,
        },} : {}),
      }

      const stripeAccount = await stripe.accounts.create(stripeAccountData)

      const updatedSeller = await prisma.seller.update({
        where: { accountId },
        data: {
          paymentAccountId: stripeAccount.id,
          paymentAccountStatus: 'PENDING',
        },
      })

      return updatedSeller
    }, { timeout: 60000 })

    res.json(result)
  } catch (error) {
    console.error('Error setting up seller account:', error)
    const { statusCode } = generatePrismaError(error as Prisma.PrismaClientKnownRequestError)
    return res.status(statusCode).json({ error: 'There was an error while creating your seller account' })
  }
})

sellerRouter.put('/seller/:accountId', async (req, res) => {
  const { accountId } = req.params
  const {
    sellerType,
    firstName,
    lastName,
    phone,
    address,
    zipCode,
    city,
    state,
    businessName,
    website,
  } = req.body

  try {
    const result = await prisma.$transaction(async (prisma) => {
      const updatedSeller = await prisma.seller.update({
        where: { accountId },
        data: {
          sellerType,
          firstName,
          lastName,
          phone,
          address,
          zipCode,
          city,
          state,
          businessName,
          website,
        },
      })

      const stripeUpdatedAccountData: Stripe.AccountUpdateParams = {
        ...(firstName || lastName || phone || address || zipCode || city || state
          ? {
            individual: {
              ...(firstName ? { first_name: firstName } : {}),
              ...(lastName ? { last_name: lastName } : {}),
              ...(phone ? { phone } : {}),
              ...(address || zipCode || city || state
                ? {
                  address: {
                    ...(address ? { line1: address } : {}),
                    ...(zipCode ? { postal_code: zipCode } : {}),
                    ...(city ? { city } : {}),
                    ...(state ? { state } : {}),
                  },
                }
                : {}),
            },
          }
          : {}),
        ...(businessName || phone || address || zipCode || city || state
          ? {
            company: {
              ...(businessName ? { name: businessName } : {}),
              ...(phone ? { phone } : {}),
              ...(address || zipCode || city || state
                ? {
                  address: {
                    ...(address ? { line1: address } : {}),
                    ...(zipCode ? { postal_code: zipCode } : {}),
                    ...(city ? { city } : {}),
                    ...(state ? { state } : {}),
                  },
                }
                : {}),
            },
          }
          : {}),
        ...(website ? { business_profile: { url: website } } : {}),
      }

      await stripe.accounts.update(updatedSeller.paymentAccountId!, stripeUpdatedAccountData)
      return updatedSeller
    }, { timeout: 60000 })

    res.json(result)
  } catch (error) {
    console.error('Error updating seller:', error)
    const { statusCode } = generatePrismaError(error as Prisma.PrismaClientKnownRequestError)
    return res.status(statusCode).json({ error: 'There was an error while updating your seller account' })
  }
})

sellerRouter.put('/seller/shipping-preferences/:sellerId', async (req, res) => {
  const { sellerId } = req.params
  const {
    sellerShippingCategories,
    shippingCarrierTypes
  } = req.body

  try {
    const updatedSeller = await prisma.seller.update({
      where: { id: sellerId },
      data: {
        shippingCarrierTypes,
        sellerShippingCategories: sellerShippingCategories
          ? {
            create: sellerShippingCategories.create?.map((sellerShippingCategory: { shippingCategoryId: string }) => ({
              shippingCategoryId: sellerShippingCategory.shippingCategoryId,
            })),
            deleteMany: sellerShippingCategories.delete?.map((sellerShippingCategoryId: string) => ({
              id: sellerShippingCategoryId
            })),
          }
          : undefined,
      },
    })
    res.json(updatedSeller)
  } catch (error) {
    console.error('Error fetching external accounts:', error)
    return res.status(500).json({ error: 'Failed to retrieve external accounts' })
  }
})

sellerRouter.get('/seller/payment-methods/:sellerId', async (req, res) => {
  const { sellerId } = req.params

  if (!sellerId) {
    return res.status(400).json({ error: 'Missing required parameter: sellerId' })
  }

  try {
    const externalAccounts = await stripe.accounts.listExternalAccounts(sellerId, {
      limit: 100,
    })

    return res.status(200).json(externalAccounts)
  } catch (error) {
    console.error('Error fetching external accounts:', error)
    return res.status(500).json({ error: 'Failed to retrieve external accounts' })
  }
})

sellerRouter.post('/seller/add-payment-method/:sellerId', async (req, res) => {
  const { sellerId } = req.params
  const { tokenId } = req.body

  if (!sellerId || !tokenId) {
    return res.status(400).json({ error: 'Missing required parameters.' })
  }

  try {
    await stripe.accounts.createExternalAccount(
      sellerId,
      { external_account: tokenId }
    )

    return res.status(200).json({ success: 'External account was successfully added' })
  } catch (error) {
    const { statusCode } = generatePrismaError(error as Prisma.PrismaClientKnownRequestError)
    return res.status(statusCode).json({ error: 'There was an error while confirming setup intent' })
  }
})

sellerRouter.post('/seller/upload-verification/:accountId', async (req, res) => {
  const { accountId } = req.params
  const { front, back } = req.body
  const frontBuffer = Buffer.from(front.base64, 'base64')
  const backBuffer = Buffer.from(back.base64, 'base64')

  if (!frontBuffer || !backBuffer) {
    return res.status(400).json({ error: 'Both front and back images are required.' })
  }

  try {
    const result = await prisma.$transaction(async (prisma) => {
      const updatedSeller = await prisma.seller.update({
        where: { accountId },
        data: {
          isPaymentAccountVerified: true,
        },
      })

      const frontUpload = await stripe.files.create({
        file: {
          data: frontBuffer,
          name: front.name,
          type: 'application/octet-stream',
        },
        purpose: 'identity_document',
      })

      const backUpload = await stripe.files.create({
        file: {
          data: backBuffer,
          name: back.name,
          type: 'application/octet-stream',
        },
        purpose: 'identity_document',
      })

      await stripe.accounts.update(updatedSeller.paymentAccountId!, {
        individual: {
          verification: {
            document: {
              front: frontUpload.id,
              back: backUpload.id,
            }
          }
        }
      })

      return { success: 'Identity verification files uploaded and Stripe account updated.'}
    }, { timeout: 60000 })
    res.json(result)
  } catch (error) {
    console.error('Stripe file upload or update failed:', error)
    return res.status(500).json({ error: 'Stripe identity verification failed.' })
  }
})

sellerRouter.delete('/seller/:sellerId', async (req, res) => {
  const { sellerId } = req.params

  try {
    await stripe.accounts.del(sellerId)

    return res.json({ success: 'Seller account id was successfully deleted' })

  } catch (error) {
    console.error('Error setting up seller account:', error)
    const { statusCode, errorMessage } = generatePrismaError(error as Prisma.PrismaClientKnownRequestError)
    res.status(statusCode).send({ errorMessage })
  }
})