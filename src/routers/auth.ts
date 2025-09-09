import express from 'express'
import eventBridge from '../utils/eventBridge'
import { PutEventsCommand } from '@aws-sdk/client-eventbridge'
import { ListUsersCommand, AdminDeleteUserCommand } from '@aws-sdk/client-cognito-identity-provider'
import cognitoClient from '../utils/cognitoClient'
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

/**
 * @openapi
 * /auth/check-for-user:
 *   get:
 *     tags:
 *       - Auth
 *     summary: Check if user exists in sign-up flow.
 *     description: Checks if a user already exists with the given email address. If user exists and is confirmed, throws an error. If user exists and is unconfirmed, deletes the unconfirmed user and proceeds. If no user exists, returns success.
 *     parameters:
 *       - name: email
 *         in: query
 *         required: true
 *         description: The email address to check for existing users.
 *         schema:
 *           type: string
 *           format: email
 *           example: "user@example.com"
 *     responses:
 *       '200':
 *         description: Email is available for signup or unconfirmed user was deleted.
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                   description: Indicates if the operation was successful.
 *                   example: true
 *                 message:
 *                   type: string
 *                   description: Success message indicating the email is available.
 *                   example: "Email is available for signup"
 *       '400':
 *         description: Bad request, typically due to missing or invalid email format.
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 errorMessage:
 *                   type: string
 *                   description: Description of the error that occurred.
 *                   example: "Email is required and must be a valid email address"
 *       '409':
 *         description: User already exists with confirmed status.
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 errorMessage:
 *                   type: string
 *                   description: Error message indicating user already exists.
 *                   example: "User already exists. Please try logging in instead."
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
 *                   example: "Failed to check for existing user"
 */
authRouter.get('/auth/check-for-user', async (req, res) => {
  try {
    const { email } = req.query

    if (!email || typeof email !== 'string') {
      return res.status(400).json({
        errorMessage: 'Email is required and must be a valid email address'
      })
    }

    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/
    if (!emailRegex.test(email)) {
      return res.status(400).json({
        errorMessage: 'Email is required and must be a valid email address'
      })
    }

    const userPoolId = process.env.CONSUMER_USER_POOL_ID
    if (!userPoolId) {
      throw new Error('CONSUMER_USER_POOL_ID environment variable is not set')
    }

    const listCommand = new ListUsersCommand({
      UserPoolId: userPoolId,
      Filter: `email = "${email}"`
    })

    const listResponse = await cognitoClient.send(listCommand)
    const user = listResponse.Users?.[0]

    if (user) {
      const status = user.UserStatus

      if (status === 'CONFIRMED') {
        return res.status(409).json({
          errorMessage: 'User already exists. Please try logging in instead.'
        })
      } else if (status === 'UNCONFIRMED') {
        const deleteCommand = new AdminDeleteUserCommand({
          UserPoolId: userPoolId,
          Username: user.Username
        })

        await cognitoClient.send(deleteCommand)
        console.log('Deleted unconfirmed user:', email)
      }
    }

    res.json({
      success: true,
      message: 'Email is available for signup'
    })
  } catch (error) {
    console.error('CHECK_FOR_USER_ERROR:', error)
    res.status(500).json({
      errorMessage: 'Failed to check for existing user'
    })
  }
})