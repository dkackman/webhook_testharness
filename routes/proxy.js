/**
 * Proxy routes for Sage API communication
 * Handles mTLS-authenticated requests to the Sage wallet backend
 */

import { Router } from 'express';
import asyncHandler from '../middleware/async-handler.js';
import * as sageApi from '../services/sage-api.js';
import * as webhookState from '../services/webhook-state.js';

const router = Router();

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

/**
 * GET /proxy/get_coins
 * Fetches coin details by IDs (comma-separated)
 */
router.get(
  '/get_coins',
  asyncHandler(async (req, res) => {
    const coinIdsParam = req.query.coin_ids;

    if (!coinIdsParam) {
      return res.status(400).json({
        error: 'Missing coin_ids query parameter',
      });
    }

    // Parse comma-separated coin IDs
    const coinIds = coinIdsParam
      .split(',')
      .map((id) => id.trim())
      .filter(Boolean);

    if (coinIds.length === 0) {
      return res.status(400).json({
        error: 'No valid coin IDs provided',
      });
    }

    try {
      const coinData = await sageApi.getCoinsByIds(coinIds);
      res.json(coinData);
    } catch (error) {
      console.error('Error getting coins:', error);
      res.status(500).json({
        error: 'Failed to get coins',
        message: error.message,
      });
    }
  })
);

/**
 * GET /proxy/get_assets
 * Fetches asset details by IDs (comma-separated)
 */
router.get(
  '/get_assets',
  asyncHandler(async (req, res) => {
    const assetIdsParam = req.query.asset_ids;

    if (!assetIdsParam) {
      return res.status(400).json({
        error: 'Missing asset_ids query parameter',
      });
    }

    // Parse comma-separated asset IDs
    const assetIds = assetIdsParam
      .split(',')
      .map((id) => id.trim())
      .filter(Boolean);

    if (assetIds.length === 0) {
      return res.status(400).json({
        error: 'No valid asset IDs provided',
      });
    }

    try {
      const assetData = await sageApi.getAssetsByIds(assetIds);
      res.json(assetData);
    } catch (error) {
      console.error('Error getting assets:', error);
      res.status(500).json({
        error: 'Failed to get assets',
        message: error.message,
      });
    }
  })
);

export default router;
