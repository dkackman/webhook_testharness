/**
 * Webhook receiver route
 * Receives and processes incoming webhook events from Sage
 */

import express, { Router } from 'express';
import { verifySignature } from '../middleware/hmac-verify.js';
import { ApiError } from '../middleware/error-handler.js';
import sseManager from '../services/sse-manager.js';

const router = Router();

/**
 * POST /sage_hook
 * Receives webhook events, verifies signature, and broadcasts to SSE clients
 */
router.post('/', express.raw({ type: 'application/json' }), (req, res, next) => {
  try {
    const signature = req.headers['x-webhook-signature'];

    // Verify HMAC signature
    const verification = verifySignature(req.body, signature);

    if (!verification.isValid) {
      throw new ApiError(401, 'Signature verification failed', verification.status);
    }

    // Parse webhook body
    let parsedBody;
    try {
      parsedBody = JSON.parse(req.body.toString());
    } catch {
      throw new ApiError(400, 'Invalid JSON body');
    }

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
  } catch (err) {
    next(err);
  }
});

export default router;
