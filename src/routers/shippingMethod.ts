import { Prisma, ShippingCarrierType, ShippingParcelType } from '@prisma/client'
import express from 'express'
import { generateIncludes } from '../utils/generateIncludes'
import { getPrismaClient, generatePrismaError } from '../utils/prismaHelpers'
import { paginatePrisma } from '../utils/paginatePrisma'
import { AuthenticatedUser, validateAdmin, validateRole } from '../validation/user'

const prisma = getPrismaClient()
export const shippingMethodRouter = express.Router()

/**
 * @openapi
 * /shipping-methods:
 *   get:
 *     tags:
 *       - Shipping Category
 *     summary: Retrieve a list of shipping categories for a given marketplace.
 *     description: Fetches a list of shipping categories that belong to the specified marketplace.
 *     parameters:
 *       - name: include
 *         in: query
 *         description: Optional query parameter to include related data.
 *         schema:
 *           type: string
 *     responses:
 *       '200':
 *         description: Successfully retrieved the list of shipping categories.
 *         content:
 *           application/json:
 *             schema:
 *               type: array
 *               items:
 *                 $ref: '#/components/schemas/shippingMethod'
 *       '400':
 *         description: Bad request, typically due to invalid parameters.
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 errorMessage:
 *                   type: string
 *                   description: Description of the error that occurred.
 *       '500':
 *         description: Internal server error, often due to database issues or unexpected errors.
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 errorMessage:
 *                   type: string
 *                   description: Description of the error that occurred.
 */
shippingMethodRouter.get('/shipping-methods', async (req, res) => {
  const { include, usePagination, page, limit } = req.query

  try {
    const parsedLimit = parseInt(limit as string) || 10
    const parsedPage = parseInt(page as string) || 0

    const result = await paginatePrisma({
      prismaModel: prisma.shippingMethod,
      where: {},
      include: generateIncludes(include as string),
      page: parsedPage,
      limit: parsedLimit,
      usePagination: usePagination === 'false' ? false : true,
    })

    res.json(result)
  } catch (error) {
    const { statusCode, prismaError, customError } = generatePrismaError(error as Prisma.PrismaClientKnownRequestError)
    console.error('GET_SHIPPING_METHODS_ERROR:', prismaError || customError)
    res.status(statusCode).send({ errorMessage: customError || 'Failed to retrieve shipping methods.' })
  }
})

/**
 * @openapi
 * /shipping-method:
 *   post:
 *     tags:
 *       - Shipping Category
 *     summary: Create a new shipping category for a given marketplace.
 *     description: Creates a new shipping category in the specified marketplace with the provided details.
 *     parameters:
 *       - name: marketplaceName
 *         in: path
 *         description: The name of the marketplace where the new shipping category will be created.
 *         required: true
 *         schema:
 *           type: string
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               name:
 *                 type: string
 *                 description: The name of the shipping category.
 *               displayName:
 *                 type: string
 *                 description: The display name of the shipping category.
 *               description:
 *                 type: string
 *                 description: The updated description of the shipping category.
 *             required:
 *               - name
 *     responses:
 *       '201':
 *         description: Successfully created a new shipping category.
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/shippingMethod'
 *       '400':
 *         description: Bad request, typically due to invalid parameters or missing required fields.
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 errorMessage:
 *                   type: string
 *                   description: Description of the error that occurred.
 *       '500':
 *         description: Internal server error, often due to database issues or unexpected errors.
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 errorMessage:
 *                   type: string
 *                   description: Description of the error that occurred.
 */
shippingMethodRouter.post('/shipping-method', async (req, res) => {
  const {
    name,
    displayName,
    description,
    shippingOptions,
    createdById,
    parcels,
    isTracked,
    fixedRate,
    maxQuantity,
    warning,
  } = req.body

  try {
    await validateAdmin(req.user as AuthenticatedUser, createdById, 'admin')
    const shippingMethod = await prisma.shippingMethod.create({
      data: {
        name,
        displayName,
        description,
        isTracked,
        fixedRate,
        maxQuantity,
        warning,
        createdBy: { connect: { id: createdById } },
        parcels: parcels?.create?.length
          ? {
            create: parcels.create.map((parcel: { carrier: ShippingCarrierType; type: ShippingParcelType }) => ({
              carrier: parcel.carrier,
              type: parcel.type,
            })),
          }
          : undefined,
        shippingOptions: shippingOptions?.create?.length
          ? {
            create: shippingOptions.create?.map((shippingOption: Prisma.ShippingOptionCreateInput) => ({
              ...shippingOption
            })),
          }
          : undefined,
      },
    })
    res.json(shippingMethod)
  } catch (error) {
    const { statusCode, prismaError, customError } = generatePrismaError(error as Prisma.PrismaClientKnownRequestError)
    console.error('CREATE_SHIPPING_METHOD_ERROR:', prismaError || customError)
    res.status(statusCode).send({ errorMessage: customError || 'Failed to create shipping method.' })
  }
})

/**
 * @openapi
 * /shipping-method/{id}:
 *   put:
 *     tags:
 *       - Shipping Category
 *     summary: Update an existing shipping category in the specified marketplace.
 *     description: Updates the details of a shipping category by its ID within the specified marketplace.
 *     parameters:
 *       - name: marketplaceName
 *         in: path
 *         description: The name of the marketplace where the shipping category exists.
 *         required: true
 *         schema:
 *           type: string
 *       - name: id
 *         in: path
 *         description: The unique identifier of the shipping category to update.
 *         required: true
 *         schema:
 *           type: string
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             description: The fields to update in the shipping category.
 *             properties:
 *               name:
 *                 type: string
 *                 description: The updated name of the shipping category.
 *               displayName:
 *                 type: string
 *                 description: The updated display name of the shipping category.
 *               description:
 *                 type: string
 *                 description: The updated description of the shipping category.
 *     responses:
 *       '200':
 *         description: Successfully updated the shipping category.
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/shippingMethod'
 *       '400':
 *         description: Bad request, typically due to invalid parameters or missing fields.
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 errorMessage:
 *                   type: string
 *                   description: Description of the error that occurred.
 *       '404':
 *         description: Shipping category not found.
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 errorMessage:
 *                   type: string
 *                   description: Error message indicating the shipping category could not be found.
 *       '500':
 *         description: Internal server error, often due to database issues or unexpected errors.
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 errorMessage:
 *                   type: string
 *                   description: Description of the error that occurred.
 */
shippingMethodRouter.put(`/shipping-method/:id`, async (req, res) => {
  const { id } = req.params
  const { shippingOptions, parcels, lastModifiedById, isTracked, fixedRate, maxQuantity, warning } = req.body

  try {
    await validateAdmin(req.user as AuthenticatedUser, lastModifiedById, 'admin')
    const shippingMethod = await prisma.shippingMethod.update({
      where: { id },
      data: {
        ...(req.body.name !== undefined && { name: req.body.name }),
        ...(req.body.displayName !== undefined && { displayName: req.body.displayName }),
        ...(req.body.description !== undefined && { description: req.body.description }),
        ...(isTracked !== undefined && { isTracked }),
        ...(fixedRate !== undefined && { fixedRate }),
        ...(maxQuantity !== undefined && { maxQuantity }),
        ...(warning !== undefined && { warning }),
        parcels: parcels
          ? {
            create: parcels.create?.map((parcel: { carrier: ShippingCarrierType; type: ShippingParcelType }) => ({
              carrier: parcel.carrier,
              type: parcel.type,
            })),
            updateMany: parcels.update?.map((parcel: { id: string; carrier: ShippingCarrierType; type: ShippingParcelType }) => ({
              where: { id: parcel.id },
              data: {
                carrier: parcel.carrier,
                type: parcel.type,
              },
            })),
            deleteMany: parcels.delete?.map((id: string) => ({ id })),
          }
          : undefined,
        shippingOptions: shippingOptions
          ? {
            create: shippingOptions.create?.map((shippingOption: Prisma.ShippingOptionCreateInput) => ({
              ...shippingOption
            })),
            updateMany: shippingOptions.update?.map(
              (shippingOption: Prisma.ShippingOptionUpdateInput) => ({
                where: { id: shippingOption.id },
                data: shippingOption,
              })
            ),
            deleteMany: shippingOptions.delete?.map((shippingOptionId: string) => ({
              id: shippingOptionId
            })),
          }
          : undefined,
      }
    })
    if (shippingMethod) {
      res.json(shippingMethod)
    } else {
      throw new Error('Cannot update shipping category by id')
    }
  } catch (error) {
    const { statusCode, prismaError, customError } = generatePrismaError(error as Prisma.PrismaClientKnownRequestError)
    console.error('UPDATE_SHIPPING_METHOD_ERROR:', prismaError || customError)
    res.status(statusCode).send({ errorMessage: customError || 'Failed to update shipping method.' })
  }
})

/**
 * @openapi
 * /shipping-method/{id}:
 *   get:
 *     tags:
 *       - Shipping Category
 *     summary: Retrieve details of a specific shipping category by its ID.
 *     description: Fetches the details of a single shipping category in the specified marketplace using its unique ID.
 *     parameters:
 *       - name: id
 *         in: path
 *         description: The unique identifier of the shipping category.
 *         required: true
 *         schema:
 *           type: string
 *       - name: include
 *         in: query
 *         description: Optional query parameter to include related data.
 *         schema:
 *           type: string
 *     responses:
 *       '200':
 *         description: Successfully retrieved the shipping category.
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/shippingMethod'
 *       '400':
 *         description: Bad request, typically due to invalid parameters or query syntax.
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 errorMessage:
 *                   type: string
 *                   description: Description of the error that occurred.
 *       '404':
 *         description: Shipping category not found.
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 errorMessage:
 *                   type: string
 *                   description: Error message indicating the shipping category could not be found.
 *       '500':
 *         description: Internal server error, often due to database issues or unexpected errors.
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 errorMessage:
 *                   type: string
 *                   description: Description of the error that occurred.
 */
shippingMethodRouter.get('/shipping-method/:id', async (req, res) => {
  const { id } = req.params
  const { include } = req.query

  try {
    if (!id) {
      throw new Error('Shipping method ID is required')
    }
    const shippingMethod = await prisma.shippingMethod.findUnique({
      where: {
        id,
      },
      include: generateIncludes(include as string)
    })
    if (shippingMethod) {
      res.json(shippingMethod)
    } else {
      throw new Error('Cannot update shipping category by id')
    }
  } catch (error) {
    const { statusCode, prismaError, customError } = generatePrismaError(error as Prisma.PrismaClientKnownRequestError)
    console.error('RETRIEVE_SHIPPING_METHOD_ERROR:', prismaError || customError)
    res.status(statusCode).send({ errorMessage: customError || 'Failed to retrieve shipping method.' })
  }
})

/**
 * @openapi
 * /shipping-method/{id}:
 *   delete:
 *     tags:
 *       - Shipping Category
 *     summary: Delete a specific shipping category by its ID.
 *     description: Deletes a shipping category in the specified marketplace using its unique ID.
 *     parameters:
 *       - name: marketplaceName
 *         in: path
 *         description: The name of the marketplace where the shipping category exists.
 *         required: true
 *         schema:
 *           type: string
 *       - name: id
 *         in: path
 *         description: The unique identifier of the shipping category to delete.
 *         required: true
 *         schema:
 *           type: string
 *     responses:
 *       '200':
 *         description: Successfully deleted the shipping category.
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/shippingMethod'
 *       '400':
 *         description: Bad request, typically due to invalid parameters or query syntax.
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 errorMessage:
 *                   type: string
 *                   description: Description of the error that occurred.
 *       '404':
 *         description: Shipping category not found.
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 errorMessage:
 *                   type: string
 *                   description: Error message indicating the shipping category could not be found.
 *       '500':
 *         description: Internal server error, often due to database issues or unexpected errors.
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 errorMessage:
 *                   type: string
 *                   description: Description of the error that occurred.
 */
shippingMethodRouter.delete(`/shipping-method/:id`, async (req, res) => {
  const { id } = req.params

  try {
    if (!id) {
      throw new Error('Shipping method ID is required')
    }
    validateRole(req.user as AuthenticatedUser, 'admin')

    const shippingMethod = await prisma.shippingMethod.delete({
      where: {
        id: id,
      },
    })
    if (shippingMethod) {
      res.json(shippingMethod)
    } else {
      throw new Error('No shipping category ID found')
    }
  } catch (error) {
    const { statusCode, prismaError } = generatePrismaError(error as Prisma.PrismaClientKnownRequestError)
    console.error('DELETE_SHIPPING_METHOD_ERROR:', prismaError)
    res.status(statusCode).send({ errorMessage: 'Failed to delete shipping method.' })
  }
})
