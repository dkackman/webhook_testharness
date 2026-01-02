/**
 * Secret sync route
 * Syncs webhook secret from browser to server memory
 */

const express = require('express');
const router = express.Router();
const webhookState = require('../services/webhook-state');

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

module.exports = router;
