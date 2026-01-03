/**
 * Webhook state management
 * Stores the current webhook secret for HMAC verification
 */

let webhookSecret = null;

/**
 * Get the current webhook secret
 * @returns {string|null} Current secret or null if not set
 */
export function getSecret() {
  return webhookSecret;
}

/**
 * Set the webhook secret
 * @param {string|null} secret - Secret to set, or null to clear
 */
export function setSecret(secret) {
  webhookSecret = secret || null;
}

/**
 * Clear the webhook secret
 */
export function clearSecret() {
  webhookSecret = null;
}
