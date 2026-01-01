var express = require('express');
var router = express.Router();

/* GET home page. */
router.get('/', function (req, res, next) {
  res.render('index', { title: 'Sage Webhooks' });
});

/* GET transaction details page. */
router.get('/transaction', function (req, res, next) {
  res.render('transaction', { 
    title: 'Transaction Details',
    transaction_id: req.query.transaction_id || ''
  });
});

module.exports = router;
