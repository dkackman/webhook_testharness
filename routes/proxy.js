/**
 * Proxy routes for Sage API communication
 * Handles mTLS-authenticated requests to the Sage wallet backend
 */

import { Router } from 'express';
import asyncHandler from '../middleware/async-handler.js';
import { ApiError } from '../middleware/error-handler.js';
import * as sageApi from '../services/sage-api.js';
import * as webhookState from '../services/webhook-state.js';

const router = Router();

/**
 * Parses comma-separated IDs from query parameter
 * @param {string} param - Query parameter value
 * @param {string} paramName - Parameter name for error messages
 * @returns {string[]} Array of trimmed, non-empty IDs
 * @throws {ApiError} If parameter is missing or empty
 */
function parseIdList(param, paramName) {
  if (!param) {
    throw new ApiError(400, `Missing ${paramName} query parameter`);
  }

  const ids = param
    .split(',')
    .map((id) => id.trim())
    .filter(Boolean);

  if (ids.length === 0) {
    throw new ApiError(400, `No valid ${paramName} provided`);
  }

  return ids;
}

/**
 * POST /proxy/register_webhook
 * Registers a webhook with the Sage API
 */
router.post(
  '/register_webhook',
  asyncHandler(async (req, res) => {
    webhookState.setSecret(req.body.secret || null);
    const result = await sageApi.registerWebhook(req.body);
    res.json(result);
  })
);

/**
 * POST /proxy/unregister_webhook
 * Unregisters a webhook from the Sage API
 */
router.post(
  '/unregister_webhook',
  asyncHandler(async (req, res) => {
    webhookState.clearSecret();
    const result = await sageApi.unregisterWebhook(req.body);
    res.json(result);
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
      throw new ApiError(400, 'Missing transaction_id query parameter');
    }

    const transactionData = await sageApi.getTransactionById(transactionId);
    res.json(transactionData);
  })
);

/**
 * GET /proxy/get_coins
 * Fetches coin details by IDs (comma-separated)
 */
router.get(
  '/get_coins',
  asyncHandler(async (req, res) => {
    const coinIds = parseIdList(req.query.coin_ids, 'coin_ids');
    const coinData = await sageApi.getCoinsByIds(coinIds);
    res.json(coinData);
  })
);

/**
 * GET /proxy/get_assets
 * Fetches asset details by IDs (comma-separated)
 */
router.get(
  '/get_assets',
  asyncHandler(async (req, res) => {
    const assetIds = parseIdList(req.query.asset_ids, 'asset_ids');
    const assetData = await sageApi.getAssetsByIds(assetIds);
    res.json(assetData);
  })
);

/**
 * GET /proxy/get_nfts
 * Fetches NFT details by launcher IDs (comma-separated)
 */
router.get(
  '/get_nfts',
  asyncHandler(async (req, res) => {
    const launcherIds = parseIdList(req.query.launcher_ids, 'launcher_ids');
    const nftData = await sageApi.getNFTsByIds(launcherIds);
    res.json(nftData);
  })
);

export default router;
