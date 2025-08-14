import { Prisma } from '@prisma/client'
import express from 'express'
import { generateIncludes } from '../utils/generateIncludes'
import { getPrismaClient, generatePrismaError } from '../utils/prismaHelpers'
import { validateAccount } from '../validation/user'
import { AuthenticatedUser } from '../validation/user'
import { validateExistingProfile, validateUsernameUniqueness } from '../validation/profile'
import { uploadConfig, uploadImage } from '../utils/uploadImage'
import { deleteImage } from '../utils/deleteImage'

const prisma = getPrismaClient()
export const profileRouter = express.Router()

/**
 * @openapi
 * /profile/{id}:
 *   get:
 *     tags:
 *       - Profile
 *     summary: Retrieve a specific profile by ID.
 *     description: Fetches the details of a profile by its unique ID. You can optionally include related entities using the `include` query parameter.
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *         description: The unique ID of the profile to retrieve.
 *       - in: query
 *         name: include
 *         schema:
 *           type: string
 *         description: Comma-separated list of related entities to include in the profile data (e.g., 'account').
 *     responses:
 *       '200':
 *         description: Successfully retrieved the profile.
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Profile'
 *       '400':
 *         description: Bad request, typically due to invalid parameters or if the profile ID is not found.
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
profileRouter.get('/profile/:id', async (req, res) => {
  const { id } = req.params
  const { include } = req.query

  try {
    if (!id) {
      throw new Error('Profile ID is required')
    }
    const profile = await prisma.profile.findUnique({
      where: { id },
      include: generateIncludes(include)
    })

    if (profile) {
      res.json(profile)
    } else {
      throw new Error('No profile ID found')
    }
  } catch (error) {
    const { statusCode, prismaError, customError } = generatePrismaError(error as Prisma.PrismaClientKnownRequestError)
    console.error('GET_PROFILE_ERROR:', prismaError, customError)
    res.status(statusCode).send({ errorMessage: customError || 'Failed to retrieve profile.' })
  }
})

/**
 * @openapi
 * /profile:
 *   post:
 *     tags:
 *       - Profile
 *     summary: Create a new profile.
 *     description: Creates a new profile in the database. The request body must include details like `username`, `accountId`, and optionally `description`.
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - accountId
 *             properties:
 *               username:
 *                 type: string
 *                 description: The username for the profile (must be unique).
 *               accountId:
 *                 type: string
 *                 description: The ID of the account to associate with the profile.
 *               description:
 *                 type: string
 *                 description: Optional description for the profile.
 *     responses:
 *       '200':
 *         description: Successfully created a new profile.
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Profile'
 *       '400':
 *         description: Bad request, typically due to invalid request data or if the username is already taken.
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
profileRouter.post('/profile', async (req, res) => {
  const {
    username,
    accountId,
    description,
  } = req.body

  try {
    if (!accountId) {
      throw new Error('Account ID is required')
    }

    validateAccount(req.user as AuthenticatedUser, accountId, 'authenticated')
    if (username) {
      await validateUsernameUniqueness(username)
    }

    const profile = await prisma.profile.create({
      data: {
        username,
        description,
        account: { connect: { id: accountId } },
      },
      include: {
        account: true
      }
    })

    res.json(profile)
  } catch (error) {
    const { statusCode, prismaError, customError } = generatePrismaError(error as Prisma.PrismaClientKnownRequestError)
    console.error('CREATE_PROFILE_ERROR:', prismaError || customError)
    res.status(statusCode).send({ errorMessage: customError || 'Failed to create profile.' })
  }
})

/**
 * @openapi
 * /profile/{id}:
 *   put:
 *     tags:
 *       - Profile
 *     summary: Update an existing profile.
 *     description: Updates an existing profile in the database. The request body can include fields like `username` and `description`.
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *         description: The ID of the profile to be updated.
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               username:
 *                 type: string
 *                 description: The username for the profile (must be unique).
 *               description:
 *                 type: string
 *                 description: Optional description for the profile.
 *     responses:
 *       '200':
 *         description: Successfully updated the profile.
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Profile'
 *       '400':
 *         description: Bad request, typically due to invalid parameters or if the username is already taken.
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
profileRouter.put('/profile/:id', async (req, res) => {
  const { id } = req.params
  const {
    username,
    accountId,
  } = req.body

  try {
    if (!accountId) {
      throw new Error('Account ID is required')
    }

    validateAccount(req.user as AuthenticatedUser, accountId, 'authenticated')
    await validateExistingProfile(id)
    if (username) {
      await validateUsernameUniqueness(username, id)
    }

    const updateData = { ...req.body }

    delete updateData.accountId

    const profile = await prisma.profile.update({
      where: { id },
      data: updateData,
      include: {
        account: true
      }
    })

    res.json(profile)
  } catch (error) {
    const { statusCode, prismaError, customError } = generatePrismaError(error as Prisma.PrismaClientKnownRequestError)
    console.error('UPDATE_PROFILE_ERROR:', prismaError || customError)
    res.status(statusCode).send({ errorMessage: customError || 'Failed to update profile.' })
  }
})

/**
 * @openapi
 * /profile/upload-image/{id}:
 *   put:
 *     tags:
 *       - Profile
 *     summary: Upload an image for a specific profile.
 *     description: Uploads and processes an image for a profile (avatar or banner), resizing it appropriately. The image is stored in S3 and the profile is updated with the new image URL.
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *         description: The unique ID of the profile to upload an image for.
 *     requestBody:
 *       required: true
 *       content:
 *         multipart/form-data:
 *           schema:
 *             type: object
 *             required:
 *               - file
 *               - accountId
 *               - field
 *             properties:
 *               file:
 *                 type: string
 *                 format: binary
 *                 description: The image file to upload (JPEG, PNG, WebP, or SVG).
 *               accountId:
 *                 type: string
 *                 description: The ID of the account that owns the profile (for admin validation).
 *               field:
 *                 type: string
 *                 enum: [avatar, banner]
 *                 description: The field to update ('avatar' or 'banner').
 *     responses:
 *       '200':
 *         description: Successfully uploaded the image and updated the profile.
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Profile'
 *       '400':
 *         description: Bad request, typically due to missing file, invalid accountId, or invalid field parameter.
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 errorMessage:
 *                   type: string
 *                   description: Description of the error that occurred.
 *       '401':
 *         description: Unauthorized. User does not have admin access to the specified account.
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
profileRouter.put('/profile/upload-image/:id', uploadConfig.single('file'), async (req, res) => {
  const { id } = req.params
  const { field, accountId } = req.body

  try {
    if (!accountId) {
      throw new Error('Missing accountId in request body')
    }

    validateAccount(req.user as AuthenticatedUser, accountId, 'admin')

    if (!req.file) {
      throw new Error('Missing image file')
    }

    if (field !== 'avatar' && field !== 'banner') {
      throw new Error('Invalid field parameter. Must be "avatar" or "banner"')
    }

    //Get current profile to check for existing image
    const currentProfile = await prisma.profile.findUnique({
      where: { id },
      select: { [field]: true }
    })

    const oldImageKey = currentProfile?.[field as keyof typeof currentProfile] as string | null | undefined
    let shouldDeleteOldImage = false

    //Set appropriate resize options based on field type
    const resizeOptions = field === 'avatar'
      ? { width: 750, quality: 75, format: 'webp' as const, fit: 'inside' as const }
      : { width: 1050, quality: 75, format: 'webp' as const, fit: 'inside' as const }

    const key = await uploadImage(req.file, 'profile', resizeOptions)

    if (oldImageKey) {
      shouldDeleteOldImage = true
    }

    const updatedProfile = await prisma.profile.update({
      where: { id },
      data: { [field]: key },
    })

    //Delete old image from S3 after successful database update
    if (shouldDeleteOldImage && oldImageKey) {
      try {
        const s3Key = oldImageKey.startsWith('/') ? oldImageKey.substring(1) : oldImageKey
        await deleteImage(s3Key)
      } catch (deleteError) {
        console.error('Failed to delete old image from S3:', deleteError)
      }
    }

    res.json(updatedProfile)
  } catch (error) {
    const { statusCode, prismaError, customError } = generatePrismaError(error as Prisma.PrismaClientKnownRequestError)
    console.error('UPLOAD_PROFILE_IMAGE_ERROR:', prismaError, customError)
    res.status(statusCode).send({ errorMessage: customError || 'Failed to upload profile image.' })
  }
})
