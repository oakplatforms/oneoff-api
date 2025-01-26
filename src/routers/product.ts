import { Prisma } from '@prisma/client'
import express from 'express'
import { generateIncludes } from '../utils/generateIncludes'
import { getPrismaClient, generatePrismaError } from '../utils/prismaHelpers'

const prisma = getPrismaClient()
export const productRouter = express.Router()

/**
 * @openapi
 * /{marketplaceName}/{brandName}/products:
 *   get:
 *     tags:
 *       - Product
 *     summary: Retrieve a list of products for a specific brand and category.
 *     description: Fetches a list of products that belong to a specified brand and category within a marketplace. Optional query parameters allow for filtering and including related data.
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
 *       - name: include
 *         in: query
 *         description: Optional comma-separated list of related entities to include in the response (e.g., "reviews,vendor").
 *         schema:
 *           type: string
 *       - name: category
 *         in: query
 *         description: Optional category name to filter products by.
 *         schema:
 *           type: string
 *       - name: productTag
 *         in: query
 *         description: Optional key-value pairs to filter products by tag name and value in the format "tagName:tagValue". Multiple pairs can be specified.
 *         schema:
 *           oneOf:
 *             - type: string
 *             - type: array
 *               items:
 *                 type: string
 *       - name: search
 *         in: query
 *         description: Optional string to search for products by matching against the name or display name.
 *         schema:
 *           type: string
 *     responses:
 *       '200':
 *         description: Successfully retrieved a list of products matching the specified filters.
 *         content:
 *           application/json:
 *             schema:
 *               type: array
 *               items:
 *                 $ref: '#/components/schemas/Product'
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
 *       '404':
 *         description: Not Found. The specified brand or category does not exist.
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
productRouter.get('/:marketplaceName/:brandName/products', async (req, res) => {
  const { brandName } = req.params
  const { include, category, productTag, search } = req.query

  try {
    const brandCategory = await prisma.brandCategory.findFirstOrThrow({
      where: {
        brandName: brandName,
        categoryName: category as string || ''
      }
    })

    const productTagFilters = Array.isArray(productTag)
      ? productTag.filter(tag => typeof tag === 'string')
      : typeof productTag === 'string'
      ? [productTag]
      : []

    const parsedFilters = productTagFilters.map(tagFilter => {
      const [tagName, tagValue] = (tagFilter as string)?.split?.(':')
      return { tag: { name: tagName }, tagValue }
    })

    const whereClause: Prisma.ProductWhereInput = {
      brandCategoryId: brandCategory.id,
      AND: [
        ...(parsedFilters.length > 0
          ? [
              {
                productTags: {
                  some: {
                    OR: parsedFilters
                  }
                }
              }
            ]
          : []),
        ...(search
          ? [
              {
                OR: [
                  { displayName: { contains: search as string, mode: 'insensitive' as Prisma.QueryMode } },
                  { name: { contains: search as string, mode: 'insensitive' as Prisma.QueryMode } }
                ]
              }
            ]
          : [])
      ]
    }

    const products = await prisma.product.findMany({
      where: whereClause,
      include: generateIncludes(include)
    })

    res.json(products)
  } catch (error) {
    const { statusCode, errorMessage } = generatePrismaError(error as Prisma.PrismaClientKnownRequestError)
    res.status(statusCode).send({ errorMessage })
  }
})

/**
 * @openapi
 * /{marketplaceName}/{brandName}/product:
 *   post:
 *     tags:
 *       - Product
 *     summary: Create a new product.
 *     description: Adds a new product to a specified brand and marketplace. The request body must include details of the product, and optional data can be provided for related entities such as cards and product tags.
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
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               name:
 *                 type: string
 *                 description: Name of the product.
 *               type:
 *                 type: string
 *                 description: Type of the product.
 *               displayName:
 *                 type: string
 *                 description: Display name of the product.
 *               description:
 *                 type: string
 *                 description: Description of the product.
 *               card:
 *                 type: object
 *                 properties:
 *                   number:
 *                     type: string
 *                     description: Card number associated with the product.
 *                   shippingCategory:
 *                     type: string
 *                     description: Shipping category for the card.
 *               brandCategoryId:
 *                 type: string
 *                 description: ID of the brand category associated with the product.
 *               image:
 *                 type: string
 *                 description: URL or path to the image of the product.
 *               price:
 *                 type: number
 *                 format: float
 *                 description: Price of the product.
 *               releaseDate:
 *                 type: string
 *                 format: date-time
 *                 description: Release date of the product.
 *               productTags:
 *                 type: object
 *                 description: Tags to associate with the product.
 *                 properties:
 *                   create:
 *                     type: array
 *                     description: List of tags to create and associate with the product.
 *                     items:
 *                       type: object
 *                       properties:
 *                         tagId:
 *                           type: string
 *                           description: ID of the tag to associate.
 *                         tagValue:
 *                           type: string
 *                           description: Value of the tag to associate.
 *                   delete:
 *                     type: array
 *                     description: List of product tag IDs to remove from the product.
 *                     items:
 *                       type: string
 *             required:
 *               - name
 *               - brandCategoryId
 *               - price
 *     responses:
 *       '200':
 *         description: Successfully created a new product.
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 productTags:
 *                   type: object
 *                   properties:
 *                     create:
 *                       type: array
 *                       description: List of tags that were created and associated with the product.
 *                       items:
 *                         type: object
 *                         properties:
 *                           tagId:
 *                             type: string
 *                             description: ID of the tag.
 *                           tagValue:
 *                             type: string
 *                             description: Value of the tag.
 *                     delete:
 *                       type: array
 *                       description: List of product tag IDs that were removed from the product.
 *                       items:
 *                         type: string
 *       '400':
 *         description: Bad request, typically due to invalid request data or unsupported tag values.
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 errorMessage:
 *                   type: string
 *                   description: Description of the error that occurred.
 *       '404':
 *         description: Tag value not supported for the specified tag.
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
productRouter.post(`/:marketplaceName/:brandName/product`, async (req, res) => {
  const {
    name,
    type,
    displayName,
    description,
    card,
    brandCategoryId,
    image,
    price,
    releaseDate,
    productTags
  } = req.body

  if (productTags?.create?.length) {
     productTags.create.forEach(async (productTag: { tagId: string; tagValue: string }) => {
      const selectedTag = await prisma.tag.findUnique({
        where: {
          id: productTag.tagId,
        },
        include: {
          supportedTagValues: true
        }
      })

      if (selectedTag?.supportedTagValues?.length) {
        const supportedTagValue = selectedTag?.supportedTagValues?.find(supportedTagValue => supportedTagValue.displayName === productTag.tagValue)
        
        if (!supportedTagValue) {
          res.status(404).send({ errorMessage: `Tag value ${productTag.tagValue} is not supported for ${selectedTag?.displayName || selectedTag?.name} tag` })
        }
      }
    })
  }

  try {
    const result = await prisma.product.create({
      data: {
        name,
        type,
        displayName,
        description,
        price,
        image,
        releaseDate,
        card: {
          create: {
            ...card,
            brandCategory: { connect: { id: brandCategoryId }
          }},
        },
        productTags: productTags?.create?.length
          ? {
              create: productTags.create.map((productTag: { tagId: string; tagValue: string }) => ({
                tag: { connect: { id: productTag.tagId } },
                tagValue: productTag.tagValue,
              })),
            }
          : undefined,
        brandCategory: { connect: { id: brandCategoryId } }
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
 * /{marketplaceName}/{brandName}/product/{id}:
 *   put:
 *     tags:
 *       - Product
 *     summary: Update an existing product.
 *     description: Updates the details of an existing product in a specified brand and marketplace. Allows updating related entities like cards and managing product tags.
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
 *         description: The ID of the product to update.
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
 *                 description: Name of the product.
 *               type:
 *                 type: string
 *                 description: Type of the product.
 *               displayName:
 *                 type: string
 *                 description: Display name of the product.
 *               description:
 *                 type: string
 *                 description: Description of the product.
 *               card:
 *                 type: object
 *                 properties:
 *                   number:
 *                     type: string
 *                     description: Card number associated with the product.
 *                   shippingCategory:
 *                     type: string
 *                     description: Shipping category for the card.
 *               brandCategoryId:
 *                 type: string
 *                 description: ID of the brand category associated with the product.
 *               image:
 *                 type: string
 *                 description: URL or path to the image of the product.
 *               price:
 *                 type: number
 *                 format: float
 *                 description: Price of the product.
 *               releaseDate:
 *                 type: string
 *                 format: date-time
 *                 description: Release date of the product.
 *               productTags:
 *                 type: object
 *                 description: Tags to associate with the product.
 *                 properties:
 *                   create:
 *                     type: array
 *                     description: List of tags to create and associate with the product.
 *                     items:
 *                       type: object
 *                       properties:
 *                         tagId:
 *                           type: string
 *                           description: ID of the tag to associate.
 *                         tagValue:
 *                           type: string
 *                           description: Value of the tag to associate.
 *                   delete:
 *                     type: array
 *                     description: List of product tag IDs to remove from the product.
 *                     items:
 *                       type: string
 *     responses:
 *       '200':
 *         description: Successfully updated the product.
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 id:
 *                   type: string
 *                   description: The ID of the updated product.
 *                 name:
 *                   type: string
 *                   description: Name of the updated product.
 *                 productTags:
 *                   type: object
 *                   properties:
 *                     create:
 *                       type: array
 *                       description: List of tags that were created and associated with the product.
 *                       items:
 *                         type: object
 *                         properties:
 *                           tagId:
 *                             type: string
 *                             description: ID of the tag.
 *                           tagValue:
 *                             type: string
 *                             description: Value of the tag.
 *                     delete:
 *                       type: array
 *                       description: List of product tag IDs that were removed from the product.
 *                       items:
 *                         type: string
 *       '400':
 *         description: Bad request, typically due to invalid request data or unsupported tag values.
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 errorMessage:
 *                   type: string
 *                   description: Description of the error that occurred.
 *       '404':
 *         description: Tag value not supported for the specified tag.
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
productRouter.put(`/:marketplaceName/:brandName/product/:id`, async (req, res) => {
  const { id } = req.params
  const { productTags } = req.body

  if (productTags?.create?.length) {
    productTags.create.forEach(async (productTag: { tagId: string; tagValue: string }) => {
     const selectedTag = await prisma.tag.findUnique({
       where: {
         id: productTag.tagId,
       },
       include: {
         supportedTagValues: true
       }
     })

     if (selectedTag?.supportedTagValues?.length) {
       const supportedTagValue = selectedTag?.supportedTagValues?.find(supportedTagValue => supportedTagValue.displayName === productTag.tagValue)
       
       if (!supportedTagValue) {
         res.status(404).send({ errorMessage: `Tag value ${productTag.tagValue} is not supported for ${selectedTag?.displayName || selectedTag?.name} tag` })
       }
     }
   })
 }

  try {
    const product = await prisma.product.update({
      where: { id },
      data: {
        ...req.body,
        card: req.body.card ? {
          update: {
            ...req.body.card,
            brandCategoryId: req.body.brandCategoryId
          }
        } : undefined,
        productTags: productTags
          ? {
              create: productTags.create?.map((productTag: { tagId: string; tagValue: string }) => ({
                tagId: productTag.tagId,
                tagValue: productTag.tagValue,
              })),
              deleteMany: productTags.delete?.map((productTagId: string) => ({
                id: productTagId,
              })),
            }
          : undefined,
        brandCategoryId: req.body.brandCategoryId,
      }
    })
    res.json(product || { errorMessage: 'Something went wrong: Cannot update product by id' })
  } catch (error) {
    const { statusCode, errorMessage } = generatePrismaError(error as Prisma.PrismaClientKnownRequestError)
    res.status(statusCode).send({ errorMessage })
  }
})

/**
 * @openapi
 * /{marketplaceName}/{brandName}/product/{id}:
 *   get:
 *     tags:
 *       - Product
 *     summary: Retrieve a specific product by its ID.
 *     description: Fetches details of a product identified by its ID from the specified brand and marketplace. If the product does not exist, an appropriate message will be returned.
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
 *         description: The ID of the product to retrieve.
 *         required: true
 *         schema:
 *           type: string
 *       - name: include
 *         in: query
 *         description: Optional query parameter to include related entities or additional data.
 *         required: false
 *         schema:
 *           type: string
 *     responses:
 *       '200':
 *         description: Successfully retrieved the product details.
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Product'
 *       '404':
 *         description: Product not found. The specified ID does not match any existing product.
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
productRouter.get('/:marketplaceName/:brandName/product/:id', async (req, res) => {
  const { id } = req.params
  const { include } = req.query

  try {
    const product = await prisma.product.findUnique({
      where: {
        id
      },
      include: generateIncludes(include)
    })
  
    res.json(product || { errorMessage: 'Something went wrong: No Product ID found' })
  } catch (error) {
    const { statusCode, errorMessage } = generatePrismaError(error as Prisma.PrismaClientKnownRequestError)
    res.status(statusCode).send({ errorMessage })
  }
})

/**
 * @openapi
 * /{marketplaceName}/{brandName}/product/{id}:
 *   delete:
 *     tags:
 *       - Product
 *     summary: Delete a specific product.
 *     description: Deletes a product specified by its ID from the given brand and marketplace. This action also deletes all associated ProductTag records and any related Cards. If the product does not exist or an error occurs, an appropriate message will be returned.
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
 *         description: The ID of the product to delete.
 *         required: true
 *         schema:
 *           type: string
 *     responses:
 *       '200':
 *         description: Successfully deleted the product along with its associated ProductTags and related data.
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Product'
 *       '404':
 *         description: Product not found. The specified ID does not match any existing product.
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
productRouter.delete(`/:marketplaceName/:brandName/product/:id`, async (req, res) => {
  const { id } = req.params

  try {
    await prisma.productTag.deleteMany({
      where: {
        productId: id,
      },
    })
    await prisma.card.deleteMany({
      where: {
        productId: id,
      },
    })
    const product = await prisma.product.delete({
      where: {
        id: id,
      },
    })
    res.json(product || { errorMessage: 'Something went wrong: No Product ID found' })
  } catch (error) {
    console.error('error', error)
    const { statusCode, errorMessage } = generatePrismaError(error as Prisma.PrismaClientKnownRequestError)
    res.status(statusCode).send({ errorMessage })
  }
})
