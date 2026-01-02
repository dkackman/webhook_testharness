/**
 * Webhook receiver route
 * Receives and processes incoming webhook events from Sage
 */

const express = require('express');
const router = express.Router();
const { verifySignature } = require('../middleware/hmac-verify');
const sseManager = require('../services/sse-manager');

/**
 * POST /sage_hook
 * Receives webhook events, verifies signature, and broadcasts to SSE clients
 */
router.post(
  '/',
  express.raw({ type: 'application/json' }),
  (req, res) => {
    const signature = req.headers['x-webhook-signature'];

    // Verify HMAC signature
    const verification = verifySignature(req.body, signature);

    if (!verification.isValid) {
      console.error('Webhook verification failed:', verification.status);
      return res.status(401).json({ error: 'Signature verification failed' });
    }

    // Parse webhook body
    let parsedBody;
    try {
      parsedBody = JSON.parse(req.body.toString());
    } catch (e) {
      console.error('Failed to parse webhook body:', e);
      return res.status(400).json({ error: 'Invalid JSON body' });
    }

    console.log('Webhook received:', parsedBody);
    console.log('Verification status:', verification.status);

    // Broadcast event to SSE clients
    const eventData = {
      id: Date.now(),
      event: 'webhook',
      data: JSON.stringify({
        timestamp: new Date().toISOString(),
        body: parsedBody,
        verification: verification.status,
        signature: signature || 'none',
      }),
    };

    sseManager.broadcast(eventData);

    res.status(200).end();
  }
);

module.exports = router;
