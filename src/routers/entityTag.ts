import { Prisma } from '@prisma/client'
import express from 'express'
import { generateIncludes } from '../utils/generateIncludes'
import { getPrismaClient, generatePrismaError } from '../utils/prismaHelpers'

const prisma = getPrismaClient()
export const entityTagRouter = express.Router()

/**
 * @openapi
 * /{marketplaceName}/entity-tag:
 *   post:
 *     tags:
 *       - Entity Tag
 *     summary: Create an entity tag
 *     description: |
 *       Attaches a tag with a specific value to an entity.
 *       If the tag has supported values, it validates the provided value before creation.
 *     parameters:
 *       - in: path
 *         name: marketplaceName
 *         required: true
 *         schema:
 *           type: string
 *         description: The name of the marketplace.
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - entityId
 *               - tagId
 *               - tagValue
 *             properties:
 *               entityId:
 *                 type: string
 *                 description: The ID of the entity to tag.
 *               tagId:
 *                 type: string
 *                 description: The ID of the tag to associate with the entity.
 *               tagValue:
 *                 type: string
 *                 description: The value assigned to the tag.
 *     responses:
 *       '200':
 *         description: Successfully created the entity tag.
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/EntityTag'
 *       '400':
 *         description: Tag value not supported or bad request.
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 errorMessage:
 *                   type: string
 *                   example: Tag value "xyz" is not supported for "Grading" tag
 *       '500':
 *         description: Server error.
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 errorMessage:
 *                   type: string
 */
entityTagRouter.post('/:marketplaceName/entity-tag', async (req, res) => {
  const { entityId, tagId, tagValue } = req.body

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
        const entityTag = await prisma.entityTag.create({
          data: {
            tagValue,
            tag: { connect: { id: tagId } },
            entity: { connect: { id: entityId } }
          },
        })
        res.json(entityTag)
      } else {
        throw new Error(`Tag value ${tagValue} is not supported for ${selectedTag?.displayName || selectedTag?.name} tag`)
      }
    } else {
      const entityTag = await prisma.entityTag.create({
        data: {
          tagValue,
          tag: { connect: { id: tagId } },
          entity: { connect: { id: entityId } }
        },
      })
      res.json(entityTag)
    }

  } catch (error) {
    const { statusCode, errorMessage } = generatePrismaError(error as Prisma.PrismaClientKnownRequestError)
    res.status(statusCode).send({ errorMessage })
  }
})

/**
 * @openapi
 * /{marketplaceName}/entity-tag:
 *   put:
 *     tags:
 *       - Entity Tag
 *     summary: Update an existing entity tag value
 *     description: |
 *       Updates the value of an existing entity tag association. If the tag has supported values,
 *       the new value is validated against the allowed options.
 *     parameters:
 *       - in: path
 *         name: marketplaceName
 *         required: true
 *         schema:
 *           type: string
 *         description: The name of the marketplace.
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - entityId
 *               - tagId
 *               - tagValue
 *             properties:
 *               entityId:
 *                 type: string
 *                 description: The ID of the entity.
 *               tagId:
 *                 type: string
 *                 description: The ID of the tag to update.
 *               tagValue:
 *                 type: string
 *                 description: The new tag value to assign.
 *     responses:
 *       '200':
 *         description: Successfully updated the tag value.
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 count:
 *                   type: number
 *                   description: Number of updated rows.
 *                   example: 1
 *       '400':
 *         description: Tag value not supported or association not found.
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 errorMessage:
 *                   type: string
 *                   example: Tag value "xyz" is not supported for tag "Condition"
 *       '500':
 *         description: Server error.
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 errorMessage:
 *                   type: string
 */
entityTagRouter.put('/:marketplaceName/entity-tag', async (req, res) => {
  const { entityId, tagId, tagValue } = req.body

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
        const entityTag = await prisma.entityTag.updateMany({
          where: {
            entityId,
            tagId
          },
          data: {
            tagValue
          }
        })
        if (entityTag.count === 0) {
          throw new Error('Entity tag association not found')
        }
        res.json(entityTag)
      } else {
        throw new Error(`Tag value ${tagValue} is not supported for ${selectedTag?.displayName || selectedTag?.name} tag`)
      }
    } else {
      const entityTag = await prisma.entityTag.updateMany({
        where: {
          entityId,
          tagId
        },
        data: {
          tagValue
        }
      })

      if (entityTag.count === 0) {
        throw new Error('Entity tag association not found')
      }

      res.json(entityTag)
    }
  } catch (error) {
    const { statusCode, errorMessage } = generatePrismaError(error as Prisma.PrismaClientKnownRequestError)
    res.status(statusCode).send({ errorMessage })
  }
})

/**
 * @openapi
 * /{marketplaceName}/entity-tag/{id}:
 *   get:
 *     tags:
 *       - Entity Tag
 *     summary: Retrieve an entity tag by ID
 *     description: Fetches a single entity tag by its unique ID. You may include related data using the `include` query parameter.
 *     parameters:
 *       - in: path
 *         name: marketplaceName
 *         required: true
 *         schema:
 *           type: string
 *         description: The name of the marketplace.
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *         description: The ID of the entity tag to retrieve.
 *       - in: query
 *         name: include
 *         schema:
 *           type: string
 *         description: Comma-separated list of related models to include in the response.
 *     responses:
 *       '200':
 *         description: Successfully retrieved the entity tag.
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/EntityTag'
 *       '404':
 *         description: Entity tag not found.
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 errorMessage:
 *                   type: string
 *                   example: No entity tag ID found
 *       '500':
 *         description: Internal server error.
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 errorMessage:
 *                   type: string
 */
entityTagRouter.get('/:marketplaceName/entity-tag/:id', async (req, res) => {
  const { id } = req.params
  const { include } = req.query

  try {
    const entityTag = await prisma.entityTag.findUnique({
      where: {
        id
      },
      include: generateIncludes(include)
    })
    if (entityTag) {
      res.json(entityTag)
    } else {
      throw new Error('No entity tag ID found')
    }
  } catch (error) {
    const { statusCode, errorMessage } = generatePrismaError(error as Prisma.PrismaClientKnownRequestError)
    res.status(statusCode).send({ errorMessage })
  }
})

/**
 * @openapi
 * /{marketplaceName}/entity-tag/{id}:
 *   delete:
 *     tags:
 *       - Entity Tag
 *     summary: Delete an entity tag by ID
 *     description: Deletes an entity tag by its unique ID.
 *     parameters:
 *       - in: path
 *         name: marketplaceName
 *         required: true
 *         schema:
 *           type: string
 *         description: The name of the marketplace.
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *         description: The ID of the entity tag to delete.
 *     responses:
 *       '200':
 *         description: Entity tag successfully deleted.
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/EntityTag'
 *       '404':
 *         description: Entity tag not found.
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 errorMessage:
 *                   type: string
 *                   example: No entity tag ID found
 *       '500':
 *         description: Internal server error.
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 errorMessage:
 *                   type: string
 */
entityTagRouter.delete('/:marketplaceName/entity-tag/:id', async (req, res) => {
  const { id } = req.params

  try {
    const entityTag = await prisma.entityTag.delete({
      where: {
        id: id
      },
    })
    if (entityTag) {
      res.json(entityTag)
    } else {
      throw new Error('No entity tag ID found')
    }
  } catch (error) {
    const { statusCode, errorMessage } = generatePrismaError(error as Prisma.PrismaClientKnownRequestError)
    res.status(statusCode).send({ errorMessage })
  }
})
