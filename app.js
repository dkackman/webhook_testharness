/**
 * Express application setup
 * Configures middleware, routes, and error handling
 */

const express = require('express');
const path = require('path');
const cookieParser = require('cookie-parser');
const logger = require('morgan');

// Import routes
const indexRouter = require('./routes/index');
const proxyRouter = require('./routes/proxy');
const webhookRouter = require('./routes/webhook');
const eventsRouter = require('./routes/events');
const syncRouter = require('./routes/sync');

// Import error handlers
const { notFoundHandler, errorHandler } = require('./middleware/error-handler');

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

module.exports = app;
