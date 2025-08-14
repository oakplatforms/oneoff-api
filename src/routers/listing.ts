import { Prisma, Status } from '@prisma/client'
import express from 'express'
import { generateIncludes } from '../utils/generateIncludes'
import { getPrismaClient, generatePrismaError } from '../utils/prismaHelpers'
import { resolveBids } from '../services/resolver'
import { validateSeller } from '../validation/seller'
import { validateExistingListing } from '../validation/listing'
import { paginatePrisma } from '../utils/paginatePrisma'
import { AuthenticatedUser, validateAccount } from '../validation/user'
import { uploadConfig, uploadImage } from '../utils/uploadImage'
import { deleteImage } from '../utils/deleteImage'

const prisma = getPrismaClient()
export const listingRouter = express.Router()

/**
 * @openapi
 * /listings:
 *   get:
 *     tags:
 *       - Listing
 *     summary: Retrieve a list of listings.
 *     description: Fetches a list of listings for a specific marketplace and brand. Optional query parameters can be used to filter listings by `entityId` or `profileId`, and to include related data.
 *     parameters:
 *       - in: query
 *         name: entityId
 *         schema:
 *           type: string
 *         description: Filter listings by entity ID.
 *       - in: query
 *         name: profileId
 *         schema:
 *           type: string
 *         description: Filter listings by profile ID.
 *       - in: query
 *         name: include
 *         schema:
 *           type: string
 *         description: Comma-separated list of related entities to include in the listing data (e.g., 'entity,profile').
 *     responses:
 *       '200':
 *         description: Successfully retrieved the list of listings.
 *         content:
 *           application/json:
 *             schema:
 *               type: array
 *               items:
 *                 $ref: '#/components/schemas/Listing'
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
listingRouter.get('/listings', async (req, res) => {
  const { include, entityId, accountId, status, usePagination, page, limit } = req.query

  try {
    const parsedLimit = parseInt(limit as string) || 10
    const parsedPage = parseInt(page as string) || 0

    const where = {
      AND: [
        status ? { status: status as Status } : {},
        entityId && accountId
          ? { entityId: entityId as string, accountId: accountId as string }
          : entityId
            ? { entityId: entityId as string }
            : accountId
              ? { accountId: accountId as string }
              : {},
        {
          OR: [
            { isOffer: false },
            { isOffer: null }
          ]
        }
      ]
    }

    const result = await paginatePrisma({
      prismaModel: prisma.listing,
      where,
      include: generateIncludes(include),
      page: parsedPage,
      limit: parsedLimit,
      usePagination: usePagination === 'false' ? false : true,
    })

    res.json(result)
  } catch (error) {
    const { statusCode, prismaError, customError } = generatePrismaError(error as Prisma.PrismaClientKnownRequestError)
    console.error('GET_LISTINGS_ERROR:', prismaError, customError)
    res.status(statusCode).send({ errorMessage: customError || 'Failed to retrieve listings.' })
  }
})

/**
 * @openapi
 * /listing/lowest-ask:
 *   get:
 *     tags:
 *       - Listing
 *     summary: Retrieve the lowest ask listing.
 *     description: Fetches the listing with the lowest price for a specific entity in a given marketplace and brand. The listing returned is the one with the lowest price, and if multiple listings have the same price, the oldest listing is returned.
 *     parameters:
 *       - in: query
 *         name: entityId
 *         schema:
 *           type: string
 *         description: Filter listings by entity ID.
 *       - in: query
 *         name: include
 *         schema:
 *           type: string
 *         description: Comma-separated list of related entities to include in the listing data (e.g., 'entity,profile').
 *     responses:
 *       '200':
 *         description: Successfully retrieved the lowest ask listing.
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Listing'
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
listingRouter.get('/listing/lowest-ask', async (req, res) => {
  const { include, entityId } = req.query

  if (!entityId) {
    throw new Error('entity ID is required to retrieve lowest ask listing')
  }
  try {
    const listing = await prisma.listing.findFirst({
      where: {
        AND: [
          { status: 'ACTIVE' },
          { entityId: entityId as string },
          {
            OR: [
              { isOffer: false },
              { isOffer: null }
            ]
          }
        ]
      },
      orderBy: [
        { price: 'asc' },
        { createdAt: 'asc' }
      ],
      include: generateIncludes(include),
    })

    res.json(listing)
  } catch (error) {
    const { statusCode, prismaError, customError } = generatePrismaError(error as Prisma.PrismaClientKnownRequestError)
    console.error('GET_LISTING_LOWEST_ASK_ERROR:', prismaError, customError)
    res.status(statusCode).send({ errorMessage: customError || 'Failed to retrieve listing lowest ask.' })
  }
})

/**
 * @openapi
 * /listing:
 *   post:
 *     tags:
 *       - Listing
 *     summary: Create a new listing.
 *     description: Adds a new listing to the database for a specific marketplace and brand. The request body must include details like `price`, `quantity`, `status`, `accountId`, `entityId`, and optionally `image`, `imageCaption`, and `multiTransactionsEnabled`. If the user already has a listing for this entity, an error will be returned.
 *     requestBody:
 *       required: true
 *       content:
 *         multipart/form-data:
 *           schema:
 *             type: object
 *             properties:
 *               price:
 *                 type: number
 *                 description: The price for the listing.
 *               quantity:
 *                 type: integer
 *                 description: The quantity of items in the listing.
 *               status:
 *                 type: string
 *                 description: The status of the listing.
 *               multiTransactionsEnabled:
 *                 type: boolean
 *                 description: Whether multiple transactions are enabled for the listing.
 *               accountId:
 *                 type: string
 *                 description: The account ID associated with the listing.
 *               entityId:
 *                 type: string
 *                 description: The entity ID associated with the listing.
 *               image:
 *                 type: string
 *                 format: binary
 *                 description: Optional image file for the listing (JPEG, PNG, WebP, or SVG). Will be resized to max width of 1050px.
 *               imageCaption:
 *                 type: string
 *                 description: Optional caption for the listing image.
 *             required:
 *               - price
 *               - quantity
 *               - status
 *               - accountId
 *               - entityId
 *     responses:
 *       '200':
 *         description: Successfully created a new listing.
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 id:
 *                   type: string
 *                   description: The ID of the newly created listing.
 *                 price:
 *                   type: number
 *                   description: The price for the listing.
 *                 quantity:
 *                   type: integer
 *                   description: The quantity of items in the listing.
 *                 status:
 *                   type: string
 *                   description: The status of the listing.
 *                 multiTransactionsEnabled:
 *                   type: boolean
 *                   description: Whether multiple transactions are enabled for the listing.
 *                 profileId:
 *                   type: string
 *                   description: The profile ID associated with the listing.
 *                 entityId:
 *                   type: string
 *                   description: The entity ID associated with the listing.
 *                 listingShippingCategories:
 *                   type: array
 *                   description: List of shipping categories associated with the listing.
 *                   items:
 *                     type: object
 *                     properties:
 *                       shippingCategoryId:
 *                         type: string
 *                         description: ID of the shipping category.
 *       '400':
 *         description: Bad request, typically due to invalid request data or if the user already has a listing for the entity.
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
listingRouter.post(`/listing`, uploadConfig.single('file'), async (req, res) => {
  const {
    price,
    quantity,
    status,
    multiTransactionsEnabled,
    accountId,
    entityId,
    imageCaption,
  } = req.body

  try {
    await validateAccount(req.user as AuthenticatedUser, accountId, 'seller')
    await validateSeller(accountId)

    const parsedPrice = parseFloat(price)
    const parsedQuantity = parseInt(quantity)
    const parsedMultiTransactionsEnabled = multiTransactionsEnabled === 'true'

    if (isNaN(parsedPrice) || isNaN(parsedQuantity)) {
      throw new Error('Invalid price or quantity values')
    }

    const userListing = await prisma.listing.findFirst({
      where: {
        AND: [
          { accountId: accountId },
          { entityId: entityId },
          { status: 'ACTIVE' }
        ],
      },
    })

    if (userListing) {
      throw new Error('User already has a listing for this entity')
    } else if (parsedPrice <= 0) {
      throw new Error('A listing cannot have a zero or negative price')
    } else {
      const bids = await resolveBids({
        price: parsedPrice,
        entityId,
        accountId,
      })

      if (bids.length) {
        throw new Error('A higher bid already exists for this entity. To proceed, please increase your price or accept an existing bid.')
      }

      let imageKey = null
      if (req.file) {
        const resizeOptions = {
          width: 1050,
          quality: 75,
          format: 'webp' as const,
          fit: 'inside' as const
        }
        imageKey = await uploadImage(req.file, 'listing', resizeOptions)
      }

      const listing = await prisma.listing.create({
        data: {
          price: parsedPrice,
          quantity: parsedQuantity,
          status,
          multiTransactionsEnabled: parsedMultiTransactionsEnabled,
          image: imageKey,
          imageCaption,
          account: { connect: { id: accountId } },
          entity: { connect: { id: entityId } },
        },
        include: {
          account: true
        }
      })

      res.json(listing)
    }
  } catch (error) {
    const { statusCode, prismaError, customError } = generatePrismaError(error as Prisma.PrismaClientKnownRequestError)
    console.error('CREATE_LISTING_ERROR:', prismaError || customError)
    res.status(statusCode).send({ errorMessage: customError || 'Failed to create listing.' })
  }
})

/**
 * @openapi
 * /listing/{id}:
 *   put:
 *     tags:
 *       - Listing
 *     summary: Update an existing listing.
 *     description: Updates an existing listing in the database for a specific marketplace and brand. The request body can include fields like `price`, `quantity`, `status`, `accountId`, `entityId`, and optionally `image`, `imageCaption`, and `multiTransactionsEnabled`.
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *         description: The ID of the listing to be updated.
 *     requestBody:
 *       required: true
 *       content:
 *         multipart/form-data:
 *           schema:
 *             type: object
 *             properties:
 *               price:
 *                 type: number
 *                 description: The price for the listing.
 *               quantity:
 *                 type: integer
 *                 description: The quantity of items in the listing.
 *               status:
 *                 type: string
 *                 description: The status of the listing.
 *               multiTransactionsEnabled:
 *                 type: boolean
 *                 description: Whether multiple transactions are enabled for the listing.
 *               accountId:
 *                 type: string
 *                 description: The account ID associated with the listing.
 *               entityId:
 *                 type: string
 *                 description: The entity ID associated with the listing.
 *               image:
 *                 type: string
 *                 format: binary
 *                 description: Optional image file for the listing (JPEG, PNG, WebP, or SVG). Will be resized to max width of 1050px. If provided, will replace the existing image.
 *               imageCaption:
 *                 type: string
 *                 description: Optional caption for the listing image.
 *             required:
 *               - price
 *               - quantity
 *               - status
 *     responses:
 *       '200':
 *         description: Successfully updated the listing.
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 id:
 *                   type: string
 *                   description: The ID of the updated listing.
 *                 price:
 *                   type: number
 *                   description: The updated price for the listing.
 *                 quantity:
 *                   type: integer
 *                   description: The updated quantity of items in the listing.
 *                 status:
 *                   type: string
 *                   description: The updated status of the listing.
 *                 multiTransactionsEnabled:
 *                   type: boolean
 *                   description: Whether multiple transactions are enabled for the listing.
 *                 profileId:
 *                   type: string
 *                   description: The profile ID associated with the listing.
 *                 entityId:
 *                   type: string
 *                   description: The entity ID associated with the listing.
 *                 listingShippingCategories:
 *                   type: array
 *                   description: The updated list of shipping categories associated with the listing.
 *                   items:
 *                     type: object
 *                     properties:
 *                       id:
 *                         type: string
 *                         description: The ID of the shipping category association.
 *                       shippingCategoryId:
 *                         type: string
 *                         description: The ID of the shipping category.
 *       '400':
 *         description: Bad request, typically due to invalid request data or if the listing cannot be updated.
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
listingRouter.put(`/listing/:id`, uploadConfig.single('file'), async (req, res) => {
  const { id } = req.params
  const {
    price,
    accountId,
    entityId,
  } = req.body

  try {
    await validateAccount(req.user as AuthenticatedUser, accountId, 'seller')
    await validateSeller(accountId)
    await validateExistingListing(id)

    const parsedPrice = parseFloat(price)
    if (isNaN(parsedPrice)) {
      throw new Error('Invalid price value')
    }

    const bids = await resolveBids({
      price: parsedPrice,
      entityId,
      accountId,
    })

    if (bids.length) {
      throw new Error('A higher bid already exists for this entity. To proceed, please increase your price or accept an existing bid.')
    }

    let imageKey = null
    let shouldDeleteOldImage = false
    let oldImageKey = null

    const currentListing = await prisma.listing.findUnique({
      where: { id },
      select: { image: true }
    })

    oldImageKey = currentListing?.image

    if (req.file) {
      const resizeOptions = {
        width: 1050,
        quality: 75,
        format: 'webp' as const,
        fit: 'inside' as const
      }
      imageKey = await uploadImage(req.file, 'listing', resizeOptions)

      if (oldImageKey) {
        shouldDeleteOldImage = true
      }
    }

    const updateData = { ...req.body }
    if (imageKey) {
      updateData.image = imageKey
    }

    const shouldRemoveImage = (req.body.removeImage === 'true' || req.body.removeImage === true) && !imageKey

    if (shouldRemoveImage) {
      updateData.image = null
      if (oldImageKey) {
        shouldDeleteOldImage = true
      }
    }

    if (updateData.price) {
      updateData.price = parsedPrice
    }
    if (updateData.quantity) {
      updateData.quantity = parseInt(updateData.quantity)
      if (isNaN(updateData.quantity)) {
        throw new Error('Invalid quantity value')
      }
    }
    if (updateData.multiTransactionsEnabled !== undefined) {
      updateData.multiTransactionsEnabled = updateData.multiTransactionsEnabled === 'true'
    }
    if (updateData.isPrimary !== undefined) {
      updateData.isPrimary = updateData.isPrimary === 'true'
    }
    if (updateData.isOffer !== undefined) {
      updateData.isOffer = updateData.isOffer === 'true'
    }

    const listing = await prisma.listing.update({
      where: { id },
      data: updateData,
      include: {
        account: true
      }
    })

    if (shouldDeleteOldImage && oldImageKey) {
      try {
        const s3Key = oldImageKey.startsWith('/') ? oldImageKey.substring(1) : oldImageKey
        await deleteImage(s3Key)
      } catch (deleteError) {
        console.error('Failed to delete old image from S3:', deleteError)
      }
    }

    if (listing) {
      res.json(listing)
    } else {
      throw new Error('Cannot update listing by id')
    }
  } catch (error) {
    const { statusCode, prismaError, customError } = generatePrismaError(error as Prisma.PrismaClientKnownRequestError)
    console.error('UPDATE_LISTING_ERROR:', prismaError || customError)
    res.status(statusCode).send({ errorMessage: customError || 'Failed to update listing.' })
  }
})

/**
 * @openapi
 * /listing/{id}:
 *   get:
 *     tags:
 *       - Listing
 *     summary: Retrieve a specific listing by ID.
 *     description: Fetches the details of a listing by its unique ID. You can optionally include related entities using the `include` query parameter.
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *         description: The unique ID of the listing to retrieve.
 *       - in: query
 *         name: include
 *         schema:
 *           type: string
 *         description: Comma-separated list of related entities to include in the listing data (e.g., 'entity,profile').
 *     responses:
 *       '200':
 *         description: Successfully retrieved the listing.
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Listing'
 *       '400':
 *         description: Bad request, typically due to invalid parameters or if the listing ID is not found.
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
listingRouter.get('/listing/:id', async (req, res) => {
  const { id } = req.params
  const { include } = req.query

  try {
    if (!id) {
      throw new Error('Listing ID is required')
    }
    const listing = await prisma.listing.findUnique({
      where: { id },
      include: generateIncludes(include)
    })

    if (listing) {
      res.json(listing)
    } else {
      throw new Error('No listing ID found')
    }
  } catch (error) {
    const { statusCode, prismaError, customError } = generatePrismaError(error as Prisma.PrismaClientKnownRequestError)
    console.error('GET_LISTING_ERROR:', prismaError, customError)
    res.status(statusCode).send({ errorMessage: customError || 'Failed to retrieve listing.' })
  }
})

/**
 * @openapi
 * /listing/{id}:
 *   delete:
 *     tags:
 *       - Listing
 *     summary: Delete a specific listing by ID.
 *     description: Deletes a listing by its unique ID from the specified marketplace and brand.
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *         description: The unique ID of the listing to delete.
 *     responses:
 *       '200':
 *         description: Successfully deleted the listing.
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Listing'
 *       '400':
 *         description: Bad request, typically due to invalid parameters or if the listing ID is not found.
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
listingRouter.delete(`/listing/:accountId/:id`, async (req, res) => {
  const { id, accountId } = req.params

  try {
    if (!id) {
      throw new Error('Listing ID is required')
    }
    await validateAccount(req.user as AuthenticatedUser, accountId, 'seller')
    const listing = await prisma.listing.delete({
      where: { id },
    })

    if (listing) {
      res.json(listing)
    } else {
      throw new Error('No listing ID found')
    }
  } catch (error) {
    const { statusCode, prismaError, customError } = generatePrismaError(error as Prisma.PrismaClientKnownRequestError)
    console.error('DELETE_LISTING_ERROR:', prismaError, customError)
    res.status(statusCode).send({ errorMessage: customError || 'Failed to delete listing.' })
  }
})
