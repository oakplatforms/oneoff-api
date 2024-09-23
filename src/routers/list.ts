
import { PrismaClient, Prisma } from '@prisma/client'
import express from 'express'
import { generateIncludes } from '../utils/generateIncludes'
import { generatePrismaError } from '../utils/generatePrismaError'

const prisma = new PrismaClient()
export const listRouter = express.Router()

/**
 * @openapi
 * /{marketplaceName}/{brandName}/list:
 *   post:
 *     tags:
 *       - List
 *     summary: Create a new list within a brand's marketplace.
 *     description: Creates a new list with specified details, including associated products and brand category.
 *     parameters:
 *       - name: marketplaceName
 *         in: path
 *         description: The name of the marketplace where the list is to be created.
 *         required: true
 *         schema:
 *           type: string
 *       - name: brandName
 *         in: path
 *         description: The name of the brand for which the list is being created.
 *         required: true
 *         schema:
 *           type: string
 *     requestBody:
 *       description: Details of the list to be created.
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               name:
 *                 type: string
 *                 description: The name of the list.
 *               type:
 *                 type: string
 *                 description: The type of the list.
 *               displayName:
 *                 type: string
 *                 description: The display name for the list.
 *               description:
 *                 type: string
 *                 description: A description of the list.
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
 *                 description: The ID of the brand category associated with the list.
 *     responses:
 *       '200':
 *         description: Successfully created the list.
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/List'
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
listRouter.post(`/:marketplaceName/:brandName/list`, async (req, res) => {
  const { name, type, displayName, description, products, brandCategoryId } = req.body

  try {
    const productData = products?.map((product: Prisma.ProductCreateInput) => {
      return {
        ...product,
        brandCategory: { connect: { id: brandCategoryId }
      }}
    })
    
    const result = await prisma.list.create({
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
 * /{marketplaceName}/{brandName}/list/{id}:
 *   get:
 *     tags:
 *       - List
 *     summary: Retrieve a specific list by its ID.
 *     description: Fetches details of a specific list by its ID, with optional inclusion of related data.
 *     parameters:
 *       - name: marketplaceName
 *         in: path
 *         description: The name of the marketplace where the list is located.
 *         required: true
 *         schema:
 *           type: string
 *       - name: brandName
 *         in: path
 *         description: The name of the brand to which the list belongs.
 *         required: true
 *         schema:
 *           type: string
 *       - name: id
 *         in: path
 *         description: The ID of the list to retrieve.
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
 *         description: Successfully retrieved the list.
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/List'
 *       '404':
 *         description: list not found.
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
listRouter.get('/:marketplaceName/:brandName/list/:id', async (req, res) => {
  const { id } = req.params
  const { include } = req.query

  try {
    const list = await prisma.list.findUnique({
      where: { id },
      include: generateIncludes(include)
    })
  
    res.json(list || { errorMessage: 'Something went wrong: No list ID found' })
  } catch (error) {
    console.log('error')
    const { statusCode, errorMessage } = generatePrismaError(error as Prisma.PrismaClientKnownRequestError)
    res.status(statusCode).send({ errorMessage })
  }
})

/**
 * @openapi
 * /{marketplaceName}/{brandName}/list/{id}:
 *   delete:
 *     tags:
 *       - List
 *     summary: Delete a specific list by its ID.
 *     description: Deletes a specific list by its ID from the given marketplace and brand. Returns the deleted list or an error message if the ID is not found.
 *     parameters:
 *       - name: marketplaceName
 *         in: path
 *         description: The name of the marketplace where the list is located.
 *         required: true
 *         schema:
 *           type: string
 *       - name: brandName
 *         in: path
 *         description: The name of the brand to which the list belongs.
 *         required: true
 *         schema:
 *           type: string
 *       - name: id
 *         in: path
 *         description: The ID of the list to delete.
 *         required: true
 *         schema:
 *           type: string
 *     responses:
 *       '200':
 *         description: Successfully deleted the list.
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/List'
 *       '404':
 *         description: list not found.
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
listRouter.delete(`/:marketplaceName/:brandName/list/:id`, async (req, res) => {
  const { id } = req.params
  try {
    const list = await prisma.list.delete({
      where: {
        id: id
      },
    })
    res.json(list || { errorMessage: 'Something went wrong: No list ID found' })
  } catch (error) {
    const { statusCode, errorMessage } = generatePrismaError(error as Prisma.PrismaClientKnownRequestError)
    res.status(statusCode).send({ errorMessage })
  }
})
