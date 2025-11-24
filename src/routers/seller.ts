import { Prisma } from '@prisma/client'
import express from 'express'
import { getPrismaClient, generatePrismaError } from '../utils/prismaHelpers'
import stripe from '../utils/stripe'
import Stripe from 'stripe'
import { generateIncludes } from '../utils/generateIncludes'
import { validateSeller } from '../validation/seller'
import { calculateWalletBalance } from '../services/payout'
import { validatePayoutAmount } from '../validation/payout'
import { AuthenticatedUser, validateAccount } from '../validation/user'

const prisma = getPrismaClient()
export const sellerRouter = express.Router()

/**
 * @openapi
 * /seller/{id}:
 *   get:
 *     tags:
 *       - Seller
 *     summary: Get seller by ID
 *     description: Retrieves a seller by their unique ID. You can optionally include related entities using the `include` query parameter.
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *         description: The ID of the seller to retrieve.
 *       - in: query
 *         name: include
 *         required: false
 *         schema:
 *           type: string
 *         description: Comma-separated list of related entities to include (e.g., `account,shippingOptions`).
 *     responses:
 *       '200':
 *         description: Seller retrieved successfully.
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Seller'
 *       '404':
 *         description: No seller found with the given ID.
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 errorMessage:
 *                   type: string
 *                   example: No seller ID found
 *       '500':
 *         description: Internal server error while retrieving seller.
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 errorMessage:
 *                   type: string
 */
sellerRouter.get('/seller/:id', async (req, res) => {
  const { id } = req.params
  const { include } = req.query

  try {
    if (!id) {
      throw new Error('Seller ID is required')
    }
    const seller = await prisma.seller.findUnique({
      where: { id },
      include: generateIncludes(include as string)
    })

    if (seller) {
      res.json(seller)
    } else {
      throw new Error('No seller ID found')
    }
  } catch (error) {
    const { statusCode, prismaError, customError } = generatePrismaError(error as Prisma.PrismaClientKnownRequestError)
    console.error('GET_SELLER_ERROR:', prismaError || customError)
    res.status(statusCode).send({ errorMessage: customError || 'Failed to retrieve seller.' })
  }
})

/**
 * @openapi
 * /seller/{accountId}:
 *   post:
 *     tags:
 *       - Seller
 *     summary: Create a new seller account
 *     description: Converts an existing account to a seller and creates a Stripe account with the provided information.
 *     parameters:
 *       - in: path
 *         name: accountId
 *         required: true
 *         schema:
 *           type: string
 *         description: The ID of the account to convert into a seller.
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               sellerType:
 *                 type: string
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
 *               ssn:
 *                 type: string
 *                 description: Full SSN (optional, for enhanced verification)
 *               ssnLastFour:
 *                 type: string
 *               businessName:
 *                 type: string
 *               website:
 *                 type: string
 *               mcc:
 *                 type: string
 *                 description: Merchant category code
 *               taxId:
 *                 type: string
 *               dateOfBirth:
 *                 type: object
 *                 properties:
 *                   day:
 *                     type: integer
 *                   month:
 *                     type: integer
 *                   year:
 *                     type: integer
 *               agreedToTerms:
 *                 type: boolean
 *     responses:
 *       '200':
 *         description: Seller account created successfully.
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Seller'
 *       '400':
 *         description: Invalid request or missing parameters.
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 error:
 *                   type: string
 *       '500':
 *         description: Internal server error while creating the seller.
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 error:
 *                   type: string
 */
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
    await validateAccount(req.user as AuthenticatedUser, accountId, 'customerOrRegistered')
    const result = await prisma.$transaction(async (tx) => {
      const updatedAccount = await tx.account.update({
        where: { id: accountId },
        data: { type: 'SELLER' },
      })

      if (!updatedAccount) {
        throw new Error('Account not found.')
      }

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

      const newSeller = await tx.seller.create({
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
          paymentAccountId: stripeAccount.id,
          paymentAccountStatus: 'PENDING',
        }
      })

      return newSeller
    }, { timeout: 60000 })

    res.json(result)
  } catch (error) {
    const { statusCode, prismaError, customError } = generatePrismaError(error as Prisma.PrismaClientKnownRequestError)
    console.error('CREATE_SELLER_ERROR:', prismaError || customError)
    res.status(statusCode).send({ errorMessage: customError || 'Failed to create seller.' })
  }
})

/**
 * @openapi
 * /seller/{accountId}:
 *   put:
 *     tags:
 *       - Seller
 *     summary: Update seller account details
 *     description: Updates seller information and syncs changes to the associated Stripe account.
 *     parameters:
 *       - in: path
 *         name: accountId
 *         required: true
 *         schema:
 *           type: string
 *         description: The ID of the account to update seller information for.
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               sellerType:
 *                 type: string
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
 *               businessName:
 *                 type: string
 *               website:
 *                 type: string
 *     responses:
 *       '200':
 *         description: Seller account updated successfully.
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Seller'
 *       '400':
 *         description: Invalid request or parameters.
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 error:
 *                   type: string
 *       '500':
 *         description: Internal server error while updating the seller.
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 error:
 *                   type: string
 */
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
    await validateAccount(req.user as AuthenticatedUser, accountId, 'seller')
    const result = await prisma.$transaction(async (tx) => {
      const updatedSeller = await tx.seller.update({
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
        metadata: { testKey: Date.now().toString() },
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
    const { statusCode, prismaError, customError } = generatePrismaError(error as Prisma.PrismaClientKnownRequestError)
    console.error('UPDATE_SELLER_ERROR:', prismaError || customError)
    res.status(statusCode).send({ errorMessage: customError || 'Failed to update seller.' })
  }
})

/**
 * @openapi
 * /seller/shipping-preferences/{id}:
 *   put:
 *     tags:
 *       - Seller
 *     summary: Update seller shipping preferences
 *     description: Updates a seller's shipping carrier types and associated shipping methods.
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *         description: The ID of the seller whose shipping preferences are being updated.
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               shippingCarrierTypes:
 *                 type: array
 *                 items:
 *                   type: string
 *                 description: List of selected shipping carrier types (e.g., USPS, UPS).
 *               sellerShippingMethods:
 *                 type: object
 *                 properties:
 *                   create:
 *                     type: array
 *                     items:
 *                       type: object
 *                       properties:
 *                         shippingMethodId:
 *                           type: string
 *                   delete:
 *                     type: array
 *                     items:
 *                       type: string
 *                 description: Methods to create or delete in the seller’s shipping preferences.
 *     responses:
 *       '200':
 *         description: Shipping preferences successfully updated.
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Seller'
 *       '500':
 *         description: Server error while updating shipping preferences.
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 error:
 *                   type: string
 */
sellerRouter.put('/seller/shipping-preferences/:id', async (req, res) => {
  const { id } = req.params
  const {
    accountId,
    shippingCarrierTypes,
    sellerShippingMethods,
    sellerShippingOptions
  } = req.body

  try {
    await validateAccount(req.user as AuthenticatedUser, accountId, 'seller')
    const updatedSeller = await prisma.seller.update({
      where: { id },
      data: {
        shippingCarrierTypes,
        sellerShippingMethods: sellerShippingMethods
          ? {
            create: sellerShippingMethods.create?.map((sellerShippingMethod: { shippingMethodId: string }) => ({
              shippingMethodId: sellerShippingMethod.shippingMethodId,
            })),
            deleteMany: sellerShippingMethods.delete?.map((sellerShippingMethodId: string) => ({
              id: sellerShippingMethodId
            })),
          }
          : undefined,
        sellerShippingOptions: sellerShippingOptions
          ? {
            create: sellerShippingOptions.create?.map((sellerShippingOption: { shippingOptionId: string }) => ({
              shippingOptionId: sellerShippingOption.shippingOptionId,
            })),
            deleteMany: sellerShippingOptions.delete?.map((sellerShippingOptionId: string) => ({
              id: sellerShippingOptionId
            })),
          }
          : undefined,
      },
    })
    res.json(updatedSeller)
  } catch (error) {
    const { statusCode, prismaError, customError } = generatePrismaError(error as Prisma.PrismaClientKnownRequestError)
    console.error('UPDATE_SELLER_SHIPPING_PREFERENCES_ERROR:', prismaError || customError)
    res.status(statusCode).send({ errorMessage: customError || 'Failed to update seller shipping preferences.' })
  }
})

/**
 * @openapi
 * /seller/payment-methods/{sellerId}:
 *   get:
 *     tags:
 *       - Seller
 *     summary: Retrieve seller external payment methods
 *     description: Fetches the list of external accounts (e.g., bank accounts, cards) associated with the seller's Stripe account.
 *     parameters:
 *       - in: path
 *         name: sellerId
 *         required: true
 *         schema:
 *           type: string
 *         description: The Stripe seller account ID used to fetch external payment methods.
 *     responses:
 *       '200':
 *         description: Successfully retrieved seller payment methods.
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
 *                     type: object
 *                     description: External account object returned by Stripe.
 *       '400':
 *         description: Missing required sellerId parameter.
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 error:
 *                   type: string
 *       '500':
 *         description: Server error while retrieving payment methods.
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 error:
 *                   type: string
 */
sellerRouter.get('/seller/payment-methods/:sellerId', async (req, res) => {
  const { sellerId } = req.params

  try {
    if (!sellerId) {
      throw new Error('Missing required parameter: sellerId')
    }
    const seller = await prisma.seller.findUnique({
      where: { id: sellerId },
      select: { paymentAccountId: true, accountId: true },
    })

    if (!seller?.paymentAccountId) {
      throw new Error('Seller payment account not found.')
    }

    const externalAccounts = await stripe.accounts.listExternalAccounts(seller.paymentAccountId, {
      limit: 100,
    })

    return res.status(200).json(externalAccounts)
  } catch (error) {
    const { statusCode, prismaError, customError } = generatePrismaError(error as Prisma.PrismaClientKnownRequestError)
    console.error('GET_SELLER_PAYMENT_METHODS_ERROR:', prismaError || customError)
    res.status(statusCode).send({ errorMessage: customError || 'Failed to retrieve seller payment methods.' })
  }
})

/**
 * @openapi
 * /seller/payment-method/{sellerId}:
 *   post:
 *     tags:
 *       - Seller
 *     summary: Add external payment method to seller account
 *     description: Attaches a new external account (e.g., bank account or debit card) to the seller's Stripe account using a token.
 *     parameters:
 *       - in: path
 *         name: sellerId
 *         required: true
 *         schema:
 *           type: string
 *         description: The Stripe account ID for the seller.
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - tokenId
 *             properties:
 *               tokenId:
 *                 type: string
 *                 description: A Stripe token (tok_...) representing the external payment method. For Connect accounts, payment method IDs (pm_...) cannot be used directly - they must be converted to tokens using Stripe.js on the frontend first.
 *               paymentMethodId:
 *                 type: string
 *                 description: Alternative parameter name for tokenId. Note: If a payment method ID (pm_...) is provided, the API will return an error instructing the frontend to create a token from it first.
 *     responses:
 *       '200':
 *         description: Successfully added external account.
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: string
 *                   example: External account was successfully added
 *       '400':
 *         description: Missing required parameters.
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 error:
 *                   type: string
 *                   example: Missing required parameters.
 *       '500':
 *         description: Server error while adding payment method.
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 error:
 *                   type: string
 *                   example: There was an error while confirming setup intent
 */
sellerRouter.post('/seller/payment-method/:accountId', async (req, res) => {
  const { accountId } = req.params
  const { tokenId, paymentMethodId } = req.body

  try {
    const providedTokenId = tokenId || paymentMethodId

    if (!accountId || !providedTokenId) {
      throw new Error('Missing required parameters: accountId and either tokenId or paymentMethodId.')
    }

    if (providedTokenId.startsWith('pm_')) {
      throw new Error(
        'Payment method IDs (pm_...) cannot be used directly for Connect accounts. ' +
        'For seller external accounts, you need to create a token from the payment method using Stripe.js on the frontend. ' +
        'Please use Stripe.js to create a token and send the tokenId (tok_...) instead.'
      )
    }

    await validateAccount(req.user as AuthenticatedUser, accountId, 'seller')

    const result = await prisma.$transaction(async (tx) => {
      const updatedSeller = await tx.seller.update({
        where: { accountId },
        data: {
          hasPaymentMethod: true,
        },
      })
      if (!updatedSeller.paymentAccountId) {
        throw new Error('Seller does not have a payment account ID.')
      }

      await stripe.accounts.createExternalAccount(
        updatedSeller.paymentAccountId,
        { external_account: providedTokenId }
      )
      return { success: 'Payment method was successfully added'}
    }, { timeout: 60000 })
    res.json(result)
  } catch (error) {
    const { statusCode, prismaError, customError } = generatePrismaError(error as Prisma.PrismaClientKnownRequestError)
    console.error('CREATE_SELLER_PAYMENT_METHOD_ERROR:', prismaError || customError)
    res.status(statusCode).send({ errorMessage: customError || 'Failed to create seller payment method.' })
  }
})

/**
 * @openapi
 * /seller/upload-verification/{accountId}:
 *   post:
 *     tags:
 *       - Seller
 *     summary: Upload identity verification documents
 *     description: Uploads front and back identity documents to Stripe for KYC verification, and marks the seller as verified in the local database.
 *     parameters:
 *       - in: path
 *         name: accountId
 *         required: true
 *         schema:
 *           type: string
 *         description: The account ID of the seller.
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - front
 *               - back
 *             properties:
 *               front:
 *                 type: object
 *                 required:
 *                   - base64
 *                   - name
 *                   - type
 *                 properties:
 *                   base64:
 *                     type: string
 *                     description: Base64-encoded image data for the front of the document.
 *                   name:
 *                     type: string
 *                     description: The filename of the front image.
 *                   type:
 *                     type: string
 *                     description: MIME type of the front image.
 *               back:
 *                 type: object
 *                 required:
 *                   - base64
 *                   - name
 *                   - type
 *                 properties:
 *                   base64:
 *                     type: string
 *                     description: Base64-encoded image data for the back of the document.
 *                   name:
 *                     type: string
 *                     description: The filename of the back image.
 *                   type:
 *                     type: string
 *                     description: MIME type of the back image.
 *     responses:
 *       '200':
 *         description: Identity documents successfully uploaded and account updated.
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: string
 *                   example: Identity verification files uploaded and Stripe account updated.
 *       '400':
 *         description: Missing front or back image data.
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 error:
 *                   type: string
 *                   example: Both front and back images are required.
 *       '500':
 *         description: Stripe upload or account update failed.
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 error:
 *                   type: string
 *                   example: Stripe identity verification failed.
 */
sellerRouter.post('/seller/upload-verification/:accountId', async (req, res) => {
  const { accountId } = req.params
  const { front, back } = req.body
  const frontBuffer = Buffer.from(front.base64, 'base64')
  const backBuffer = Buffer.from(back.base64, 'base64')

  try {
    if (!frontBuffer || !backBuffer) {
      throw new Error('Both front and back images are required.')
    }
    await validateAccount(req.user as AuthenticatedUser, accountId, 'seller')

    const result = await prisma.$transaction(async (tx) => {
      const updatedSeller = await tx.seller.update({
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

      return { success: 'Identity verification files uploaded and account updated.'}
    }, { timeout: 60000 })
    res.json(result)
  } catch (error) {
    const { statusCode, prismaError } = generatePrismaError(error as Prisma.PrismaClientKnownRequestError)
    console.error('CREATE_SELLER_UPLOAD_VERIFICATION_ERROR:', prismaError)
    res.status(statusCode).send({ errorMessage: 'Failed to create seller upload verification.' })
  }
})

/**
 * @openapi
 * /seller/payout/{sellerId}:
 *   post:
 *     tags:
 *       - Seller
 *     summary: Create a new payout for a seller
 *     description: Creates a Stripe payout for the seller’s connected account and logs it in the database, along with a linked transaction record.
 *     parameters:
 *       - in: path
 *         name: sellerId
 *         required: true
 *         schema:
 *           type: string
 *         description: The Stripe-connected seller account ID.
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - amount
 *               - accountId
 *             properties:
 *               amount:
 *                 type: number
 *                 format: float
 *                 example: 25.00
 *                 description: The amount (in USD) to pay out.
 *               accountId:
 *                 type: string
 *                 example: acct_123abc
 *                 description: The ID of the account that initiated the payout.
 *     responses:
 *       '200':
 *         description: Payout created successfully.
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Payout'
 *       '400':
 *         description: Missing required parameters.
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 error:
 *                   type: string
 *                   example: Missing required parameters.
 *       '500':
 *         description: Failed to create payout.
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 error:
 *                   type: string
 *                   example: Failed to create payout.
 */
sellerRouter.post('/seller/payout/:sellerId', async (req, res) => {
  const { sellerId } = req.params
  const { amount, accountId } = req.body

  try {
    if (!amount || !accountId) {
      throw new Error('Missing required parameters.')
    }
    await validateAccount(req.user as AuthenticatedUser, accountId, 'seller')
    await validateSeller(accountId)
    await validatePayoutAmount(accountId, sellerId, amount)

    const result = await prisma.$transaction(async (tx) => {
      const seller = await tx.seller.findUnique({
        where: { accountId },
        select: { paymentAccountId: true },
      })

      if (!seller?.paymentAccountId) {
        throw new Error('Seller paymentAccountId not found.')
      }

      const stripeAccount = await stripe.accounts.retrieve(seller.paymentAccountId, {
        expand: ['external_accounts'],
      }) as Stripe.Account & {
        external_accounts: {
          data: (Stripe.Card | Stripe.BankAccount)[]
        }
      }

      const externalAccount = stripeAccount.external_accounts.data.find(
        (acc) => acc.object === 'card' && acc.default_for_currency === true
      )

      if (!externalAccount || !('last4' in externalAccount)) {
        throw new Error('Seller does not have a valid default external account set.')
      }

      const payout = await tx.payout.create({
        data: {
          status: 'COMPLETED',
          total: amount,
          accountId,
          last4: externalAccount.last4,
          transactions: {
            create: {
              amount,
              transactionType: 'PAYOUT',
              currency: 'USD',
              paymentAccountType: 'STRIPE',
              paymentMethodType: 'CARD',
              accountId,
            },
          },
        },
      })

      await stripe.payouts.create(
        {
          amount: Math.round(parseFloat(amount) * 100),
          currency: 'usd',
          method: 'instant'
        },
        {
          stripeAccount: seller?.paymentAccountId,
        }
      )

      return payout
    }, { timeout: 60000 })

    res.json(result)
  } catch (error) {
    const { statusCode, prismaError, customError } = generatePrismaError(error as Prisma.PrismaClientKnownRequestError)
    console.error('CREATE_SELLER_PAYOUT_ERROR:', prismaError || customError)
    res.status(statusCode).send({ errorMessage: customError || 'Failed to create seller payout.' })
  }
})

/**
 * @openapi
 * /seller/payout-history/{accountId}:
 *   get:
 *     tags:
 *       - Seller
 *     summary: Get seller payout history
 *     description: Returns all recorded payouts from the database for a given seller account.
 *     parameters:
 *       - in: path
 *         name: accountId
 *         required: true
 *         schema:
 *           type: string
 *         description: The seller's account ID to fetch payout history for.
 *     responses:
 *       '200':
 *         description: List of payouts
 *         content:
 *           application/json:
 *             schema:
 *               type: array
 *               items:
 *                 $ref: '#/components/schemas/Payout'
 *       '400':
 *         description: Missing or invalid accountId
 *       '500':
 *         description: Server error while retrieving payout history
 */
sellerRouter.get('/seller/payout-history/:accountId', async (req, res) => {
  const { accountId } = req.params

  try {
    if (!accountId) {
      throw new Error('Missing accountId parameter.')
    }
    const payouts = await prisma.payout.findMany({
      where: {
        accountId: accountId,
      },
      orderBy: {
        createdAt: 'desc',
      },
      include: {
        transactions: true,
      },
    })

    return res.status(200).json(payouts)
  } catch (error) {
    const { statusCode, prismaError } = generatePrismaError(error as Prisma.PrismaClientKnownRequestError)
    console.error('GET_SELLER_PAYOUT_HISTORY_ERROR:', prismaError)
    res.status(statusCode).send({ errorMessage: 'Failed to retrieve seller payout history.' })
  }
})

/**
 * @openapi
 * /seller/wallet-balance/{accountId}:
 *   get:
 *     tags:
 *       - Seller
 *     summary: Get seller wallet balance and available withdrawal amount
 *     description: |
 *       Returns the seller's wallet balance and available amount for withdrawal.
 *       - `balance` = Total of all PENDING + COMPLETED orders for the seller minus all COMPLETED payouts.
 *       - `availableToWithdraw` = Total of COMPLETED orders for the seller minus all COMPLETED payouts.
 *     parameters:
 *       - in: path
 *         name: accountId
 *         required: true
 *         schema:
 *           type: string
 *         description: The seller's account ID.
 *     responses:
 *       200:
 *         description: Wallet balance and withdrawal info retrieved successfully.
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 balance:
 *                   type: number
 *                   description: Total balance from orders minus completed payouts.
 *                   example: 550.00
 *                 availableToWithdraw:
 *                   type: number
 *                   description: Available funds for withdrawal (completed orders only minus completed payouts).
 *                   example: 400.00
 *       400:
 *         description: Missing or invalid accountId parameter.
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 error:
 *                   type: string
 *                   example: Missing accountId in path.
 *       500:
 *         description: Internal server error retrieving wallet balance.
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 errorMessage:
 *                   type: string
 *                   example: There was an error calculating wallet balance.
 */
sellerRouter.get('/seller/wallet-balance/:accountId', async (req, res) => {
  const { accountId } = req.params

  try {
    if (!accountId) {
      throw new Error('Missing accountId in path.')
    }
    const account = await prisma.account.findUnique({
      where: { id: accountId },
      include: { seller: true },
    })

    if (!account?.seller?.id) {
      throw new Error('Seller not found for this account.')
    }

    const wallet = await calculateWalletBalance(accountId, account.seller.id)
    return res.json(wallet)
  } catch (error) {
    const { statusCode, prismaError, customError } = generatePrismaError(error as Prisma.PrismaClientKnownRequestError)
    console.error('GET_SELLER_WALLET_BALANCE_ERROR:', prismaError || customError)
    res.status(statusCode).send({ errorMessage: customError || 'Failed to retrieve seller wallet balance.' })
  }
})

/**
 * @openapi
 * /seller/{accountId}:
 *   delete:
 *     tags:
 *       - Seller
 *     summary: Delete a seller's account and Stripe account
 *     description: Deletes the seller's connected Stripe account and local seller record using their accountId.
 *     parameters:
 *       - in: path
 *         name: accountId
 *         required: true
 *         schema:
 *           type: string
 *         description: The account ID of the seller to be deleted.
 *     responses:
 *       '200':
 *         description: Seller account successfully deleted.
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: string
 *                   example: Seller account was successfully deleted
 *       '400':
 *         description: Bad request or invalid account ID.
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 errorMessage:
 *                   type: string
 *       '500':
 *         description: Internal Server Error during seller account deletion.
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 errorMessage:
 *                   type: string
 */
sellerRouter.delete('/seller/:accountId', async (req, res) => {
  const { accountId } = req.params

  try {
    await validateAccount(req.user as AuthenticatedUser, accountId, 'seller')

    const existingSeller = await prisma.seller.findUnique({
      where: { accountId },
      select: { id: true, paymentAccountId: true }
    })

    if (!existingSeller) {
      throw new Error('No seller found for this account')
    }

    await prisma.$transaction(async (tx) => {
      const deletedSeller = await tx.seller.delete({
        where: { accountId }
      })

      await stripe.accounts.del(existingSeller.paymentAccountId!)

      return deletedSeller
    }, { timeout: 60000 })

    return res.json({ success: 'Seller account was successfully deleted' })

  } catch (error) {
    const { statusCode, prismaError, customError } = generatePrismaError(error as Prisma.PrismaClientKnownRequestError)
    console.error('DELETE_SELLER_ERROR:', prismaError || customError)
    res.status(statusCode).send({ errorMessage: customError || 'Failed to delete seller.' })
  }
})