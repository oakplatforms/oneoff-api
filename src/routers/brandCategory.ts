
import { PrismaClient, Prisma } from '@prisma/client'
import express from 'express'
import { generateIncludes } from '../utils/generateIncludes'
import { generatePrismaError } from '../utils/generatePrismaError'

const prisma = new PrismaClient()
export const brandCategoryRouter = express.Router()

/**
 * @openapi
 * /{marketplaceName}/{brandName}/brand-category:
 *   post:
 *     summary: Create a brand-category association
 *     tags: 
 *       - Brand Category
 *     description: Associates a brand with a category in the specified marketplace.
 *     parameters:
 *       - name: marketplaceName
 *         in: path
 *         description: The name of the marketplace.
 *         required: true
 *         schema:
 *           type: string
 *       - name: brandName
 *         in: path
 *         description: The name of the brand.
 *         required: true
 *         schema:
 *           type: string
 *     requestBody:
 *       description: The category name to associate with the brand.
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               categoryName:
 *                 type: string
 *                 description: The name of the category to associate with the brand.
 *             required:
 *               - categoryName
 *     responses:
 *       '200':
 *         description: Successfully created brand-category association.
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/BrandCategory'
 *       '400':
 *         description: Bad request, often due to missing or invalid parameters.
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 errorMessage:
 *                   type: string
 *                   description: Description of the error that occurred.
 *       '500':
 *         description: Internal server error, typically due to database issues or unexpected errors.
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 errorMessage:
 *                   type: string
 *                   description: Description of the error that occurred.
 */
brandCategoryRouter.post('/:marketplaceName/:brandName/brand-category', async (req, res) => {
  const { brandName } = req.params
  const { categoryName } = req.body

  try {
    const result = await prisma.brandCategory.create({
      data: {
        brand: { connect: { name: brandName } },
        category: { connect: { name: categoryName } }
      },
    })
    res.json(result)
  } catch (error) {
    const { statusCode, errorMessage } = generatePrismaError(error as Prisma.PrismaClientKnownRequestError)
    res.status(statusCode).send({ errorMessage })
  }
})

/**
 * @openapi
 * /{marketplaceName}/{brandName}/brand-category/{id}:
 *   get:
 *     tags:
 *       - Brand Category
 *     summary: Retrieve a specific brand-category association
 *     description: Fetches details of a specific brand-category association by its ID and brand name, with optional inclusion of related data.
 *     parameters:
 *       - name: marketplaceName
 *         in: path
 *         description: The name of the marketplace.
 *         required: true
 *         schema:
 *           type: string
 *       - name: brandName
 *         in: path
 *         description: The name of the brand.
 *         required: true
 *         schema:
 *           type: string
 *       - name: id
 *         in: path
 *         description: The ID of the brand-category association to retrieve.
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
 *         description: Successfully retrieved the brand-category association.
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/BrandCategory'
 *       '404':
 *         description: Brand-category association not found.
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 errorMessage:
 *                   type: string
 *                   description: Description of the error that occurred.
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

brandCategoryRouter.get('/:marketplaceName/:brandName/brand-category/:id', async (req, res) => {
  const { brandName, id } = req.params
  const { include } = req.query

  try {
    const brandCategory = await prisma.brandCategory.findUnique({
      where: {
        id,
        brandName: brandName
      },
      include: generateIncludes(include)
    })
  
    res.json(brandCategory || { errorMessage: 'Something went wrong: No Brand Category ID found' })
  } catch (error) {
    const { statusCode, errorMessage } = generatePrismaError(error as Prisma.PrismaClientKnownRequestError)
    res.status(statusCode).send({ errorMessage })
  }
})

/**
 * @openapi
 * /{marketplaceName}/{brandName}/brand-category/{id}:
 *   delete:
 *     tags:
 *       - Brand Category
 *     summary: Delete a specific brand-category association
 *     description: Deletes a brand-category association by its ID and brand name.
 *     parameters:
 *       - name: marketplaceName
 *         in: path
 *         description: The name of the marketplace.
 *         required: true
 *         schema:
 *           type: string
 *       - name: brandName
 *         in: path
 *         description: The name of the brand.
 *         required: true
 *         schema:
 *           type: string
 *       - name: id
 *         in: path
 *         description: The ID of the brand-category association to delete.
 *         required: true
 *         schema:
 *           type: string
 *     responses:
 *       '200':
 *         description: Successfully deleted the brand-category association.
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/BrandCategory'
 *       '404':
 *         description: Brand-category association not found.
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 errorMessage:
 *                   type: string
 *                   description: Description of the error that occurred.
 *       '400':
 *         description: Bad request, often due to invalid parameters.
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 errorMessage:
 *                   type: string
 *                   description: Description of the error that occurred.
 *       '500':
 *         description: Internal server error, typically due to database issues or unexpected errors.
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 errorMessage:
 *                   type: string
 *                   description: Description of the error that occurred.
 */
brandCategoryRouter.delete('/:marketplaceName/:brandName/brand-category/:id', async (req, res) => {
  const { brandName, id } = req.params
  
  try {
    const brandCategory = await prisma.brandCategory.delete({
      where: {
        id: id,
        brandName: { contains: brandName },
      },
    })
    res.json(brandCategory || { errorMessage: 'Something went wrong: No Brand Category ID found' })
  } catch (error) {
    const { statusCode, errorMessage } = generatePrismaError(error as Prisma.PrismaClientKnownRequestError)
    res.status(statusCode).send({ errorMessage })
  }
})
