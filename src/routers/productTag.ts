
import { Prisma } from '@prisma/client'
import express from 'express'
import { generateIncludes } from '../utils/generateIncludes'
import { getPrismaClient, generatePrismaError } from '../utils/prismaHelpers'

const prisma = getPrismaClient()
export const productTagRouter = express.Router()

/**
 * @openapi
 * /{marketplaceName}/product-tag:
 *   post:
 *     tags:
 *       - Product Tag
 *     summary: Create a new product-tag association.
 *     description: Creates a new association between a product and a tag. The product is identified by its ID and the tag by its name. If successful, returns the created product-tag association.
 *     parameters:
 *       - name: marketplaceName
 *         in: path
 *         description: The name of the marketplace.
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
 *               productId:
 *                 type: string
 *                 description: The ID of the product to associate with the tag.
 *               tagName:
 *                 type: string
 *                 description: The name of the tag to associate with the product.
 *               tagValue:
 *                 type: string
 *                 description: The value of the tag.
 *             required:
 *               - productId
 *               - tagName
 *               - tagValue
 *     responses:
 *       '200':
 *         description: Successfully created the product-tag association.
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/ProductTag'
 *       '400':
 *         description: Bad request, typically due to invalid input parameters.
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
productTagRouter.post('/:marketplaceName/product-tag', async (req, res) => {
  const { productId, tagId, tagValue } = req.body

  try {
    const selectedTag = await prisma.tag.findUnique({
      where: {
        id: tagId,
      },
      include: {
        supportedTagValues: true
      }
    })

    if (selectedTag?.supportedTagValues?.length) {
      const supportedTagValue = selectedTag?.supportedTagValues?.find(supportedTagValue => supportedTagValue.displayName === tagValue)

      if (supportedTagValue) {
        const productTag = await prisma.productTag.create({
          data: {
            tagValue,
            tag: { connect: { id: tagId } },
            product: { connect: { id: productId } }
          },
        })
        res.json(productTag)
      } else {
        res.status(404).send({ errorMessage: `Tag value ${tagValue} is not supported for ${selectedTag?.displayName || selectedTag?.name} tag` })
      }
    } else {
      const productTag = await prisma.productTag.create({
        data: {
          tagValue,
          tag: { connect: { id: tagId } },
          product: { connect: { id: productId } }
        },
      })
      res.json(productTag)
    }

  } catch (error) {
    const { statusCode, errorMessage } = generatePrismaError(error as Prisma.PrismaClientKnownRequestError)
    res.status(statusCode).send({ errorMessage })
  }
})

/**
 * @openapi
 * /{marketplaceName}/product-tag:
 *   put:
 *     tags:
 *       - Product Tag
 *     summary: Update an existing product-tag association.
 *     description: Updates the association between a product and a tag. The product is identified by its ID, and the tag by its name. If successful, returns the updated product-tag association.
 *     parameters:
 *       - name: marketplaceName
 *         in: path
 *         description: The name of the marketplace.
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
 *               productId:
 *                 type: string
 *                 description: The ID of the product whose tag association needs to be updated.
 *               tagName:
 *                 type: string
 *                 description: The name of the tag associated with the product.
 *               tagValue:
 *                 type: string
 *                 description: The new value of the tag.
 *             required:
 *               - productId
 *               - tagName
 *               - tagValue
 *     responses:
 *       '200':
 *         description: Successfully updated the product-tag association.
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/ProductTag'
 *       '400':
 *         description: Bad request, typically due to invalid input parameters.
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
productTagRouter.put('/:marketplaceName/product-tag', async (req, res) => {
  const { productId, tagId, tagValue } = req.body

  try {
    const selectedTag = await prisma.tag.findUnique({
      where: {
        id: tagId,
      },
      include: {
        supportedTagValues: true
      }
    })

    if (selectedTag?.supportedTagValues?.length) {
      const supportedTagValue = selectedTag?.supportedTagValues?.find(supportedTagValue => supportedTagValue.displayName === tagValue)

      if (supportedTagValue) {
        const productTag = await prisma.productTag.updateMany({
          where: {
            productId,
            tagId
          },
          data: {
            tagValue
          }
        })
        if (productTag.count === 0) {
          return res.status(404).send({ errorMessage: 'Product tag association not found' })
        }
        res.json(productTag)
      } else {
        res.status(404).send({ errorMessage: `Tag value ${tagValue} is not supported for ${selectedTag?.displayName || selectedTag?.name} tag` })
      }
    } else {
      const productTag = await prisma.productTag.updateMany({
        where: {
          productId,
          tagId
        },
        data: {
          tagValue
        }
      })
  
      if (productTag.count === 0) {
        return res.status(404).send({ errorMessage: 'Product tag association not found' })
      }
  
      res.json(productTag)
    }
  } catch (error) {
    const { statusCode, errorMessage } = generatePrismaError(error as Prisma.PrismaClientKnownRequestError)
    res.status(statusCode).send({ errorMessage })
  }
})

/**
 * @openapi
 * /{marketplaceName}/product-tag/{id}:
 *   get:
 *     tags:
 *       - Product Tag
 *     summary: Retrieve a specific product-tag association.
 *     description: Fetches details of a specific product-tag association by its ID from the given marketplace. Includes optional related data based on the query parameter.
 *     parameters:
 *       - name: marketplaceName
 *         in: path
 *         description: The name of the marketplace.
 *         required: true
 *         schema:
 *           type: string
 *       - name: id
 *         in: path
 *         description: The ID of the product-tag association to retrieve.
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
 *         description: Successfully retrieved the product-tag association.
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/ProductTag'
 *       '404':
 *         description: Product-tag association not found. The specified ID does not match any existing product-tag association.
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
productTagRouter.get('/:marketplaceName/product-tag/:id', async (req, res) => {
  const { id } = req.params
  const { include } = req.query

  try {
    const productTag = await prisma.productTag.findUnique({
      where: {
        id
      },
      include: generateIncludes(include)
    })
  
    res.json(productTag || { errorMessage: 'Something went wrong: No Product Tag ID found' })
  } catch (error) {
    const { statusCode, errorMessage } = generatePrismaError(error as Prisma.PrismaClientKnownRequestError)
    res.status(statusCode).send({ errorMessage })
  }
})

/**
 * @openapi
 * /{marketplaceName}/product-tag/{id}:
 *   delete:
 *     tags:
 *       - Product Tag
 *     summary: Delete a specific product-tag association.
 *     description: Deletes a product-tag association by its ID from the given marketplace.
 *     parameters:
 *       - name: marketplaceName
 *         in: path
 *         description: The name of the marketplace.
 *         required: true
 *         schema:
 *           type: string
 *       - name: id
 *         in: path
 *         description: The ID of the product-tag association to delete.
 *         required: true
 *         schema:
 *           type: string
 *     responses:
 *       '200':
 *         description: Successfully deleted the product-tag association.
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/ProductTag'
 *       '400':
 *         description: Bad Request. Something went wrong with the deletion process, such as a missing ID.
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 errorMessage:
 *                   type: string
 *                   description: Description of the error that occurred.
 *       '404':
 *         description: Product-tag association not found. The specified ID does not match any existing product-tag association.
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
productTagRouter.delete('/:marketplaceName/product-tag/:id', async (req, res) => {
  const { id } = req.params

  try {
    const productTag = await prisma.productTag.delete({
      where: {
        id: id
      },
    })
    res.json(productTag || { errorMessage: 'Something went wrong: No Product Tag ID found' })
  } catch (error) {
    const { statusCode, errorMessage } = generatePrismaError(error as Prisma.PrismaClientKnownRequestError)
    res.status(statusCode).send({ errorMessage })
  }
})
