/**
 * Centralized configuration management
 * Loads environment variables and provides typed config object
 */

require('dotenv').config();

const config = {
  env: process.env.NODE_ENV || 'development',
  port: parseInt(process.env.PORT, 10) || 3000,

  // mTLS certificate configuration
  mtls: {
    certPath: process.env.CLIENT_CERT_PATH,
    keyPath: process.env.CLIENT_KEY_PATH,
    cert: process.env.CLIENT_CERT,
    key: process.env.CLIENT_KEY,
  },

  // Sage API configuration
  sageApi: {
    hostname: process.env.SAGE_API_HOST || 'localhost',
    port: parseInt(process.env.SAGE_API_PORT, 10) || 9257,
  },

  // Webhook configuration
  webhook: {
    callbackUrl: process.env.WEBHOOK_CALLBACK_URL || 'http://localhost:3000/sage_hook',
  },
};

/**
 * Validates that required mTLS configuration is present
 * @returns {boolean} True if valid configuration exists
 */
config.hasMTLSConfig = function () {
  return (
    (this.mtls.certPath && this.mtls.keyPath) ||
    (this.mtls.cert && this.mtls.key)
  );
};

module.exports = config;
