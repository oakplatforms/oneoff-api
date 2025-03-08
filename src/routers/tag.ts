import { Prisma } from '@prisma/client'
import express from 'express'
import { generateIncludes } from '../utils/generateIncludes'
import { getPrismaClient, generatePrismaError } from '../utils/prismaHelpers'

const prisma = getPrismaClient()
export const tagRouter = express.Router()

/**
 * @openapi
 * /{marketplaceName}/tags:
 *   get:
 *     tags:
 *       - Tag
 *     summary: Retrieve a list of tags for a specific marketplace.
 *     description: Fetches a list of tags associated with the given marketplace name, with optional inclusion of related data.
 *     parameters:
 *       - name: marketplaceName
 *         in: path
 *         description: The name of the marketplace to retrieve tags for.
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
 *         description: Successfully retrieved the list of tags.
 *         content:
 *           application/json:
 *             schema:
 *               type: array
 *               items:
 *                 $ref: '#/components/schemas/Tag'
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
tagRouter.get('/:marketplaceName/tags', async (req, res) => {
  const { marketplaceName } = req.params
  const { include } = req.query

  try {
    const tags = await prisma.tag.findMany({
      where: {
        marketplaceName: { contains: marketplaceName as string }
      },
      include: generateIncludes(include)
    })

    res.json(tags)
  } catch (error) {
    const { statusCode, errorMessage } = generatePrismaError(error as Prisma.PrismaClientKnownRequestError)
    res.status(statusCode).send({ errorMessage })
  }
})

/**
 * @openapi
 * /{marketplaceName}/tag:
 *   post:
 *     tags:
 *       - Tag
 *     summary: Create a new tag for a specific marketplace.
 *     description: Creates a new tag associated with the given marketplace name. Optionally, supported tag values can be included in the request.
 *     parameters:
 *       - name: marketplaceName
 *         in: path
 *         description: The name of the marketplace where the tag will be created.
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
 *                 description: The name of the tag.
 *               displayName:
 *                 type: string
 *                 description: The display name of the tag.
 *               supportedTagValues:
 *                 type: array
 *                 items:
 *                   type: object
 *                   properties:
 *                     id:
 *                       type: string
 *                       description: The ID of the supported tag value.
 *                     createdAt:
 *                       type: string
 *                       format: date-time
 *                       description: The creation timestamp of the supported tag value.
 *                     updatedAt:
 *                       type: string
 *                       format: date-time
 *                       description: The last updated timestamp of the supported tag value.
 *                     name:
 *                       type: string
 *                       description: The name of the supported tag value.
 *                     displayName:
 *                       type: string
 *                       description: The display name of the supported tag value.
 *             required:
 *               - name
 *               - displayName
 *     responses:
 *       '201':
 *         description: Successfully created the new tag.
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Tag'
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
tagRouter.post(`/:marketplaceName/tag`, async (req, res) => {
  const { marketplaceName } = req.params
  const { name, displayName, supportedTagValues, createdById } = req.body

  try {
    const tag = await prisma.tag.create({
      data: {
        name,
        displayName,
        supportedTagValues: supportedTagValues
          ? {
            create: supportedTagValues.create?.map(
              ({ name, displayName }: { name: string; displayName: string }) => ({
                name,
                displayName,
              })
            ),
          }
          : undefined,
        marketplace: { connect: { name: marketplaceName } },
        createdBy: { connect: { id: createdById } },
      },
    })

    res.json(tag)
  } catch (error) {
    const { statusCode, errorMessage } = generatePrismaError(
      error as Prisma.PrismaClientKnownRequestError
    )
    res.status(statusCode).send({ errorMessage })
  }
})

/**
 * @openapi
 * /{marketplaceName}/tag/{id}:
 *   put:
 *     tags:
 *       - Tag
 *     summary: Update an existing tag for a specific marketplace.
 *     description: Updates an existing tag associated with the given marketplace. Optionally, supported tag values can also be updated.
 *     parameters:
 *       - name: marketplaceName
 *         in: path
 *         description: The name of the marketplace where the tag exists.
 *         required: true
 *         schema:
 *           type: string
 *       - name: id
 *         in: path
 *         description: The ID of the tag to be updated.
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
 *                 description: The updated name of the tag.
 *               displayName:
 *                 type: string
 *                 description: The updated display name of the tag.
 *               supportedTagValues:
 *                 type: array
 *                 items:
 *                   type: object
 *                   properties:
 *                     id:
 *                       type: string
 *                       description: The ID of the supported tag value.
 *                     createdAt:
 *                       type: string
 *                       format: date-time
 *                       description: The creation timestamp of the supported tag value.
 *                     updatedAt:
 *                       type: string
 *                       format: date-time
 *                       description: The last updated timestamp of the supported tag value.
 *                     name:
 *                       type: string
 *                       description: The updated name of the supported tag value.
 *                     displayName:
 *                       type: string
 *                       description: The updated display name of the supported tag value.
 *             required:
 *               - name
 *               - displayName
 *     responses:
 *       '200':
 *         description: Successfully updated the tag.
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Tag'
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
tagRouter.put('/:marketplaceName/tag/:id', async (req, res) => {
  const { marketplaceName, id } = req.params
  const { supportedTagValues, lastModifiedById, ...rest } = req.body

  try {
    const tag = await prisma.tag.update({
      where: { id },
      data: {
        ...rest,
        lastModifiedBy: { connect: { id: lastModifiedById } },
        supportedTagValues: supportedTagValues
          ? {
            create: supportedTagValues.create?.map(
              ({ name, displayName }: { name: string; displayName: string }) => ({
                name,
                displayName,
              })
            ),
            updateMany: supportedTagValues.update?.map(
              ({ id, name, displayName }: { id: string; name: string; displayName: string }) => ({
                where: { id },
                data: { name, displayName },
              })
            ),
            deleteMany: supportedTagValues.delete?.map(
              (tagValueId: string) => ({
                id: tagValueId,
              })
            ),
          }
          : undefined,
        marketplace: { connect: { name: marketplaceName } },
      },
    })

    res.json(tag)
  } catch (error) {
    const { statusCode, errorMessage } = generatePrismaError(
      error as Prisma.PrismaClientKnownRequestError
    )
    res.status(statusCode).send({ errorMessage })
  }
})

/**
 * @openapi
 * /{marketplaceName}/tag/{id}:
 *   get:
 *     tags:
 *       - Tag
 *     summary: Retrieve a specific tag by ID for a given marketplace.
 *     description: Fetches the details of a tag by its ID for the specified marketplace, with optional inclusion of related data.
 *     parameters:
 *       - name: marketplaceName
 *         in: path
 *         description: The name of the marketplace where the tag is located.
 *         required: true
 *         schema:
 *           type: string
 *       - name: id
 *         in: path
 *         description: The ID of the tag to retrieve.
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
 *         description: Successfully retrieved the tag.
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Tag'
 *       '404':
 *         description: Tag not found.
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
tagRouter.get('/:marketplaceName/tag/:id', async (req, res) => {
  const { id } = req.params
  const { include } = req.query

  try {
    const tag = await prisma.tag.findUnique({
      where: {
        id,
      },
      include: generateIncludes(include)
    })
    if (tag) {
      res.json(tag)
    } else {
      throw new Error('No tag ID found')
    }
  } catch (error) {
    const { statusCode, errorMessage } = generatePrismaError(error as Prisma.PrismaClientKnownRequestError)
    res.status(statusCode).send({ errorMessage })
  }
})

/**
 * @openapi
 * /{marketplaceName}/tag/{id}:
 *   delete:
 *     tags:
 *       - Tag
 *     summary: Delete a specific tag by ID for a given marketplace.
 *     description: Deletes a tag by its ID from the specified marketplace.
 *     parameters:
 *       - name: marketplaceName
 *         in: path
 *         description: The name of the marketplace where the tag is located.
 *         required: true
 *         schema:
 *           type: string
 *       - name: id
 *         in: path
 *         description: The ID of the tag to delete.
 *         required: true
 *         schema:
 *           type: string
 *     responses:
 *       '200':
 *         description: Successfully deleted the tag.
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Tag'
 *       '404':
 *         description: Tag not found.
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
tagRouter.delete(`/:marketplaceName/tag/:id`, async (req, res) => {
  const { id } = req.params

  try {
    const tag = await prisma.tag.delete({
      where: {
        id: id,
      },
    })
    if (tag) {
      res.json(tag)
    } else {
      throw new Error('No tag ID found')
    }
  } catch (error) {
    const { statusCode, errorMessage } = generatePrismaError(error as Prisma.PrismaClientKnownRequestError)
    res.status(statusCode).send({ errorMessage })
  }
})
