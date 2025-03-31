import { Prisma } from '@prisma/client'
import express from 'express'
import { generateIncludes } from '../utils/generateIncludes'
import { getPrismaClient, generatePrismaError } from '../utils/prismaHelpers'

const prisma = getPrismaClient()
export const brandRouter = express.Router()

/**
 * @openapi
 * /{marketplaceName}/brands:
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
brandRouter.get('/:marketplaceName/brands', async (req, res) => {
  const { marketplaceName } = req.params
  const { include } = req.query

  try {
    const brands = await prisma.brand.findMany({
      where: {
        marketplaceName: { contains: marketplaceName as string }
      },
      include: generateIncludes(include)
    })
    res.json(brands)
  } catch (error) {
    const { statusCode, errorMessage } = generatePrismaError(error as Prisma.PrismaClientKnownRequestError)
    res.status(statusCode).send({ errorMessage })
  }
})

/**
 * @openapi
 * /{marketplaceName}/brand:
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
brandRouter.post(`/:marketplaceName/brand`, async (req, res) => {
  const { marketplaceName } = req.params
  const { name, displayName, createdById, brandCategories } = req.body

  try {
    const brand = await prisma.brand.create({
      data: {
        name,
        displayName,
        brandCategories: brandCategories?.create?.length
          ? {
            create: brandCategories.create.map(({ categoryName }: { categoryName: string }) => ({
              categoryName
            })),
          }
          : undefined,
        createdBy: { connect: { id: createdById } },
        marketplace: { connect: { name: marketplaceName } }
      },
    })
    res.json(brand)
  } catch (error) {
    const { statusCode, errorMessage } = generatePrismaError(error as Prisma.PrismaClientKnownRequestError)
    res.status(statusCode).send({ errorMessage })
  }
})

/**
 * @openapi
 * /{marketplaceName}/brand/{id}:
 *   put:
 *     tags:
 *       - Brand
 *     summary: Update a brand by ID
 *     description: Updates a brand within a given marketplace. You can update basic brand fields and modify associated categories.
 *     parameters:
 *       - in: path
 *         name: marketplaceName
 *         required: true
 *         schema:
 *           type: string
 *         description: The name of the marketplace to which the brand belongs.
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
 *               brandCategories:
 *                 type: object
 *                 properties:
 *                   create:
 *                     type: array
 *                     items:
 *                       type: object
 *                       properties:
 *                         categoryName:
 *                           type: string
 *                   delete:
 *                     type: array
 *                     items:
 *                       type: string
 *                     description: List of category IDs to delete.
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
brandRouter.put('/:marketplaceName/brand/:id', async (req, res) => {
  const { marketplaceName, id } = req.params
  const { brandCategories, lastModifiedById, ...rest } = req.body

  try {
    const brand = await prisma.brand.update({
      where: { id },
      data: {
        ...rest,
        lastModifiedBy: { connect: { id: lastModifiedById } },
        brandCategories: brandCategories
          ? {
            create: brandCategories.create?.map(({ categoryName }: { categoryName: string }) => ({
              categoryName,
            })),
            deleteMany: brandCategories.delete?.map((categoryId: string) => ({
              id: categoryId,
            })),
          }
          : undefined,
        marketplace: { connect: { name: marketplaceName } },
      },
    })

    res.json(brand)
  } catch (error) {
    const { statusCode, errorMessage } = generatePrismaError(
      error as Prisma.PrismaClientKnownRequestError
    )
    res.status(statusCode).send({ errorMessage })
  }
})

/**
 * @openapi
 * /{marketplaceName}/brand/{id}:
 *   get:
 *     tags:
 *       - Brand
 *     summary: Get a brand by ID
 *     description: Retrieves a brand by its ID and associated marketplace. You can optionally include related entities using the `include` query parameter.
 *     parameters:
 *       - in: path
 *         name: marketplaceName
 *         required: true
 *         schema:
 *           type: string
 *         description: The name of the marketplace the brand belongs to.
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
brandRouter.get('/:marketplaceName/brand/:id', async (req, res) => {
  const { marketplaceName, id } = req.params
  const { include } = req.query

  try {
    const brand = await prisma.brand.findUnique({
      where: {
        id,
        marketplaceName: marketplaceName
      },
      include: generateIncludes(include)
    })

    if (brand) {
      res.json(brand)
    } else {
      throw new Error('No brand ID found')
    }
  } catch (error) {
    const { statusCode, errorMessage } = generatePrismaError(error as Prisma.PrismaClientKnownRequestError)
    res.status(statusCode).send({ errorMessage })
  }
})

/**
 * @openapi
 * /{marketplaceName}/brand/{id}:
 *   delete:
 *     tags:
 *       - Brand
 *     summary: Delete a brand by ID
 *     description: Deletes a brand by its ID for a given marketplace. Returns the deleted brand object on success.
 *     parameters:
 *       - in: path
 *         name: marketplaceName
 *         required: true
 *         schema:
 *           type: string
 *         description: The name of the marketplace the brand belongs to.
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
brandRouter.delete(`/:marketplaceName/brand/:id`, async (req, res) => {
  const { marketplaceName, id } = req.params

  try {
    const brand = await prisma.brand.delete({
      where: {
        id: id,
        marketplaceName: { contains: marketplaceName as string }
      },
    })
    if (brand) {
      res.json(brand)
    } else {
      throw new Error('No brand ID found')
    }
  } catch (error) {
    const { statusCode, errorMessage } = generatePrismaError(error as Prisma.PrismaClientKnownRequestError)
    res.status(statusCode).send({ errorMessage })
  }
})
