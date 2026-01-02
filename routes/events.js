/**
 * Server-Sent Events (SSE) route
 * Provides real-time webhook event streaming to clients
 */

const express = require('express');
const router = express.Router();
const sseManager = require('../services/sse-manager');

/**
 * GET /events
 * Establishes SSE connection for real-time event streaming
 */
router.get('/', (req, res) => {
  // Set SSE headers
  res.writeHead(200, {
    'Content-Type': 'text/event-stream',
    'Cache-Control': 'no-cache',
    Connection: 'keep-alive',
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Headers': 'Cache-Control',
  });

  // Register connection
  sseManager.addConnection(res);

  // Handle client disconnect
  req.on('close', () => {
    sseManager.removeConnection(res);
  });
});

module.exports = router;
