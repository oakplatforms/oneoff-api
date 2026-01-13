import { Prisma } from '@prisma/client'
import express from 'express'
import { generateIncludes } from '../utils/generateIncludes'
import { getPrismaClient, generatePrismaError } from '../utils/prismaHelpers'
import { paginatePrisma } from '../utils/paginatePrisma'
import { AuthenticatedUser, validateRole } from '../validation/user'

const prisma = getPrismaClient()
export const brandTagRouter = express.Router()

/**
 * @openapi
 * /brand-tags:
 *   get:
 *     tags:
 *       - Brand Tag
 *     summary: Retrieve brand tags
 *     description: Retrieve a list of brand tags filtered by brandId, tagId, or both.
 *     parameters:
 *       - name: brandId
 *         in: query
 *         description: Optional. Filter by brandId.
 *         schema:
 *           type: string
 *       - name: tagId
 *         in: query
 *         description: Optional. Filter by tagId.
 *         schema:
 *           type: string
 *       - name: include
 *         in: query
 *         description: Optional. Include related models (e.g., brand, tag, supportedTagValues).
 *         schema:
 *           type: string
 *     responses:
 *       '200':
 *         description: A list of matching brand tags.
 *         content:
 *           application/json:
 *             schema:
 *               type: array
 *               items:
 *                 $ref: '#/components/schemas/BrandTag'
 *       '400':
 *         description: Bad request, invalid parameters.
 *       '500':
 *         description: Internal server error.
 */
brandTagRouter.get('/brand-tags', async (req, res) => {
  const { include, brandId, tagId, usePagination, page, limit } = req.query

  try {
    const parsedLimit = parseInt(limit as string) || 10
    const parsedPage = parseInt(page as string) || 0

    const where = {
      ...(brandId ? { brandId: brandId as string } : {}),
      ...(tagId ? { tagId: tagId as string } : {}),
    }

    const result = await paginatePrisma({
      prismaModel: prisma.brandTag,
      where,
      include: generateIncludes(include as string),
      page: parsedPage,
      limit: parsedLimit,
      usePagination: usePagination === 'false' ? false : true,
    })

    res.json(result)
  } catch (error) {
    const { statusCode, prismaError, customError } = generatePrismaError(error as Prisma.PrismaClientKnownRequestError)
    console.error('GET_BRAND_TAGS_ERROR:', prismaError || customError)
    res.status(statusCode).send({ errorMessage: customError || 'Failed to retrieve brand tags.' })
  }
})

/**
 * @openapi
 * /brand-tag/{id}:
 *   get:
 *     tags:
 *       - Brand Tag
 *     summary: Retrieve a brand tag by ID
 *     description: Fetches a single brand tag by its unique ID.
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *         description: The ID of the brand tag to retrieve.
 *       - in: query
 *         name: include
 *         schema:
 *           type: string
 *         description: Comma-separated list of related models to include.
 *     responses:
 *       '200':
 *         description: Successfully retrieved the brand tag.
 *       '404':
 *         description: Brand tag not found.
 *       '500':
 *         description: Internal server error.
 */
brandTagRouter.get('/brand-tag/:id', async (req, res) => {
  const { id } = req.params
  const { include } = req.query

  try {
    if (!id) {
      throw new Error('Brand tag ID is required')
    }
    const brandTag = await prisma.brandTag.findUnique({
      where: { id },
      include: generateIncludes(include as string)
    })
    if (brandTag) {
      res.json(brandTag)
    } else {
      throw new Error('No brand tag ID found')
    }
  } catch (error) {
    const { statusCode, prismaError, customError } = generatePrismaError(error as Prisma.PrismaClientKnownRequestError)
    console.error('GET_BRAND_TAG_ERROR:', prismaError || customError)
    res.status(statusCode).send({ errorMessage: customError || 'Failed to retrieve brand tag.' })
  }
})

/**
 * @openapi
 * /brand-tag:
 *   post:
 *     tags:
 *       - Brand Tag
 *     summary: Create a brand tag
 *     description: Creates a new brand tag connecting a brand to a tag. Admin only.
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               brandId:
 *                 type: string
 *               tagId:
 *                 type: string
 *     responses:
 *       '200':
 *         description: Successfully created brand tag.
 *       '400':
 *         description: Bad request.
 *       '500':
 *         description: Internal server error.
 */
brandTagRouter.post('/brand-tag', async (req, res) => {
  const { brandId, tagId } = req.body

  try {
    validateRole(req.user as AuthenticatedUser, 'admin')

    if (!brandId || !tagId) {
      throw new Error('brandId and tagId are required')
    }

    const brandTag = await prisma.brandTag.create({
      data: { brandId, tagId },
      include: {
        brand: true,
        tag: true,
      },
    })

    res.json(brandTag)
  } catch (error) {
    const { statusCode, prismaError, customError } = generatePrismaError(error as Prisma.PrismaClientKnownRequestError)
    console.error('CREATE_BRAND_TAG_ERROR:', prismaError || customError)
    res.status(statusCode).send({ errorMessage: customError || 'Failed to create brand tag.' })
  }
})

/**
 * @openapi
 * /brand-tag/{id}:
 *   put:
 *     tags:
 *       - Brand Tag
 *     summary: Update a brand tag
 *     description: Updates an existing brand tag. Admin only.
 *     parameters:
 *       - in: path
 *         name: id
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
 *               brandId:
 *                 type: string
 *               tagId:
 *                 type: string
 *     responses:
 *       '200':
 *         description: Successfully updated brand tag.
 *       '404':
 *         description: Brand tag not found.
 *       '500':
 *         description: Internal server error.
 */
brandTagRouter.put('/brand-tag/:id', async (req, res) => {
  const { id } = req.params
  const { brandId, tagId } = req.body

  try {
    validateRole(req.user as AuthenticatedUser, 'admin')

    if (!id) {
      throw new Error('Brand tag ID is required')
    }

    const data: any = {}
    if (brandId) data.brandId = brandId
    if (tagId) data.tagId = tagId

    const brandTag = await prisma.brandTag.update({
      where: { id },
      data,
      include: {
        brand: true,
        tag: true,
      },
    })

    res.json(brandTag)
  } catch (error) {
    const { statusCode, prismaError, customError } = generatePrismaError(error as Prisma.PrismaClientKnownRequestError)
    console.error('UPDATE_BRAND_TAG_ERROR:', prismaError || customError)
    res.status(statusCode).send({ errorMessage: customError || 'Failed to update brand tag.' })
  }
})

/**
 * @openapi
 * /brand-tag/{id}:
 *   delete:
 *     tags:
 *       - Brand Tag
 *     summary: Delete a brand tag
 *     description: Deletes a brand tag by ID. Admin only.
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *     responses:
 *       '200':
 *         description: Successfully deleted brand tag.
 *       '404':
 *         description: Brand tag not found.
 *       '500':
 *         description: Internal server error.
 */
brandTagRouter.delete('/brand-tag/:id', async (req, res) => {
  const { id } = req.params

  try {
    validateRole(req.user as AuthenticatedUser, 'admin')

    if (!id) {
      throw new Error('Brand tag ID is required')
    }

    await prisma.brandTag.delete({
      where: { id },
    })

    res.json({ success: 'Brand tag deleted successfully' })
  } catch (error) {
    const { statusCode, prismaError, customError } = generatePrismaError(error as Prisma.PrismaClientKnownRequestError)
    console.error('DELETE_BRAND_TAG_ERROR:', prismaError || customError)
    res.status(statusCode).send({ errorMessage: customError || 'Failed to delete brand tag.' })
  }
})

