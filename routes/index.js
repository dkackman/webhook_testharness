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

export default router;
