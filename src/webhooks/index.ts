import express from 'express'
import { handleShippoTrackingUpdated } from './providers/shippo'

export const webhookRouter = express.Router()

/**
 * @openapi
 * /shippo:
 *   post:
 *     tags:
 *       - Shippo Webhook
 *     summary: Shippo webhook endpoint for tracking and label events.
 *     description: >
 *       Receives webhook events from Shippo such as `track_updated` and `transaction_created`.
 *       This endpoint must be manually secured using a secret query parameter or IP restrictions,
 *       as Shippo does not sign webhook payloads.
 *     parameters:
 *       - in: query
 *         name: secret
 *         schema:
 *           type: string
 *         required: true
 *         description: Shared secret used to authorize the webhook request.
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             description: Shippo event payload (varies by event type)
 *     responses:
 *       '200':
 *         description: Successfully received and handled the Shippo event.
 *       '401':
 *         description: Invalid or missing webhook secret.
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 errorMessage:
 *                   type: string
 *       '500':
 *         description: Server error while handling Shippo event.
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 errorMessage:
 *                   type: string
 */
webhookRouter.post(
  '/shippo',
  express.json(),
  async (req, res) => {
    const expectedSecret = process.env.SHIPPO_WEBHOOK_SECRET
    const receivedSecret = req.query.secret

    if (!expectedSecret || receivedSecret !== expectedSecret) {
      console.error('Shippo webhook blocked: invalid secret')
      return res.status(401).json({ errorMessage: 'Unauthorized' })
    }

    try {
      const tracking = req.body
      console.log('Shippo event received:', tracking)

      switch (tracking.event) {
      case 'track_updated':
        await handleShippoTrackingUpdated(tracking)
        break
      default:
        console.log(`Unhandled Shippo event type: ${tracking.event}`)
      }

      res.status(200).send('OK')
    } catch (err) {
      console.error('Error handling Shippo webhook:', err)
      res.status(500).json({ errorMessage: 'Internal server error' })
    }
  })
