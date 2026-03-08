import { Prisma } from '@prisma/client'
import express from 'express'
import { generateIncludes } from '../utils/generateIncludes'
import { prismaClient, generatePrismaError } from '../utils/prismaHelpers'
import { paginatePrisma } from '../utils/paginatePrisma'

export const searchRouter = express.Router()

searchRouter.get('/search', async (req, res) => {
  const prisma = prismaClient()
  const {
    search,
    entityPage,
    entityLimit,
    profilePage,
    profileLimit,
    include,
  } = req.query

  try {
    const searchTerm = (search as string)?.trim() || ''

    const parsedEntityPage = parseInt(entityPage as string) || 0
    const parsedEntityLimit = parseInt(entityLimit as string) || 20
    const parsedProfilePage = parseInt(profilePage as string) || 0
    const parsedProfileLimit = parseInt(profileLimit as string) || 20

    // Entity WHERE clause
    const entityWhere: Prisma.EntityWhereInput = searchTerm
      ? {
        OR: [
          { displayName: { contains: searchTerm, mode: 'insensitive' } },
          { name: { contains: searchTerm, mode: 'insensitive' } }
        ]
      }
      : {}

    // Profile WHERE clause (only search profiles when there's a search term)
    const profileWhere: Prisma.ProfileWhereInput | null = searchTerm
      ? {
        username: {
          not: null,
          contains: searchTerm,
          mode: 'insensitive'
        }
      }
      : null

    // Execute queries in parallel
    const [entityResult, profileResult] = await Promise.all([
      paginatePrisma({
        prismaModel: prisma.entity,
        where: entityWhere,
        include: generateIncludes(include as string),
        orderBy: [
          { listings: { _count: 'desc' } },
          { name: 'asc' }
        ],
        page: parsedEntityPage,
        limit: parsedEntityLimit,
        usePagination: true,
      }),
      profileWhere
        ? paginatePrisma({
          prismaModel: prisma.profile,
          where: profileWhere,
          include: {},
          orderBy: { username: 'asc' },
          page: parsedProfilePage,
          limit: parsedProfileLimit,
          usePagination: true,
        })
        : Promise.resolve({ data: [], page: 0, total: 0 })
    ])

    res.json({
      entities: entityResult,
      profiles: profileResult
    })
  } catch (error) {
    const { statusCode, prismaError, customError } = generatePrismaError(error as Prisma.PrismaClientKnownRequestError)
    console.error('SEARCH_ERROR:', prismaError || customError)
    res.status(statusCode).send({ errorMessage: customError || 'Failed to perform search.' })
  }
})
