# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

This is a web-based test harness for receiving and testing Sage Wallet webhooks. It features:

- mTLS (mutual TLS) authentication for secure communication with the Sage wallet backend
- HMAC-SHA256 signature verification for webhook authenticity
- Real-time event streaming using Server-Sent Events (SSE)
- Event persistence and restoration using localStorage
- Multiple entity detail pages (transactions, coins, assets, NFTs)

## Development Commands

```bash
# Start the server
npm start
# or
pnpm start

# Development mode with auto-reload
npm run dev
# or
pnpm run dev

# Run tests
npm test
# or
pnpm test

# Run a single test file
npx mocha test/unit/eventStore.test.js

# Linting
npm run lint           # Check for issues
npm run lint:fix       # Auto-fix issues

# Formatting
npm run format         # Format all files
npm run format:check   # Check formatting
```

## Configuration

The application uses environment variables configured in a `.env` file:

### mTLS Certificate Configuration (Required)

Two options for providing certificates:

**Option 1: File paths**

```env
CLIENT_CERT_PATH=/path/to/wallet.crt
CLIENT_KEY_PATH=/path/to/wallet.key
```

**Option 2: Direct content**

```env
CLIENT_CERT="-----BEGIN CERTIFICATE-----\n...\n-----END CERTIFICATE-----"
CLIENT_KEY="-----BEGIN PRIVATE KEY-----\n...\n-----END PRIVATE KEY-----"
```

### Optional Configuration

```env
PORT=3000                                    # Server port (default: 3000)
SAGE_API_HOST=localhost                      # Sage API hostname (default: localhost)
SAGE_API_PORT=9257                           # Sage API port (default: 9257)
WEBHOOK_CALLBACK_URL=http://localhost:3000/sage_hook  # Webhook callback URL
NODE_ENV=development                         # Environment
```

Configuration is centralized in `config/index.js`.

## Architecture

### Backend (Express.js with ES Modules)

**Entry Point**: `bin/www` → `app.js`

**Routes** (`routes/`):

- `/` - Main page (index.js)
- `/sage_hook` - Webhook receiver endpoint (webhook.js)
- `/proxy/*` - Proxies requests to Sage API with mTLS (proxy.js)
  - `/proxy/register_webhook` - Register webhook
  - `/proxy/unregister_webhook` - Unregister webhook
  - `/proxy/get_transaction`, `/proxy/get_coins`, `/proxy/get_assets`, `/proxy/get_nfts`
- `/events` - SSE endpoint for real-time updates (events.js)
- `/sync_secret` - Syncs webhook secret from client (sync.js)

**Services** (`services/`):

- `sage-api.js` - mTLS client for Sage API communication
  - Creates HTTPS agent with client certificates
  - Provides API methods: `registerWebhook`, `unregisterWebhook`, `getTransactionById`, `getCoinsByIds`, etc.
- `sse-manager.js` - SSE connection manager singleton
  - Manages active SSE connections
  - Broadcasts events to all connected clients
- `webhook-state.js` - In-memory webhook secret storage
  - Stores the current HMAC secret for signature verification

**Middleware** (`middleware/`):

- `hmac-verify.js` - HMAC-SHA256 signature verification
  - Validates `x-webhook-signature` header using webhook secret
  - Uses constant-time comparison to prevent timing attacks
- `async-handler.js` - Wraps async route handlers for error handling
- `error-handler.js` - Centralized error handling (404 and 500)

**Key Implementation Details**:

- **Middleware order matters**: The `/sage_hook` route uses `express.raw()` to preserve the raw body for HMAC verification, so it's mounted BEFORE `express.json()` in app.js:46.
- **mTLS setup**: `services/sage-api.js` creates an HTTPS agent with client certificates. It supports both file-based and inline certificate configuration.
- **Webhook secret synchronization**: The secret is stored in-memory on the server (`services/webhook-state.js`) and synchronized from the client via `/sync_secret` on page load.

### Frontend (Vanilla JS with jQuery)

**Architecture**: The frontend uses a modular approach without a framework.

**Core Modules** (`public/javascripts/`):

- `app.js` - Main application (WebhookApp namespace)
  - State management (webhookId, webhookSecret, events)
  - UI updates and event rendering
  - API calls for register/unregister
  - Cookie-based persistence for webhookId and webhookSecret
- `sseManager.js` - Global SSE connection manager
  - Persists across page navigation (singleton)
  - Automatically saves events to localStorage
  - Dispatches custom events (`webhook-received`) for app.js
- `eventStore.js` - localStorage persistence with FIFO limits
  - Configurable via `AppConfig.EVENT_STORAGE`
  - Enforces MAX_EVENTS limit (default: 100)
  - Provides export functionality
- `stateManager.js` - Client-side state management
- `pageModule.js` - Base class for detail pages (transaction, coins, assets, NFTs)
- `fetcher.js` - Fetch utility with error handling
- `jsonRenderer.js` - JSON syntax highlighting
- `validators.js` - Input validation utilities
- `logger.js` - Console logging wrapper

**Page Modules** (`public/javascripts/pages/`):

- `transaction.js`, `coins.js`, `assets.js`, `nfts.js`
- Each extends the `PageModule` base class
- Fetches data from `/proxy/*` endpoints and renders using Pug templates

**Key Implementation Details**:

- **SSE persistence**: `sseManager.js` maintains a persistent connection across page navigation by checking if a connection already exists before creating a new one.
- **Event storage**: Events are stored in localStorage with FIFO enforcement. When MAX_EVENTS is exceeded, oldest events are removed from both the array and the DOM.
- **Filter persistence**: The event filter state (`all`, `webhook`, `system`) is persisted to localStorage and restored on page load.
- **HMAC badge**: The UI shows HMAC status based on whether a secret is configured.

### Views (Pug Templates)

Located in `views/`:

- `layout.pug` - Base layout with Bootstrap 5
- `index.pug` - Main webhook testing interface
- `transaction.pug`, `coins.pug`, `assets.pug`, `nfts.pug` - Detail pages
- `mixins/` - Reusable Pug components

## Testing

Tests are in `test/` using Mocha + Chai + Sinon + JSDOM.

**Test Files**:

- `test/unit/eventStore.test.js` - localStorage persistence logic
- `test/unit/pageModule.test.js` - Page module base class
- `test/unit/validators.test.js` - Input validation

**Testing Considerations**:

- Frontend tests use JSDOM to simulate browser environment
- `test/setup.js` configures global test environment
- Tests mock localStorage and DOM APIs

## Common Workflows

### Adding a New Webhook Event Type

1. The backend already handles all event types generically
2. Update `Events.getEventTypeBadge()` in `public/javascripts/app.js` to add badge styling
3. If the event includes entity IDs (like transaction_id), add extraction logic in `Events.createEventElement()`
4. Create a new page module in `public/javascripts/pages/` if needed
5. Add the corresponding Pug template in `views/`

### Adding a New Sage API Endpoint

1. Add the API method to `services/sage-api.js` using `makeRequest()`
2. Add a route in `routes/proxy.js` that calls the new service method
3. Use the new endpoint from the frontend via `fetcher.js`

### Modifying HMAC Verification

- The verification logic is in `middleware/hmac-verify.js`
- The webhook secret is stored in `services/webhook-state.js`
- Client-side secret is synced via `/sync_secret` route

## Security Notes

- All Sage API communication uses mTLS with client certificates
- Webhook payloads are verified using HMAC-SHA256 when a secret is configured
- HMAC comparison uses `crypto.timingSafeEqual()` to prevent timing attacks
- The raw request body is preserved for HMAC calculation (using `express.raw()`)
- Entity detail page URLs are validated to prevent XSS attacks (app.js:291-303)

## Dependencies

**Runtime**:

- express 5.x
- pug (templating)
- cookie-parser
- dotenv (environment variables)

**Development**:

- mocha, chai, sinon (testing)
- eslint, prettier (code quality)
- jsdom (browser simulation for tests)

**Frontend**:

- Bootstrap 5.3 (CDN)
- jQuery 3.7 (CDN)
- Bootstrap Icons (CDN)
