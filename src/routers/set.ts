import { Prisma } from '@prisma/client'
import express from 'express'
import { generateIncludes } from '../utils/generateIncludes'
import { getPrismaClient, generatePrismaError } from '../utils/prismaHelpers'
import { paginatePrisma } from '../utils/paginatePrisma'
import { uploadConfig, uploadImage } from '../utils/uploadImage'
import { deleteImage } from '../utils/deleteImage'

const prisma = getPrismaClient()
export const setRouter = express.Router()

/**
 * @openapi
 * /sets:
 *   get:
 *     tags:
 *       - Set
 *     summary: Get all sets
 *     description: Retrieves all sets with optional filtering and pagination.
 *     parameters:
 *       - in: query
 *         name: include
 *         schema:
 *           type: string
 *         required: false
 *         description: Comma-separated related entities to include (e.g., "entities").
 *       - in: query
 *         name: name
 *         schema:
 *           type: string
 *         required: false
 *         description: Filter sets by name (partial match).
 *       - in: query
 *         name: code
 *         schema:
 *           type: string
 *         required: false
 *         description: Filter sets by code (exact match).
 *       - in: query
 *         name: search
 *         schema:
 *           type: string
 *         required: false
 *         description: Search term to match against set name, displayName, code, or description.
 *       - in: query
 *         name: usePagination
 *         schema:
 *           type: string
 *           enum: [true, false]
 *         required: false
 *         description: Whether to use pagination (default true).
 *       - in: query
 *         name: page
 *         schema:
 *           type: integer
 *           default: 0
 *         required: false
 *         description: Page number for pagination (0-based).
 *       - in: query
 *         name: limit
 *         schema:
 *           type: integer
 *           default: 10
 *         required: false
 *         description: Number of items per page.
 *     responses:
 *       '200':
 *         description: Successfully retrieved the list of sets.
 *         content:
 *           application/json:
 *             schema:
 *               type: array
 *               items:
 *                 $ref: '#/components/schemas/Set'
 *       '400':
 *         description: Bad request, possibly due to invalid query params.
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 errorMessage:
 *                   type: string
 *                   description: Description of the error that occurred.
 *       '500':
 *         description: Internal server error, typically due to database issues.
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 errorMessage:
 *                   type: string
 *                   description: Description of the error that occurred.
 */
setRouter.get('/sets', async (req, res) => {
  const { include, name, code, search, usePagination, page, limit } = req.query

  try {
    const parsedLimit = parseInt(limit as string) || 10
    const parsedPage = parseInt(page as string) || 0

    const where: Prisma.SetWhereInput = {}

    if (name) {
      where.name = {
        contains: name as string,
        mode: 'insensitive'
      }
    }

    if (code) {
      where.code = code as string
    }

    if (search) {
      where.OR = [
        { displayName: { contains: search as string, mode: 'insensitive' } },
        { code: { contains: search as string, mode: 'insensitive' } },
      ]
    }

    const result = await paginatePrisma({
      prismaModel: prisma.set,
      where,
      include: generateIncludes(include as string),
      page: parsedPage,
      limit: parsedLimit,
      usePagination: usePagination === 'false' ? false : true,
    })

    res.json(result)
  } catch (error) {
    const { statusCode, prismaError, customError } = generatePrismaError(error as Prisma.PrismaClientKnownRequestError)
    console.error('GET_SETS_ERROR:', prismaError, customError)
    res.status(statusCode).send({ errorMessage: customError || 'Failed to retrieve sets.' })
  }
})

/**
 * @openapi
 * /set:
 *   post:
 *     tags:
 *       - Set
 *     summary: Create a new set
 *     description: Creates a new set with the provided information.
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - name
 *               - code
 *             properties:
 *               name:
 *                 type: string
 *                 description: Internal name for the set.
 *               displayName:
 *                 type: string
 *                 description: Public-facing display name for the set.
 *               code:
 *                 type: string
 *                 description: Unique code identifier for the set.
 *               description:
 *                 type: string
 *                 description: Optional description of the set.
 *               entities:
 *                 type: object
 *                 properties:
 *                   connect:
 *                     type: array
 *                     items:
 *                       type: object
 *                       properties:
 *                         id:
 *                           type: string
 *                           description: ID of the entity to connect to the set.
 *     responses:
 *       '200':
 *         description: Successfully created the set.
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Set'
 *       '400':
 *         description: Bad request, typically due to missing required fields.
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 errorMessage:
 *                   type: string
 *                   description: Description of the error that occurred.
 *       '500':
 *         description: Internal server error, often due to database issues or unexpected errors.
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 errorMessage:
 *                   type: string
 *                   description: Description of the error that occurred.
 */
setRouter.post('/set', async (req, res) => {
  const { name, displayName, code, description, brandId, entities } = req.body

  try {
    //Validate required fields
    if (!name) {
      throw new Error('Name is required')
    }
    if (!code) {
      throw new Error('Code is required')
    }

    const set = await prisma.set.create({
      data: {
        name,
        displayName,
        code,
        description,
        brand: brandId ? { connect: { id: brandId } } : undefined,
        entities: entities?.connect?.length
          ? {
            connect: entities.connect.map((item: { id: string }) => ({ id: item.id }))
          }
          : undefined,
      },
    })

    res.json(set)
  } catch (error) {
    const { statusCode, prismaError, customError } = generatePrismaError(error as Prisma.PrismaClientKnownRequestError)
    console.error('CREATE_SET_ERROR:', prismaError, customError)
    res.status(statusCode).send({ errorMessage: customError || 'Failed to create set.' })
  }
})

/**
 * @openapi
 * /set/{id}:
 *   put:
 *     tags:
 *       - Set
 *     summary: Update an existing set
 *     description: Updates a set and its associated entities.
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *         description: The ID of the set to update.
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               name:
 *                 type: string
 *                 description: Internal name of the set.
 *               displayName:
 *                 type: string
 *                 description: Public-facing display name of the set.
 *               code:
 *                 type: string
 *                 description: Unique code identifier for the set.
 *               description:
 *                 type: string
 *                 description: Optional description of the set.
 *               entities:
 *                 type: object
 *                 properties:
 *                   connect:
 *                     type: array
 *                     items:
 *                       type: object
 *                       properties:
 *                         id:
 *                           type: string
 *                           description: ID of the entity to connect to the set.
 *                   disconnect:
 *                     type: array
 *                     items:
 *                       type: object
 *                       properties:
 *                         id:
 *                           type: string
 *                           description: ID of the entity to disconnect from the set.
 *                   set:
 *                     type: array
 *                     items:
 *                       type: object
 *                       properties:
 *                         id:
 *                           type: string
 *                           description: ID of the entity to set for the set (replaces all existing connections).
 *     responses:
 *       '200':
 *         description: Successfully updated the set.
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Set'
 *       '400':
 *         description: Bad request due to invalid input.
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 errorMessage:
 *                   type: string
 *       '404':
 *         description: Set not found.
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 errorMessage:
 *                   type: string
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
setRouter.put('/set/:id', async (req, res) => {
  const { id } = req.params
  const { name, displayName, code, description, brandId, entities } = req.body

  try {
    if (!id) {
      throw new Error('Set ID is required')
    }

    //First, check if the set exists
    const existingSet = await prisma.set.findUnique({
      where: { id },
      select: { id: true }
    })

    if (!existingSet) {
      throw new Error('Set not found')
    }

    const updateData: Prisma.SetUpdateInput = {
      name,
      displayName,
      code,
      description,
    }

    // Handle brandId (allow null to disconnect)
    if (brandId !== undefined) {
      if (brandId) {
        updateData.brand = { connect: { id: brandId } }
      } else {
        updateData.brand = { disconnect: true }
      }
    }

    //Handle entity relations
    if (entities) {
      if (entities.connect) {
        updateData.entities = {
          connect: entities.connect.map((item: { id: string }) => ({ id: item.id }))
        }
      }
      if (entities.disconnect) {
        updateData.entities = {
          disconnect: entities.disconnect.map((item: { id: string }) => ({ id: item.id }))
        }
      }
      if (entities.set) {
        updateData.entities = {
          set: entities.set.map((item: { id: string }) => ({ id: item.id }))
        }
      }
    }

    const updatedSet = await prisma.set.update({
      where: { id },
      data: updateData,
    })

    res.json(updatedSet)
  } catch (error) {
    const { statusCode, prismaError, customError } = generatePrismaError(error as Prisma.PrismaClientKnownRequestError)
    console.error('UPDATE_SET_ERROR:', prismaError, customError)
    res.status(statusCode).send({ errorMessage: customError || 'Failed to update set.' })
  }
})

/**
 * @openapi
 * /set/{id}:
 *   get:
 *     tags:
 *       - Set
 *     summary: Retrieve a specific set by its ID.
 *     description: Fetches details of a specific set by its ID, with optional inclusion of related data.
 *     parameters:
 *       - name: id
 *         in: path
 *         description: The ID of the set to retrieve.
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
 *         description: Successfully retrieved the set.
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Set'
 *       '404':
 *         description: Set not found.
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
 *         description: Internal server error, often due to database issues or unexpected errors.
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 errorMessage:
 *                   type: string
 *                   description: Description of the error that occurred.
 */
setRouter.get('/set/:id', async (req, res) => {
  const { id } = req.params
  const { include } = req.query

  try {
    if (!id) {
      throw new Error('Set ID is required')
    }

    const set = await prisma.set.findUnique({
      where: { id },
      include: generateIncludes(include as string)
    })

    if (set) {
      res.json(set)
    } else {
      throw new Error('Set not found')
    }
  } catch (error) {
    const { statusCode, prismaError, customError } = generatePrismaError(error as Prisma.PrismaClientKnownRequestError)
    console.error('GET_SET_ERROR:', prismaError, customError)
    res.status(statusCode).send({ errorMessage: customError || 'Failed to retrieve set.' })
  }
})

/**
 * @openapi
 * /set/{id}:
 *   delete:
 *     tags:
 *       - Set
 *     summary: Delete a specific set by its ID.
 *     description: Deletes a specific set by its ID. Returns the deleted set or an error message if the ID is not found.
 *     parameters:
 *       - name: id
 *         in: path
 *         description: The ID of the set to delete.
 *         required: true
 *         schema:
 *           type: string
 *     responses:
 *       '200':
 *         description: Successfully deleted the set.
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Set'
 *       '404':
 *         description: Set not found.
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
 *         description: Internal server error, often due to database issues or unexpected errors.
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 errorMessage:
 *                   type: string
 *                   description: Description of the error that occurred.
 */
setRouter.delete('/set/:id', async (req, res) => {
  const { id } = req.params

  try {
    if (!id) {
      throw new Error('Set ID is required')
    }

    const setToDelete = await prisma.set.findUnique({
      where: { id },
      select: {
        id: true,
        banner: true,
        logo: true,
        entities: true
      }
    })

    if (!setToDelete) {
      throw new Error('Set not found')
    }

    const deletedSet = await prisma.set.delete({
      where: { id },
      include: generateIncludes(['entities'])
    })

    const imageDeletions = []

    if (setToDelete.banner) {
      imageDeletions.push(deleteImage(setToDelete.banner))
    }

    if (setToDelete.logo) {
      imageDeletions.push(deleteImage(setToDelete.logo))
    }

    if (imageDeletions.length > 0) {
      await Promise.all(imageDeletions)
      console.log(`Deleted ${imageDeletions.length} image(s) from S3 for set ${id}`)
    }

    res.json(deletedSet)
  } catch (error) {
    const { statusCode, prismaError, customError } = generatePrismaError(error as Prisma.PrismaClientKnownRequestError)
    console.error('DELETE_SET_ERROR:', prismaError, customError)
    res.status(statusCode).send({ errorMessage: customError || 'Failed to delete set.' })
  }
})

/**
 * @openapi
 * /set/upload-image/{id}:
 *   put:
 *     tags:
 *       - Set
 *     summary: Upload an image for a set
 *     description: Uploads a banner or logo image for a specific set. Supports banner and logo fields.
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *         description: The ID of the set to upload image for.
 *       - in: query
 *         name: field
 *         required: false
 *         schema:
 *           type: string
 *           enum: [banner, logo]
 *           default: banner
 *         description: The field to update (banner or logo).
 *     requestBody:
 *       required: true
 *       content:
 *         multipart/form-data:
 *           schema:
 *             type: object
 *             required:
 *               - file
 *             properties:
 *               file:
 *                 type: string
 *                 format: binary
 *                 description: The image file to upload.
 *     responses:
 *       '200':
 *         description: Successfully uploaded the image.
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Set'
 *       '400':
 *         description: Bad request, typically due to missing file or invalid field parameter.
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 errorMessage:
 *                   type: string
 *                   description: Description of the error that occurred.
 *       '404':
 *         description: Set not found.
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 errorMessage:
 *                   type: string
 *                   description: Description of the error that occurred.
 *       '500':
 *         description: Internal server error, typically due to database issues.
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 errorMessage:
 *                   type: string
 *                   description: Description of the error that occurred.
 */
setRouter.put('/set/upload-image/:id', uploadConfig.single('file'), async (req, res) => {
  const { id } = req.params
  const { field = 'banner' } = req.query

  try {
    if (!id) {
      throw new Error('Set ID is required')
    }

    //First, check if the set exists
    const existingSet = await prisma.set.findUnique({
      where: { id },
      select: { id: true }
    })

    if (!existingSet) {
      throw new Error('Set not found')
    }

    if (!req.file) {
      throw new Error('Missing image file')
    }

    if (field !== 'banner' && field !== 'logo') {
      throw new Error('Invalid field parameter. Must be "banner" or "logo"')
    }

    const resizeOptions = field === 'banner'
      ? { width: 800, quality: 75, format: 'webp' as const, fit: 'inside' as const }
      : { width: 200, quality: 75, format: 'webp' as const, fit: 'inside' as const }

    const key = await uploadImage(req.file, 'set', resizeOptions)

    const updatedSet = await prisma.set.update({
      where: { id },
      data: { [field]: key },
    })

    res.json(updatedSet)
  } catch (error) {
    const { statusCode, prismaError, customError } = generatePrismaError(error as Prisma.PrismaClientKnownRequestError)
    console.error('UPLOAD_SET_IMAGE_ERROR:', prismaError, customError)
    res.status(statusCode).send({ errorMessage: customError || 'Failed to upload set image.' })
  }
})

/**
 * @openapi
 * /set/delete-image/{id}:
 *   delete:
 *     tags:
 *       - Set
 *     summary: Delete an image from a set
 *     description: Deletes a banner or logo image from a specific set. Supports banner and logo fields.
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *         description: The ID of the set to delete image from.
 *       - in: query
 *         name: field
 *         required: false
 *         schema:
 *           type: string
 *           enum: [banner, logo]
 *           default: banner
 *         description: The field to delete (banner or logo).
 *     responses:
 *       '200':
 *         description: Successfully deleted the image.
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 set:
 *                   $ref: '#/components/schemas/Set'
 *                 message:
 *                   type: string
 *                   description: Success message.
 *       '400':
 *         description: Bad request, typically due to invalid field parameter or missing image.
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 errorMessage:
 *                   type: string
 *                   description: Description of the error that occurred.
 *       '404':
 *         description: Set not found.
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 errorMessage:
 *                   type: string
 *                   description: Description of the error that occurred.
 *       '500':
 *         description: Internal server error, typically due to database issues.
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 errorMessage:
 *                   type: string
 *                   description: Description of the error that occurred.
 */
setRouter.delete('/set/delete-image/:id', async (req, res) => {
  const { id } = req.params
  const { field = 'banner' } = req.query

  try {
    if (!id) {
      throw new Error('Set ID is required')
    }

    //First, get the existing set to check current images
    const existingSet = await prisma.set.findUnique({
      where: { id },
      select: { id: true, banner: true, logo: true }
    })

    if (!existingSet) {
      throw new Error('Set not found')
    }

    if (field !== 'banner' && field !== 'logo') {
      throw new Error('Invalid field parameter. Must be "banner" or "logo"')
    }

    const imageToDelete = field === 'banner' ? existingSet.banner : existingSet.logo

    if (!imageToDelete) {
      throw new Error(`Set has no ${field} to delete`)
    }

    await deleteImage(imageToDelete)

    const updatedSet = await prisma.set.update({
      where: { id },
      data: { [field]: null },
    })

    res.json({
      set: updatedSet,
      message: `${field} deleted successfully`
    })
  } catch (error) {
    const { statusCode, prismaError, customError } = generatePrismaError(error as Prisma.PrismaClientKnownRequestError)
    console.error('DELETE_SET_IMAGE_ERROR:', prismaError, customError)
    res.status(statusCode).send({ errorMessage: customError || 'Failed to delete set image.' })
  }
})
