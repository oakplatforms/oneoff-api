import { Prisma } from '@prisma/client'
import express from 'express'
import { generateIncludes } from '../utils/generateIncludes'
import { getPrismaClient, generatePrismaError } from '../utils/prismaHelpers'

const prisma = getPrismaClient()
export const entityRouter = express.Router()

entityRouter.get('/:marketplaceName/:brandName/entities', async (req, res) => {
  const { brandName } = req.params
  const { include, category, entityTag, search } = req.query

  try {
    const brandCategory = await prisma.brandCategory.findFirstOrThrow({
      where: {
        brandName: brandName,
        categoryName: category as string || ''
      }
    })

    const entityTagFilters = Array.isArray(entityTag)
      ? entityTag.filter(tag => typeof tag === 'string')
      : typeof entityTag === 'string'
        ? [entityTag]
        : []

    const parsedFilters = entityTagFilters.map(tagFilter => {
      const [tagName, tagValue] = (tagFilter as string)?.split?.(':') ?? ['', '']
      return { tag: { name: tagName }, tagValue }
    })

    const whereClause: Prisma.EntityWhereInput = {
      brandCategoryId: brandCategory.id,
      AND: [
        ...(parsedFilters.length > 0
          ? [
            {
              entityTags: {
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

    const entities = await prisma.entity.findMany({
      where: whereClause,
      include: generateIncludes(include)
    })

    res.json(entities)
  } catch (error) {
    const { statusCode, errorMessage } = generatePrismaError(error as Prisma.PrismaClientKnownRequestError)
    res.status(statusCode).send({ errorMessage })
  }
})

entityRouter.post(`/:marketplaceName/:brandName/entity`, async (req, res) => {
  const {
    name,
    type,
    displayName,
    description,
    product,
    brandCategoryId,
    image,
    entityTags,
    createdById
  } = req.body

  if (entityTags?.create?.length) {
    entityTags.create.forEach(async (entityTag: { tagId: string; tagValue: string }) => {
      const selectedTag = await prisma.tag.findUnique({
        where: {
          id: entityTag.tagId,
        },
        include: {
          supportedTagValues: true
        }
      })

      if (selectedTag?.supportedTagValues?.length) {
        const supportedTagValue = selectedTag?.supportedTagValues?.find(supportedTagValue => supportedTagValue.displayName === entityTag.tagValue)

        if (!supportedTagValue) {
          throw new Error(`Tag value ${entityTag.tagValue} is not supported for ${selectedTag?.displayName || selectedTag?.name} tag`)
        }
      }
    })
  }

  try {
    const entity = await prisma.entity.create({
      data: {
        name,
        type,
        displayName,
        description,
        image,
        product: {
          create: product,
        },
        entityTags: entityTags?.create?.length
          ? {
            create: entityTags.create.map((entityTag: { tagId: string; tagValue: string }) => ({
              tag: { connect: { id: entityTag.tagId } },
              tagValue: entityTag.tagValue,
            })),
          }
          : undefined,
        brandCategory: { connect: { id: brandCategoryId } },
        createdBy: { connect: { id: createdById } },
      },
    })
    res.json(entity)
  } catch (error) {
    const { statusCode, errorMessage } = generatePrismaError(error as Prisma.PrismaClientKnownRequestError)
    res.status(statusCode).send({ errorMessage })
  }
})

entityRouter.put(`/:marketplaceName/:brandName/entity/:id`, async (req, res) => {
  const { id } = req.params
  const { entityTags } = req.body

  if (entityTags?.create?.length) {
    entityTags.create.forEach(async (entityTag: { tagId: string; tagValue: string }) => {
      const selectedTag = await prisma.tag.findUnique({
        where: {
          id: entityTag.tagId,
        },
        include: {
          supportedTagValues: true
        }
      })

      if (selectedTag?.supportedTagValues?.length) {
        const supportedTagValue = selectedTag?.supportedTagValues?.find(supportedTagValue => supportedTagValue.displayName === entityTag.tagValue)

        if (!supportedTagValue) {
          throw new Error(`Tag value ${entityTag.tagValue} is not supported for ${selectedTag?.displayName || selectedTag?.name} tag`)
        }
      }
    })
  }

  try {
    const entity = await prisma.entity.update({
      where: { id },
      data: {
        ...req.body,
        product: req.body.product ? {
          update: {
            ...req.body.product,
            brandCategoryId: req.body.brandCategoryId
          }
        } : undefined,
        entityTags: entityTags
          ? {
            create: entityTags.create?.map((entityTag: { tagId: string; tagValue: string }) => ({
              tagId: entityTag.tagId,
              tagValue: entityTag.tagValue,
            })),
            updateMany: entityTags.update?.map((entityTag: { id: string; tagValue: string }) => ({
              where: { id: entityTag.id },
              data: { tagValue: entityTag.tagValue },
            })),
            deleteMany: entityTags.delete?.map((entityTagId: string) => ({
              id: entityTagId,
            })),
          }
          : undefined,
        brandCategoryId: req.body.brandCategoryId,
      }
    })
    if (entity) {
      res.json(entity)
    } else {
      throw new Error('Cannot update entity by id')
    }
  } catch (error) {
    const { statusCode, errorMessage } = generatePrismaError(error as Prisma.PrismaClientKnownRequestError)
    res.status(statusCode).send({ errorMessage })
  }
})

entityRouter.get('/:marketplaceName/:brandName/entity/:id', async (req, res) => {
  const { id } = req.params
  const { include } = req.query

  try {
    const entity = await prisma.entity.findUnique({
      where: {
        id
      },
      include: generateIncludes(include)
    })

    if (entity) {
      res.json(entity)
    } else {
      throw new Error('No entity ID found')
    }
  } catch (error) {
    const { statusCode, errorMessage } = generatePrismaError(error as Prisma.PrismaClientKnownRequestError)
    res.status(statusCode).send({ errorMessage })
  }
})

entityRouter.delete(`/:marketplaceName/:brandName/entity/:id`, async (req, res) => {
  const { id } = req.params

  try {
    const entity = await prisma.entity.delete({
      where: {
        id: id,
      },
    })
    if (entity) {
      res.json(entity)
    } else {
      throw new Error('No entity ID found')
    }
  } catch (error) {
    console.error('error', error)
    const { statusCode, errorMessage } = generatePrismaError(error as Prisma.PrismaClientKnownRequestError)
    res.status(statusCode).send({ errorMessage })
  }
})
