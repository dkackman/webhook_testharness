/**
 * Application configuration and constants
 */

var AppConfig = {
  // Debug mode - enables console logging
  // Enabled when:
  // - Running on localhost
  // - URL contains ?debug=true
  DEBUG: (function() {
    if (typeof window === 'undefined') return false;
    return window.location.hostname === 'localhost' ||
           window.location.hostname === '127.0.0.1' ||
           window.location.search.includes('debug=true');
  })(),

  // API endpoints
  API: {
    GET_COINS: '/proxy/get_coins',
    GET_TRANSACTION: '/proxy/get_transaction',
    GET_ASSETS: '/proxy/get_assets'
  },

  // Page routes
  ROUTES: {
    ASSETS: '/assets',
    COINS: '/coins',
    TRANSACTION: '/transaction'
  },

  // Timeout settings (in milliseconds)
  TIMEOUTS: {
    FETCH: 10000  // 10 seconds
  },

  // Error messages
  ERRORS: {
    FETCH_TIMEOUT: 'Request timed out. Please try again.',
    NETWORK_ERROR: 'Network error. Please check your connection.',
    GENERIC: 'An error occurred. Please try again.'
  }
};

// Make available globally
if (typeof window !== 'undefined') {
  window.AppConfig = AppConfig;
}

// Export for modules
if (typeof module !== 'undefined' && module.exports) {
  module.exports = AppConfig;
}
