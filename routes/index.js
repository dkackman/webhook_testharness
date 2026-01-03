/**
 * View routes
 * Renders HTML pages using Pug templates
 */

import { Router } from 'express';

const router = Router();

/**
 * GET /
 * Renders the main webhook dashboard
 */
router.get('/', (req, res) => {
  res.render('index', { title: 'Sage Webhooks' });
});

/**
 * GET /transaction
 * Renders the transaction details page
 */
router.get('/transaction', (req, res) => {
  res.render('transaction', {
    title: 'Transaction Details',
    transaction_id: req.query.transaction_id || '',
  });
});

/**
 * GET /coins
 * Renders the coin details page
 */
router.get('/coins', (req, res) => {
  res.render('coins', {
    title: 'Coin Details',
    coin_ids: req.query.coin_ids || '',
  });
});

/**
 * GET /assets
 * Renders the asset details page
 */
router.get('/assets', (req, res) => {
  res.render('assets', {
    title: 'Asset Details',
    asset_ids: req.query.asset_ids || '',
  });
});

/**
 * GET /nfts
 * Renders the NFT details page
 */
router.get('/nfts', (req, res) => {
  res.render('nfts', {
    title: 'NFT Details',
    launcher_ids: req.query.launcher_ids || '',
  });
});

export default router;
