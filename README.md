# Webhook Test Harness

A web-based test harness for receiving and testing [Sage Wallet(https://sagewallet.net/)] webhooks with mTLS (mutual TLS) authentication and HMAC signature verification.

## Prerequisites

- Node.js (v12 or higher)
- npm or pnpm
- Client SSL certificates for mTLS authentication

## Setup

1. **Clone the repository** (or navigate to the project directory)

2. **Install dependencies:**

   ```bash
   npm install
   # or
   pnpm install
   ```

3. **Configure environment variables:**
   
   Create a `.env` file in the root directory with your mTLS certificate configuration:
   
   ```env
   # Option 1: Use certificate file paths
   CLIENT_CERT_PATH=/path/to/client-cert.pem
   CLIENT_KEY_PATH=/path/to/client-key.pem
   
   # Option 2: Use certificate content directly
   CLIENT_CERT="-----BEGIN CERTIFICATE-----\n...\n-----END CERTIFICATE-----"
   CLIENT_KEY="-----BEGIN PRIVATE KEY-----\n...\n-----END PRIVATE KEY-----"
   ```

4. **Configure webhook server settings:**
   
   By default, the proxy connects to `localhost:9257`. Update the hostname and port in `app.js` if your webhook server is located elsewhere:
   
   ```javascript
   const options = {
     hostname: 'localhost',
     port: 9257,
     // ...
   };
   ```

## Running the Application

Start the server:

```bash
npm start
# or
pnpm start
```

The application will start on `http://localhost:3000` (or the port specified in the `PORT` environment variable).

## Usage

Make sure [sage wallet from this branch](https://github.com/dkackman/sage/tree/webhooks) is running and has webhooks configured.

1. **Open the web interface** at `http://localhost:3000`

2. **Configure webhook secret (optional):**
   - Enter a secret in the "Webhook Secret" field to enable HMAC signature verification
   - Leave blank if signatures are not required

3. **Register a webhook:**
   - Click "Register Webhook" to register the webhook endpoint with the remote server
   - The app displays the connection status and webhook ID

4. **Monitor webhook events:**
   - Incoming webhooks appear in real-time in the "Live Webhook Events" section
   - Each event shows the timestamp, payload, and verification status

5. **Unregister the webhook:**
   - Click "Unregister Webhook" to remove the webhook registration

## How It Works

- **Webhook Endpoint**: `/sage_hook` - Receives incoming webhook POST requests
- **Proxy Endpoints**:
  - `/proxy/register_webhook` - Registers webhook with mTLS server
  - `/proxy/unregister_webhook` - Unregisters webhook
- **SSE Endpoint**: `/events` - Server-Sent Events stream for real-time updates

The application uses cookies to persist the webhook ID and secret across page refreshes.

## Security

- Webhooks are validated using HMAC-SHA256 signatures when a secret is configured
- mTLS certificates secure communication with the webhook server
- The local sage wallet keys need to be set up properly in a `.env` file for mTLS to work.

## Troubleshooting

- **Connection errors**: Verify your certificate paths/content in `.env`
- **mTLS failures**: Ensure certificates are valid and authorized by the webhook server
- **Port conflicts**: Change the port using `PORT=3001 npm start`
