/**
 * Webhook state management
 * Stores the current webhook secret for HMAC verification
 */

let webhookSecret = null;

module.exports = {
  /**
   * Get the current webhook secret
   * @returns {string|null} Current secret or null if not set
   */
  getSecret() {
    return webhookSecret;
  },

  /**
   * Set the webhook secret
   * @param {string|null} secret - Secret to set, or null to clear
   */
  setSecret(secret) {
    webhookSecret = secret || null;
  },

  /**
   * Check if a secret is configured
   * @returns {boolean} True if secret is set
   */
  hasSecret() {
    return webhookSecret !== null;
  },

  /**
   * Clear the webhook secret
   */
  clearSecret() {
    webhookSecret = null;
  },
};
