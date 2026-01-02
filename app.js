/**
 * Express application setup
 * Configures middleware, routes, and error handling
 */

import express from 'express';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import cookieParser from 'cookie-parser';
import logger from 'morgan';

// Import routes
import indexRouter from './routes/index.js';
import proxyRouter from './routes/proxy.js';
import webhookRouter from './routes/webhook.js';
import eventsRouter from './routes/events.js';
import syncRouter from './routes/sync.js';

// Import error handlers
import { notFoundHandler, errorHandler } from './middleware/error-handler.js';

// ES module __dirname equivalent
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Create Express app
const app = express();

// View engine setup
app.set('views', path.join(__dirname, 'views'));
app.set('view engine', 'pug');

// Logging
app.use(logger('dev'));

// Parse URL-encoded bodies
app.use(express.urlencoded({ extended: false }));

// Parse cookies
app.use(cookieParser());

// Serve static files
app.use(express.static(path.join(__dirname, 'public')));

// Webhook route (must be before express.json() to use raw body for HMAC)
app.use('/sage_hook', webhookRouter);

// Secret sync route (needs JSON parsing)
app.use('/sync_secret', express.json(), syncRouter);

// JSON body parser for remaining routes
app.use(express.json());

// Mount routes
app.use('/', indexRouter);
app.use('/proxy', proxyRouter);
app.use('/events', eventsRouter);

// Error handling
app.use(notFoundHandler);
app.use(errorHandler);

export default app;
