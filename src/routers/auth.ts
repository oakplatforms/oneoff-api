import express from 'express'
import eventBridge from '../utils/eventBridge'
import { PutEventsCommand } from '@aws-sdk/client-eventbridge'
import { validateAccount, AuthenticatedUser } from '../validation/user'

export const authRouter = express.Router()

/**
 * @openapi
 * /auth/update-password:
 *   post:
 *     tags:
 *       - Auth
 *     summary: Trigger password update email.
 *     description: Sends a password update confirmation email to the user. This endpoint triggers an EventBridge event for email communication.
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - email
 *               - userId
 *             properties:
 *               email:
 *                 type: string
 *                 format: email
 *                 description: The email address of the user whose password was updated.
 *               userId:
 *                 type: string
 *                 description: The unique identifier of the user whose password was updated.
 *     responses:
 *       '200':
 *         description: Password update email triggered successfully.
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 message:
 *                   type: string
 *                   description: Success message indicating the email was triggered.
 *                 success:
 *                   type: boolean
 *                   description: Indicates if the operation was successful.
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
authRouter.post('/auth/update-password', async (req, res) => {
  try {
    const { email, accountId } = req.body

    if (!email || !accountId) {
      throw new Error('Email and accountId are required.')
    }

    await validateAccount(req.user as AuthenticatedUser, accountId, 'authenticated')

    await eventBridge.send(new PutEventsCommand({
      Entries: [
        {
          Source: 'tcgx',
          DetailType: 'user.password.changed',
          Detail: JSON.stringify({
            email,
            accountId,
            type: 'user.password.changed',
            timestamp: new Date().toISOString()
          }),
          EventBusName: 'default',
        },
      ],
    }))

    res.json({
      message: 'Password update email triggered successfully.',
      success: true
    })
  } catch (error) {
    console.error('UPDATE_PASSWORD_ERROR:', error)
    res.status(500).json({ errorMessage: 'Failed to trigger password update email.' })
  }
})