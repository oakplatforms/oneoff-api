import { Prisma } from '@prisma/client'
import express from 'express'
import { getPrismaClient, generatePrismaError } from '../utils/prismaHelpers'

const prisma = getPrismaClient()
export const supportedTagValueRouter = express.Router()

/**
 * @openapi
 * /supported-tag-value:
 *   post:
 *     tags:
 *       - Supported Tag Value
 *     summary: Create a new supported tag value for a specific tag.
 *     description: Creates a new supported tag value associated with the given marketplace name and a specific tag.
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               name:
 *                 type: string
 *                 description: The name of the supported tag value.
 *               displayName:
 *                 type: string
 *                 description: The display name of the supported tag value.
 *               tagId:
 *                 type: string
 *                 description: The ID of the tag this supported tag value is associated with.
 *             required:
 *               - name
 *               - displayName
 *               - tagId
 *     responses:
 *       '201':
 *         description: Successfully created the new supported tag value.
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/SupportedTagValue'
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
supportedTagValueRouter.post(`/supported-tag-value`, async (req, res) => {
  const { name, displayName, tagId, createdById } = req.body

  try {
    const supportedTagValue = await prisma.supportedTagValue.create({
      data: {
        name,
        createdBy: { connect: { id: createdById } },
        tag: { connect: { id: tagId } },
        displayName,
      },
    })
    res.json(supportedTagValue)
  } catch (error) {
    const { statusCode, errorMessage } = generatePrismaError(error as Prisma.PrismaClientKnownRequestError)
    res.status(statusCode).send({ errorMessage })
  }
})

/**
 * @openapi
 * /supported-tag-value/{id}:
 *   delete:
 *     tags:
 *       - Supported Tag Value
 *     summary: Delete a specific supported tag value.
 *     description: Deletes a supported tag value associated with the given ID within a specific marketplace.
 *     parameters:
 *       - name: id
 *         in: path
 *         description: The ID of the supported tag value to delete.
 *         required: true
 *         schema:
 *           type: string
 *     responses:
 *       '200':
 *         description: Successfully deleted the supported tag value.
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/SupportedTagValue'
 *       '404':
 *         description: Supported tag value not found.
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
supportedTagValueRouter.delete(`/supported-tag-value/:id`, async (req, res) => {
  const { id } = req.params

  try {
    const supportedTagValue = await prisma.supportedTagValue.delete({
      where: {
        id: id,
      },
    })
    if (supportedTagValue) {
      res.json(supportedTagValue)
    } else {
      throw new Error('No supported tag value ID found')
    }
  } catch (error) {
    const { statusCode, errorMessage } = generatePrismaError(error as Prisma.PrismaClientKnownRequestError)
    res.status(statusCode).send({ errorMessage })
  }
})