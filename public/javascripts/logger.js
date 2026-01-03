/**
 * Logging utility that respects DEBUG mode
 * Only logs to console when DEBUG is enabled
 */

/**
 * Creates a logger instance
 * @returns {Object} Logger with error, warn, info, log methods
 */
function createLogger() {
  var isDebug = function() {
    return window.AppConfig && window.AppConfig.DEBUG;
  };

  return {
    /**
     * Logs an error message (only in debug mode)
     * @param {...*} args - Arguments to log
     */
    error: function() {
      if (isDebug()) {
        console.error.apply(console, arguments);
      }
    },

    /**
     * Logs a warning message (only in debug mode)
     * @param {...*} args - Arguments to log
     */
    warn: function() {
      if (isDebug()) {
        console.warn.apply(console, arguments);
      }
    },

    /**
     * Logs an info message (only in debug mode)
     * @param {...*} args - Arguments to log
     */
    info: function() {
      if (isDebug()) {
        console.info.apply(console, arguments);
      }
    },

    /**
     * Logs a general message (only in debug mode)
     * @param {...*} args - Arguments to log
     */
    log: function() {
      if (isDebug()) {
        console.log.apply(console, arguments);
      }
    },

    /**
     * Logs a debug message (only in debug mode)
     * @param {...*} args - Arguments to log
     */
    debug: function() {
      if (isDebug()) {
        console.debug.apply(console, arguments);
      }
    },

    /**
     * Returns whether debug mode is enabled
     * @returns {boolean}
     */
    isDebugEnabled: function() {
      return isDebug();
    }
  };
}

// Create global logger instance
var logger = createLogger();

// Make available globally
if (typeof window !== 'undefined') {
  window.logger = logger;
  window.createLogger = createLogger;
}

// Export for modules
if (typeof module !== 'undefined' && module.exports) {
  module.exports = { logger: logger, createLogger: createLogger };
}
