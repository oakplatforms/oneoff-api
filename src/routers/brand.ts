import { Prisma } from '@prisma/client'
import express from 'express'
import { generateIncludes } from '../utils/generateIncludes'
import { getPrismaClient, generatePrismaError } from '../utils/prismaHelpers'
import { paginatePrisma } from '../utils/paginatePrisma'
import { validateAdmin, AuthenticatedUser } from '../validation/user'

const prisma = getPrismaClient()
export const brandRouter = express.Router()

/**
 * @openapi
 * /brands:
 *   get:
 *     summary: Retrieve a list of brands
 *     tags:
 *       - Brand
 *     responses:
 *       '200':
 *         description: A list of brands
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Brand'
 */
brandRouter.get('/brands', async (req, res) => {
  const { include, usePagination, page, limit } = req.query

  try {
    const parsedLimit = parseInt(limit as string) || 10
    const parsedPage = parseInt(page as string) || 0
    const result = await paginatePrisma({
      prismaModel: prisma.brand,
      where: {},
      include: generateIncludes(include),
      page: parsedPage,
      limit: parsedLimit,
      usePagination: usePagination === 'false' ? false : true,
    })

    res.json(result)
  } catch (error) {
    const { statusCode, prismaError } = generatePrismaError(error as Prisma.PrismaClientKnownRequestError)
    console.error('GET_BRANDS_ERROR:', prismaError)
    res.status(statusCode).send({ errorMessage: 'Failed to retrieve brands.' })
  }
})

/**
 * @openapi
 * /brand:
 *   post:
 *     summary: Create a brand
 *     tags:
 *       - Brand
 *     responses:
 *       '200':
 *         description: created brand response
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Brand'
 */
brandRouter.post(`/brand`, async (req, res) => {
  const { name, displayName, createdById } = req.body

  try {
    await validateAdmin(req.user as AuthenticatedUser, createdById, 'admin')
    const brand = await prisma.brand.create({
      data: {
        name,
        displayName,
        createdBy: { connect: { id: createdById } },
      },
    })
    res.json(brand)
  } catch (error) {
    const { statusCode, prismaError } = generatePrismaError(error as Prisma.PrismaClientKnownRequestError)
    console.error('CREATE_BRAND_ERROR:', prismaError)
    res.status(statusCode).send({ errorMessage: 'Failed to create brand.' })
  }
})

/**
 * @openapi
 * /brand/{id}:
 *   put:
 *     tags:
 *       - Brand
 *     summary: Update a brand by ID
 *     description: Updates a brand within a given marketplace. You can update basic brand fields and modify associated categories.
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *         description: The ID of the brand to update.
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - lastModifiedById
 *             properties:
 *               name:
 *                 type: string
 *                 description: The name of the brand.
 *               slug:
 *                 type: string
 *               description:
 *                 type: string
 *               logoUrl:
 *                 type: string
 *               lastModifiedById:
 *                 type: string
 *                 description: User ID of the last person to modify the brand.
 *     responses:
 *       '200':
 *         description: Successfully updated the brand.
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Brand'
 *       '400':
 *         description: Bad request due to invalid data.
 *       '500':
 *         description: Internal Server Error. An error occurred during brand update.
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 errorMessage:
 *                   type: string
 *                   description: Description of the error that occurred.
 */
brandRouter.put('/brand/:id', async (req, res) => {
  const { id } = req.params
  const { lastModifiedById, ...rest } = req.body

  try {
    await validateAdmin(req.user as AuthenticatedUser, lastModifiedById, 'admin')
    const brand = await prisma.brand.update({
      where: { id },
      data: {
        ...rest,
        lastModifiedBy: { connect: { id: lastModifiedById } },
      },
    })

    res.json(brand)
  } catch (error) {
    const { statusCode, prismaError } = generatePrismaError(error as Prisma.PrismaClientKnownRequestError)
    console.error('UPDATE_BRAND_ERROR:', prismaError)
    res.status(statusCode).send({ errorMessage: 'Failed to update brand.' })
  }
})

/**
 * @openapi
 * /brand/{id}:
 *   get:
 *     tags:
 *       - Brand
 *     summary: Get a brand by ID
 *     description: Retrieves a brand by its ID and associated marketplace. You can optionally include related entities using the `include` query parameter.
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *         description: The ID of the brand to retrieve.
 *       - in: query
 *         name: include
 *         required: false
 *         schema:
 *           type: string
 *         description: Comma-separated list of related entities to include (e.g., 'brandCategories,marketplace').
 *     responses:
 *       '200':
 *         description: Successfully retrieved the brand.
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Brand'
 *       '404':
 *         description: Brand not found.
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 errorMessage:
 *                   type: string
 *       '500':
 *         description: Internal Server Error.
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 errorMessage:
 *                   type: string
 */
brandRouter.get('/brand/:id', async (req, res) => {
  const { id } = req.params
  const { include } = req.query

  try {
    const brand = await prisma.brand.findUnique({
      where: {
        id,
      },
      include: generateIncludes(include)
    })

    if (brand) {
      res.json(brand)
    } else {
      throw new Error('No brand ID found')
    }
  } catch (error) {
    const { statusCode, prismaError } = generatePrismaError(error as Prisma.PrismaClientKnownRequestError)
    console.error('GET_BRAND_ERROR:', prismaError)
    res.status(statusCode).send({ errorMessage: 'Failed to retrieve brand.' })
  }
})

/**
 * @openapi
 * /brand/{id}:
 *   delete:
 *     tags:
 *       - Brand
 *     summary: Delete a brand by ID
 *     description: Deletes a brand by its ID for a given marketplace. Returns the deleted brand object on success.
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *         description: The ID of the brand to delete.
 *     responses:
 *       '200':
 *         description: Successfully deleted the brand.
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Brand'
 *       '404':
 *         description: Brand not found.
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 errorMessage:
 *                   type: string
 *       '500':
 *         description: Internal Server Error.
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 errorMessage:
 *                   type: string
 */
brandRouter.delete(`/brand/:id`, async (req, res) => {
  const { id } = req.params

  try {
    const brand = await prisma.brand.delete({
      where: {
        id: id,
      },
    })
    if (brand) {
      res.json(brand)
    } else {
      throw new Error('No brand ID found')
    }
  } catch (error) {
    const { statusCode, prismaError } = generatePrismaError(error as Prisma.PrismaClientKnownRequestError)
    console.error('DELETE_BRAND_ERROR:', prismaError)
    res.status(statusCode).send({ errorMessage: 'Failed to delete brand.' })
  }
})
