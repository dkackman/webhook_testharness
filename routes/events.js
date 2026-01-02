/**
 * Server-Sent Events (SSE) route
 * Provides real-time webhook event streaming to clients
 */

import { Router } from 'express';
import sseManager from '../services/sse-manager.js';

const router = Router();

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

export default router;
