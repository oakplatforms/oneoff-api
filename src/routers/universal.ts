import express from 'express'
import { prismaClient, generatePrismaError } from '../utils/prismaHelpers'
import { validateReferenceCodeFormat, extractTypeIdentifier } from '../validation/referenceCode'
import { Prisma } from '@prisma/client'
import { generateIncludes } from '../utils/generateIncludes'

export const universalRouter = express.Router()

/**
 * @openapi
 * /{username}/{referenceCode}:
 *   get:
 *     tags:
 *       - Universal
 *     summary: Retrieve a record by username and 6-character reference code
 *     description: |
 *       Universal endpoint that fetches any record by username and reference code.
 *       The reference code contains a type identifier (S or C) at any position:
 *       - S → Listing
 *       - C → List (any type)
 *       Examples: 32S392, 437C52
 *     parameters:
 *       - in: path
 *         name: username
 *         required: true
 *         schema:
 *           type: string
 *         description: The username of the profile
 *       - in: path
 *         name: referenceCode
 *         required: true
 *         schema:
 *           type: string
 *           pattern: '^[2-9SC]{6}$'
 *         description: The 6-character reference code (e.g., 32S392, 437C52)
 *       - in: query
 *         name: include
 *         schema:
 *           type: string
 *         description: Comma-separated list of related entities to include in the response
 *     responses:
 *       '200':
 *         description: Successfully retrieved the record
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 type:
 *                   type: string
 *                   enum: [Listing, List]
 *                   description: The type of record returned
 *                 data:
 *                   type: object
 *                   description: The record data
 *       '400':
 *         description: Invalid reference code format or username
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 errorMessage:
 *                   type: string
 *       '404':
 *         description: Record not found or username doesn't exist
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 errorMessage:
 *                   type: string
 *       '500':
 *         description: Internal server error
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 errorMessage:
 *                   type: string
 */
universalRouter.get('/username/:username/:referenceCode', async (req, res) => {
  const prisma = prismaClient()
  const { username, referenceCode } = req.params
  const { include } = req.query

  try {
    //Validate username exists
    const profile = await prisma.profile.findFirst({
      where: { username },
      include: { account: true }
    })

    if (!profile || !profile.account) {
      return res.status(404).json({
        errorMessage: `Profile with username '${username}' not found`
      })
    }

    const accountId = profile.accountId

    //Validate reference code format
    validateReferenceCodeFormat(referenceCode)

    //Extract type identifier (S or C)
    const typeIdentifier = extractTypeIdentifier(referenceCode)
    const includes = generateIncludes(include as string)
    const upperCode = referenceCode.toUpperCase()

    let record: Record<string, unknown> | null = null
    let recordType = ''

    switch (typeIdentifier) {
    case 'S':
      //Listing
      record = await prisma.listing.findFirst({
        where: {
          referenceCode: upperCode,
          accountId
        },
        include: includes
      })
      recordType = 'Listing'
      break

    case 'C':
      //List (any type)
      record = await prisma.list.findFirst({
        where: {
          referenceCode: upperCode,
          accountId
        },
        include: includes
      })
      recordType = 'List'
      break

    default:
      throw new Error(`Invalid type identifier '${typeIdentifier}'. Valid types are: S, C`)
    }

    if (!record) {
      return res.status(404).json({
        errorMessage: `No ${recordType} found for user '${username}' with reference code ${referenceCode}`
      })
    }

    res.json({
      type: recordType,
      data: record
    })

  } catch (error) {
    const { statusCode, prismaError, customError } = generatePrismaError(error as Prisma.PrismaClientKnownRequestError)
    console.error('UNIVERSAL_REFERENCE_CODE_ERROR:', prismaError || customError)
    res.status(statusCode).send({ errorMessage: customError || 'Failed to retrieve record by reference code.' })
  }
})
