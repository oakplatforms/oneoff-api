
import { PrismaClient, Prisma } from '@prisma/client'
import express from 'express'
import { generateIncludes } from '../utils/generateIncludes'
import { generatePrismaError } from '../utils/generatePrismaError'

const prisma = new PrismaClient()
export const collectionRouter = express.Router()

/**
 * @openapi
 * /{marketplaceName}/{brandName}/collection:
 *   post:
 *     tags:
 *       - Collection
 *     summary: Create a new collection within a brand's marketplace.
 *     description: Creates a new collection with specified details, including associated products and brand category.
 *     parameters:
 *       - name: marketplaceName
 *         in: path
 *         description: The name of the marketplace where the collection is to be created.
 *         required: true
 *         schema:
 *           type: string
 *       - name: brandName
 *         in: path
 *         description: The name of the brand for which the collection is being created.
 *         required: true
 *         schema:
 *           type: string
 *     requestBody:
 *       description: Details of the collection to be created.
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               name:
 *                 type: string
 *                 description: The name of the collection.
 *               type:
 *                 type: string
 *                 description: The type of the collection.
 *               displayName:
 *                 type: string
 *                 description: The display name for the collection.
 *               description:
 *                 type: string
 *                 description: A description of the collection.
 *               products:
 *                 type: array
 *                 items:
 *                   type: object
 *                   properties:
 *                     name:
 *                       type: string
 *                       description: The name of the product.
 *                     type:
 *                       type: string
 *                       description: The type of the product.
 *                     displayName:
 *                       type: string
 *                       description: The display name of the product.
 *                     description:
 *                       type: string
 *                       description: A description of the product.
 *                     price:
 *                       type: number
 *                       format: float
 *                       description: The price of the product.
 *                     image:
 *                       type: string
 *                       description: URL of the product image.
 *                     releaseDate:
 *                       type: string
 *                       format: date
 *                       description: The release date of the product.
 *               brandCategoryId:
 *                 type: string
 *                 description: The ID of the brand category associated with the collection.
 *     responses:
 *       '200':
 *         description: Successfully created the collection.
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Collection'
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
collectionRouter.post(`/:marketplaceName/:brandName/collection`, async (req, res) => {
  const { name, type, displayName, description, products, brandCategoryId } = req.body

  try {
    const productData = products?.map((product: Prisma.ProductCreateInput) => {
      return {
        ...product,
        brandCategory: { connect: { id: brandCategoryId }
      }}
    })
    
    const result = await prisma.collection.create({
      data: {
        name,
        displayName,
        description,
        type,
        products: {
          create: productData,
        },
        brandCategory: { connect: { id: brandCategoryId } },
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
 * /{marketplaceName}/{brandName}/collection/{id}:
 *   get:
 *     tags:
 *       - Collection
 *     summary: Retrieve a specific collection by its ID.
 *     description: Fetches details of a specific collection by its ID, with optional inclusion of related data.
 *     parameters:
 *       - name: marketplaceName
 *         in: path
 *         description: The name of the marketplace where the collection is located.
 *         required: true
 *         schema:
 *           type: string
 *       - name: brandName
 *         in: path
 *         description: The name of the brand to which the collection belongs.
 *         required: true
 *         schema:
 *           type: string
 *       - name: id
 *         in: path
 *         description: The ID of the collection to retrieve.
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
 *         description: Successfully retrieved the collection.
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Collection'
 *       '404':
 *         description: Collection not found.
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
collectionRouter.get('/:marketplaceName/:brandName/collection/:id', async (req, res) => {
  const { id } = req.params
  const { include } = req.query

  try {
    const collection = await prisma.collection.findUnique({
      where: { id },
      include: generateIncludes(include)
    })
  
    res.json(collection || { errorMessage: 'Something went wrong: No Collection ID found' })
  } catch (error) {
    console.log('error')
    const { statusCode, errorMessage } = generatePrismaError(error as Prisma.PrismaClientKnownRequestError)
    res.status(statusCode).send({ errorMessage })
  }
})

/**
 * @openapi
 * /{marketplaceName}/{brandName}/collection/{id}:
 *   delete:
 *     tags:
 *       - Collection
 *     summary: Delete a specific collection by its ID.
 *     description: Deletes a specific collection by its ID from the given marketplace and brand. Returns the deleted collection or an error message if the ID is not found.
 *     parameters:
 *       - name: marketplaceName
 *         in: path
 *         description: The name of the marketplace where the collection is located.
 *         required: true
 *         schema:
 *           type: string
 *       - name: brandName
 *         in: path
 *         description: The name of the brand to which the collection belongs.
 *         required: true
 *         schema:
 *           type: string
 *       - name: id
 *         in: path
 *         description: The ID of the collection to delete.
 *         required: true
 *         schema:
 *           type: string
 *     responses:
 *       '200':
 *         description: Successfully deleted the collection.
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Collection'
 *       '404':
 *         description: Collection not found.
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
collectionRouter.delete(`/:marketplaceName/:brandName/collection/:id`, async (req, res) => {
  const { id } = req.params
  try {
    const collection = await prisma.collection.delete({
      where: {
        id: id
      },
    })
    res.json(collection || { errorMessage: 'Something went wrong: No Collection ID found' })
  } catch (error) {
    const { statusCode, errorMessage } = generatePrismaError(error as Prisma.PrismaClientKnownRequestError)
    res.status(statusCode).send({ errorMessage })
  }
})
