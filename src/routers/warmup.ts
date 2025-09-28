import express from 'express'
import { getPrismaClient } from '../utils/prismaHelpers'

export const warmupRouter = express.Router()

/**
 * @openapi
 * /warmup:
 *   get:
 *     tags:
 *       - Warmup
 *     summary: Warm up the Prisma client
 *     description: Initializes the Prisma client and performs a simple database operation to ensure it's ready for use. This helps reduce cold start latency.
 *     responses:
 *       '200':
 *         description: Prisma client successfully warmed up
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 status:
 *                   type: string
 *                   example: warmed_up
 *                 message:
 *                   type: string
 *                   example: Prisma client initialized successfully
 *                 timestamp:
 *                   type: string
 *                   format: date-time
 *                   example: "2024-01-01T00:00:00.000Z"
 *       '500':
 *         description: Failed to initialize Prisma client
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 status:
 *                   type: string
 *                   example: error
 *                 message:
 *                   type: string
 *                   example: Failed to initialize Prisma client
 *                 error:
 *                   type: string
 *                   example: Database connection failed
 */
warmupRouter.get('/warmup', async (req, res) => {
  try {
    const prisma = getPrismaClient()
    await prisma.$queryRaw`SELECT 1`

    res.json({
      status: 'warmed_up',
      message: 'Prisma client initialized successfully',
      timestamp: new Date().toISOString()
    })
  } catch (error) {
    console.error('WARMUP_ERROR:', error)
    res.status(500).json({
      status: 'error',
      message: 'Failed to initialize Prisma client',
      error: error instanceof Error ? error.message : 'Unknown error'
    })
  }
})