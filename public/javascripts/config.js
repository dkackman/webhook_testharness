/**
 * Application configuration and constants
 */

var AppConfig = {
  // Debug mode - enables console logging
  // Enabled when:
  // - Running on localhost
  // - URL contains ?debug=true
  DEBUG: (function () {
    if (typeof window === 'undefined') return false;
    return (
      window.location.hostname === 'localhost' ||
      window.location.hostname === '127.0.0.1' ||
      window.location.search.includes('debug=true')
    );
  })(),

  // Webhook configuration
  WEBHOOK: {
    URL: 'http://localhost:3000/sage_hook',
  },

  // Server-Sent Events (SSE) configuration
  SSE: {
    EVENTS_URL: '/events',
    RECONNECT_DELAY: 3000, // ms
    SESSION_KEY: 'sse_session_active',
  },

  // Cache configuration
  CACHE: {
    TTL: 5 * 60 * 1000, // 5 minutes
    MAX_SIZE: 50, // Maximum number of cached entries
  },

  // API endpoints
  API: {
    GET_COINS: '/proxy/get_coins',
    GET_TRANSACTION: '/proxy/get_transaction',
    GET_ASSETS: '/proxy/get_assets',
    GET_NFTS: '/proxy/get_nfts',
  },

  // Page routes
  ROUTES: {
    ASSETS: '/assets',
    COINS: '/coins',
    TRANSACTION: '/transaction',
    NFTS: '/nfts',
  },

  // Timeout settings (in milliseconds)
  TIMEOUTS: {
    FETCH: 10000, // 10 seconds
  },

  // Error messages
  ERRORS: {
    FETCH_TIMEOUT: 'Request timed out. Please try again.',
    NETWORK_ERROR: 'Network error. Please check your connection.',
    GENERIC: 'An error occurred. Please try again.',
  },

  // Event persistence settings
  EVENT_STORAGE: {
    ENABLED: true, // Enable event persistence across page loads
    MAX_EVENTS: 100, // Maximum number of events to store (FIFO)
    STORAGE_KEY: 'webhook_events', // localStorage key
    AUTO_RESTORE: true, // Auto-restore events on page load
  },
};

// Make available globally
if (typeof window !== 'undefined') {
  window.AppConfig = AppConfig;
}

// Export for modules
if (typeof module !== 'undefined' && module.exports) {
  module.exports = AppConfig;
}
