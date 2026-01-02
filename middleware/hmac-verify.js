/**
 * HMAC signature verification middleware
 * Verifies webhook signatures using HMAC-SHA256
 */

const crypto = require('crypto');
const webhookState = require('../services/webhook-state');

/**
 * Verification result object
 * @typedef {Object} VerificationResult
 * @property {boolean} isValid - Whether signature is valid
 * @property {string} status - Human-readable status message
 */

/**
 * Verify HMAC signature of a webhook request
 * @param {Buffer} body - Raw request body
 * @param {string} signature - Signature header value (format: "sha256=<hex>")
 * @returns {VerificationResult} Verification result
 */
function verifySignature(body, signature) {
  const secret = webhookState.getSecret();

  // No secret configured - verification not required
  if (!secret) {
    return {
      isValid: true,
      status: 'No signature required',
    };
  }

  // Secret configured but no signature provided
  if (!signature) {
    return {
      isValid: false,
      status: '❌ FAILED: Missing signature header',
    };
  }

  // Parse signature format
  const signatureParts = signature.split('=');
  if (signatureParts.length !== 2 || signatureParts[0] !== 'sha256') {
    return {
      isValid: false,
      status: '❌ FAILED: Invalid signature format',
    };
  }

  const receivedSignature = signatureParts[1];

  // Compute expected signature
  const hmac = crypto.createHmac('sha256', secret);
  hmac.update(body);
  const expectedSignature = hmac.digest('hex');

  // Constant-time comparison
  const isValid = crypto.timingSafeEqual(
    Buffer.from(receivedSignature),
    Buffer.from(expectedSignature)
  );

  if (isValid) {
    return {
      isValid: true,
      status: '✅ VERIFIED',
    };
  }

  console.error('Webhook verification failed: Signature mismatch');
  console.error('Expected:', expectedSignature);
  console.error('Received:', receivedSignature);

  return {
    isValid: false,
    status: '❌ FAILED: Signature mismatch',
  };
}

module.exports = {
  verifySignature,
};
