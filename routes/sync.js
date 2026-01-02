/**
 * Secret sync route
 * Syncs webhook secret from browser to server memory
 */

import { Router } from 'express';
import * as webhookState from '../services/webhook-state.js';

const router = Router();

/**
 * POST /sync_secret
 * Syncs the webhook secret from browser cookie to server memory
 * This enables HMAC verification for incoming webhooks
 */
router.post('/', (req, res) => {
  const { secret } = req.body;

  if (secret) {
    webhookState.setSecret(secret);
    res.json({ status: 'ok', message: 'Secret synced' });
  } else {
    webhookState.clearSecret();
    res.json({ status: 'ok', message: 'Secret cleared' });
  }
});

export default router;
