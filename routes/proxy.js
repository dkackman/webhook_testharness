/**
 * Proxy routes for Sage API communication
 * Handles mTLS-authenticated requests to the Sage wallet backend
 */

const express = require('express');
const router = express.Router();
const asyncHandler = require('../middleware/async-handler');
const sageApi = require('../services/sage-api');
const webhookState = require('../services/webhook-state');

/**
 * POST /proxy/register_webhook
 * Registers a webhook with the Sage API
 */
router.post(
  '/register_webhook',
  asyncHandler(async (req, res) => {
    // Store the secret if provided
    webhookState.setSecret(req.body.secret || null);

    try {
      const result = await sageApi.registerWebhook(req.body);
      res.json(result);
    } catch (error) {
      console.error('Error in register_webhook handler:', error);
      res.status(500).json({
        proxy_status: 'error',
        proxy_message: 'Failed to register webhook',
        error: error.message,
        details: error.code || 'Configuration or certificate error - check server logs',
      });
    }
  })
);

/**
 * POST /proxy/unregister_webhook
 * Unregisters a webhook from the Sage API
 */
router.post(
  '/unregister_webhook',
  asyncHandler(async (req, res) => {
    // Clear the secret
    webhookState.clearSecret();

    try {
      const result = await sageApi.unregisterWebhook(req.body);
      res.json(result);
    } catch (error) {
      console.error('Error in unregister_webhook handler:', error);
      res.status(500).json({
        proxy_status: 'error',
        proxy_message: 'Failed to unregister webhook',
        error: error.message,
        details: error.code || 'Configuration or certificate error - check server logs',
      });
    }
  })
);

/**
 * GET /proxy/get_transaction
 * Fetches transaction details by ID
 */
router.get(
  '/get_transaction',
  asyncHandler(async (req, res) => {
    const transactionId = req.query.transaction_id;

    if (!transactionId) {
      return res.status(400).json({
        error: 'Missing transaction_id query parameter',
      });
    }

    try {
      const transactionData = await sageApi.getTransactionById(transactionId);
      res.json(transactionData);
    } catch (error) {
      console.error('Error getting transaction:', error);
      res.status(500).json({
        error: 'Failed to get transaction',
        message: error.message,
      });
    }
  })
);

module.exports = router;
