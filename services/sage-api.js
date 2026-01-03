/**
 * Sage API client with mTLS support
 * Handles secure communication with the Sage wallet backend
 */

import https from 'node:https';
import fs from 'node:fs';
import config from '../config/index.js';

/**
 * Creates an HTTPS agent configured with mTLS certificates
 * @returns {https.Agent} Configured HTTPS agent
 * @throws {Error} If certificate configuration is missing or invalid
 */
export function createMTLSAgent() {
  const { certPath, keyPath, cert, key } = config.mtls;

  let certData, keyData;

  if (certPath && keyPath) {
    try {
      certData = fs.readFileSync(certPath, 'utf8');
      keyData = fs.readFileSync(keyPath, 'utf8');
    } catch (err) {
      throw new Error(`Failed to read certificate files: ${err.message}`);
    }
  } else if (cert && key) {
    certData = cert;
    keyData = key;
  } else {
    throw new Error(
      'Either CLIENT_CERT_PATH/CLIENT_KEY_PATH or CLIENT_CERT/CLIENT_KEY environment variables must be set'
    );
  }

  return new https.Agent({
    cert: certData,
    key: keyData,
    rejectUnauthorized: false, // Set to true to verify server certificate
  });
}

/**
 * Makes an HTTPS request to the Sage API
 * @param {Object} options - Request options
 * @param {string} options.path - API endpoint path
 * @param {string} [options.method='POST'] - HTTP method
 * @param {Object} [options.body] - Request body (will be JSON stringified)
 * @returns {Promise<Object>} Parsed JSON response
 */
function makeRequest({ path, method = 'POST', body = null }) {
  return new Promise((resolve, reject) => {
    const agent = createMTLSAgent();
    const postData = body ? JSON.stringify(body) : '';

    const options = {
      hostname: config.sageApi.hostname,
      port: config.sageApi.port,
      path,
      method,
      agent,
      headers: {
        'Content-Type': 'application/json',
        ...(postData && { 'Content-Length': Buffer.byteLength(postData) }),
      },
    };

    const req = https.request(options, (res) => {
      let data = '';

      res.on('data', (chunk) => {
        data += chunk;
      });

      res.on('end', () => {
        try {
          const jsonData = JSON.parse(data);
          resolve({
            statusCode: res.statusCode,
            data: jsonData,
          });
        } catch {
          reject(new Error(`Failed to parse response: ${data}`));
        }
      });
    });

    req.on('error', (err) => {
      reject(err);
    });

    if (postData) {
      req.write(postData);
    }
    req.end();
  });
}

/**
 * Register a webhook with the Sage API
 * @param {Object} webhookData - Webhook registration data
 * @param {string} webhookData.url - Webhook callback URL
 * @param {string} [webhookData.secret] - Optional HMAC secret
 * @returns {Promise<Object>} Registration response with webhook_id
 */
export async function registerWebhook(webhookData) {
  const result = await makeRequest({
    path: '/register_webhook',
    body: webhookData,
  });

  return {
    ...result.data,
    proxy_status: 'success',
    proxy_message: `Connected to webhook server successfully (HTTP ${result.statusCode})`,
  };
}

/**
 * Unregister a webhook from the Sage API
 * @param {Object} webhookData - Webhook data
 * @param {string} webhookData.webhook_id - ID of webhook to unregister
 * @returns {Promise<Object>} Unregistration response
 */
export async function unregisterWebhook(webhookData) {
  const result = await makeRequest({
    path: '/unregister_webhook',
    body: webhookData,
  });

  return {
    ...result.data,
    proxy_status: 'success',
    proxy_message: `Disconnected from webhook server successfully (HTTP ${result.statusCode})`,
  };
}

/**
 * Get transaction details by ID
 * @param {string} transactionId - Transaction ID to fetch
 * @returns {Promise<Object>} Transaction data
 */
export async function getTransactionById(transactionId) {
  const result = await makeRequest({
    path: '/get_transaction_by_id',
    body: { transaction_id: transactionId },
  });

  return result.data;
}

/**
 * Get coin details by IDs
 * @param {string[]} coinIds - Array of coin IDs to fetch
 * @returns {Promise<Object>} Coin data
 */
export async function getCoinsByIds(coinIds) {
  const result = await makeRequest({
    path: '/get_coins_by_ids',
    body: { coin_ids: coinIds },
  });

  return result.data;
}

/**
 * Get asset details by IDs
 * @param {string[]} assetIds - Array of asset IDs to fetch
 * @returns {Promise<Object>} Asset data
 */
export async function getAssetsByIds(assetIds) {
  const result = await makeRequest({
    path: '/get_assets_by_ids',
    body: { asset_ids: assetIds },
  });

  return result.data;
}

/**
 * Get NFT details by launcher IDs
 * @param {string[]} launcherIds - Array of launcher IDs to fetch
 * @returns {Promise<Object>} NFT data
 */
export async function getNFTsByIds(launcherIds) {
  const result = await makeRequest({
    path: '/get_nfts_by_ids',
    body: { launcher_ids: launcherIds },
  });

  return result.data;
}
