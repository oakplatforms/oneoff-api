import { Prisma } from '@prisma/client'
import express from 'express'
import { generateIncludes } from '../utils/generateIncludes'
import { getPrismaClient, generatePrismaError } from '../utils/prismaHelpers'

const prisma = getPrismaClient()
export const entityTagRouter = express.Router()

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
