import { Prisma } from '@prisma/client'
import express from 'express'
import { generateIncludes } from '../utils/generateIncludes'
import { getPrismaClient, generatePrismaError } from '../utils/prismaHelpers'
import { validateAccount } from '../validation/user'
import { AuthenticatedUser } from '../validation/user'
import { validateExistingProfile, validateUsername } from '../validation/profile'
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
      await validateUsername(username)
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
      await validateUsername(username, id)
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
 *     summary: Upload an image and update the profile
 *     description: Uploads an image file for a profile and updates either the `avatar` or `banner` field with the stored S3 path. Supports JPEG, PNG, and WEBP. Image is resized before upload.
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *         description: ID of the profile to update
 *       - in: query
 *         name: field
 *         required: false
 *         schema:
 *           type: string
 *           enum: [avatar, banner]
 *           default: avatar
 *         description: The image field to update (avatar or banner)
 *     requestBody:
 *       required: true
 *       content:
 *         multipart/form-data:
 *           schema:
 *             type: object
 *             required:
 *               - file
 *               - accountId
 *             properties:
 *               file:
 *                 type: string
 *                 format: binary
 *                 description: Image file to upload (JPEG, PNG, or WEBP)
 *               accountId:
 *                 type: string
 *                 description: The ID of the account that owns the profile (for admin validation)
 *     responses:
 *       '200':
 *         description: Successfully uploaded the image and updated the profile
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Profile'
 *       '400':
 *         description: Missing file, invalid request body, or invalid field parameter
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 errorMessage:
 *                   type: string
 *                   example: Missing image file
 *       '500':
 *         description: Internal server error during image processing or DB update
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 errorMessage:
 *                   type: string
 *                   example: Unexpected error occurred
 */
profileRouter.put('/profile/upload-image/:id', uploadConfig.single('file'), async (req, res) => {
  const { id } = req.params
  const { field = 'avatar' } = req.query

  try {
    if (!req.file) {
      throw new Error('Missing image file')
    }

    if (field !== 'avatar' && field !== 'banner') {
      throw new Error('Invalid field parameter. Must be "avatar" or "banner"')
    }

    const resizeOptions = field === 'avatar'
      ? { width: 250, quality: 75, format: 'webp' as const, fit: 'inside' as const }
      : { width: 500, quality: 75, format: 'webp' as const, fit: 'inside' as const }

    const key = await uploadImage(req.file, 'profile', resizeOptions)

    const existingProfile = await prisma.profile.findUnique({
      where: { id }
    })

    if (!existingProfile) {
      throw new Error('Profile not found')
    }

    console.log('Updating profile:', { id, field, key, existingProfile: !!existingProfile })

    const updatedProfile = await prisma.profile.update({
      where: { id },
      data: { [field]: key },
    })

    res.json(updatedProfile)
  } catch (error) {
    const { statusCode, prismaError, customError } = generatePrismaError(error as Prisma.PrismaClientKnownRequestError)
    console.error('UPLOAD_PROFILE_IMAGE_ERROR:', prismaError, customError)
    res.status(statusCode).send({ errorMessage: customError || 'Failed to upload profile image.' })
  }
})

/**
 * @openapi
 * /profile/delete-image/{id}:
 *   delete:
 *     tags:
 *       - Profile
 *     summary: Delete a profile's image
 *     description: Deletes the image file associated with a profile from S3 and clears the profile's `avatar` or `banner` field in the database.
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *         description: ID of the profile whose image should be deleted.
 *       - in: query
 *         name: field
 *         required: false
 *         schema:
 *           type: string
 *           enum: [avatar, banner]
 *           default: avatar
 *         description: The image field to delete (avatar or banner)
 *     responses:
 *       '200':
 *         description: Successfully deleted the image and updated the profile
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 profile:
 *                   $ref: '#/components/schemas/Profile'
 *                 message:
 *                   type: string
 *                   example: Image deleted successfully
 *       '400':
 *         description: Invalid field parameter
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 error:
 *                   type: string
 *                   example: Invalid field parameter. Must be "avatar" or "banner"
 *       '404':
 *         description: Profile not found or profile has no image
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 errorMessage:
 *                   type: string
 *                   example: Profile not found or has no image
 *       '500':
 *         description: Internal server error during image deletion or DB update
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 errorMessage:
 *                   type: string
 *                   example: Unexpected error occurred
 */
profileRouter.delete('/profile/delete-image/:id', async (req, res) => {
  const { id } = req.params
  const { field = 'avatar' } = req.query

  try {
    if (field !== 'avatar' && field !== 'banner') {
      throw new Error('Invalid field parameter. Must be "avatar" or "banner"')
    }

    const profile = await prisma.profile.findUnique({
      where: { id },
      select: { avatar: true, banner: true }
    })

    if (!profile) {
      throw new Error('Profile not found')
    }

    const imageToDelete = field === 'avatar' ? profile.avatar : profile.banner

    if (!imageToDelete) {
      throw new Error(`Profile has no ${field} to delete`)
    }

    await deleteImage(imageToDelete)

    const updatedProfile = await prisma.profile.update({
      where: { id },
      data: { [field]: null },
    })

    res.json({
      profile: updatedProfile,
      message: `${field} deleted successfully`
    })
  } catch (error) {
    const { statusCode, prismaError, customError } = generatePrismaError(error as Prisma.PrismaClientKnownRequestError)
    console.error('DELETE_PROFILE_IMAGE_ERROR:', prismaError, customError)
    res.status(statusCode).send({ errorMessage: 'Failed to delete profile image.' })
  }
})
