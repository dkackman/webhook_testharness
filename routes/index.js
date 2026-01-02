/**
 * View routes
 * Renders HTML pages using Pug templates
 */

const express = require('express');
const router = express.Router();

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

module.exports = router;
