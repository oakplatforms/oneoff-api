import { Prisma } from '@prisma/client'
import express from 'express'
import { prismaClient, generatePrismaError } from '../utils/prismaHelpers'
import { AuthenticatedUser, validateRole } from '../validation/user'
import { validateStringFields, STRING_LIMITS } from '../validation/stringLimits'

const prisma = prismaClient()
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
  const { name, displayName, tagId } = req.body

  try {
    if (!tagId) {
      throw new Error('tagId is required')
    }
    validateRole(req.user as AuthenticatedUser, 'admin')
    validateStringFields({
      name: { value: name, maxLength: STRING_LIMITS.name },
      displayName: { value: displayName, maxLength: STRING_LIMITS.displayName },
    })

    const supportedTagValue = await prisma.supportedTagValue.create({
      data: {
        name,
        displayName,
        tag: { connect: { id: tagId } }
      },
    })
    res.json(supportedTagValue)
  } catch (error) {
    const { statusCode, prismaError, customError } = generatePrismaError(error as Prisma.PrismaClientKnownRequestError)
    console.error('CREATE_SUPPORTED_TAG_VALUE_ERROR:', prismaError || customError)
    res.status(statusCode).send({ errorMessage: customError || 'Failed to create supported tag value.' })
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
    if (!id) {
      throw new Error('Supported tag value ID is required')
    }
    await validateRole(req.user as AuthenticatedUser, 'admin')

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
    const { statusCode, prismaError, customError } = generatePrismaError(error as Prisma.PrismaClientKnownRequestError)
    console.error('DELETE_SUPPORTED_TAG_VALUE_ERROR:', prismaError || customError)
    res.status(statusCode).send({ errorMessage: customError || 'Failed to delete supported tag value.' })
  }
})