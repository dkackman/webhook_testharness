/**
 * Global SSE (Server-Sent Events) Connection Manager
 * Maintains a persistent connection across page navigation
 * Events are automatically saved to localStorage via EventStore
 */

var SSEManager = (function () {
  'use strict';

  var eventSource = null;
  var reconnectTimer = null;
  var listeners = [];
  var isConnected = false;

  var CONFIG = {
    EVENTS_URL: '/events',
    RECONNECT_DELAY: 3000,
    SESSION_KEY: 'sse_session_active',
  };

  /**
   * Notifies all registered listeners of a status change
   * @param {string} status - Connection status: 'connected', 'connecting', 'disconnected'
   */
  function notifyListeners(status) {
    isConnected = status === 'connected';
    listeners.forEach(function (callback) {
      try {
        callback(status);
      } catch (e) {
        logger.error('Error in SSE listener:', e);
      }
    });
  }

  /**
   * Handles incoming webhook events
   * @param {Object} event - SSE event object
   */
  function handleWebhookEvent(event) {
    try {
      var eventData = {
        id: Date.now(),
        event: 'webhook',
        data: event.data,
        timestamp: new Date().toISOString(),
      };

      // Save to localStorage immediately
      if (window.EventStore && EventStore.isEnabled()) {
        var currentEvents = EventStore.loadEvents();
        EventStore.addEvent(currentEvents, eventData);

        logger.log('Webhook event received and saved to localStorage');
      }

      // Notify listeners (for UI updates if on main page)
      notifyListeners('webhook-event');

      // Dispatch custom event for pages to listen to
      if (typeof window !== 'undefined') {
        var customEvent = new CustomEvent('webhook-received', {
          detail: eventData,
        });
        window.dispatchEvent(customEvent);
      }
    } catch (e) {
      logger.error('Error handling webhook event:', e);
    }
  }

  /**
   * Establishes SSE connection
   */
  function connect() {
    if (eventSource) {
      logger.log('SSE connection already exists');
      return;
    }

    logger.log('Establishing SSE connection...');
    notifyListeners('connecting');

    // Mark session as active
    try {
      sessionStorage.setItem(CONFIG.SESSION_KEY, 'true');
    } catch (e) {
      logger.warn('sessionStorage not available:', e);
    }

    eventSource = new EventSource(CONFIG.EVENTS_URL);

    eventSource.onopen = function () {
      logger.log('SSE connection established');
      notifyListeners('connected');

      // Clear any pending reconnect
      if (reconnectTimer) {
        clearTimeout(reconnectTimer);
        reconnectTimer = null;
      }
    };

    eventSource.addEventListener('webhook', handleWebhookEvent);

    eventSource.onerror = function (error) {
      logger.error('SSE connection error:', error);
      notifyListeners('disconnected');

      // Close existing connection
      if (eventSource) {
        eventSource.close();
        eventSource = null;
      }

      // Attempt reconnection
      if (!reconnectTimer) {
        logger.log('Reconnecting in ' + CONFIG.RECONNECT_DELAY + 'ms...');
        reconnectTimer = setTimeout(function () {
          reconnectTimer = null;
          connect();
        }, CONFIG.RECONNECT_DELAY);
      }
    };
  }

  /**
   * Closes SSE connection
   */
  function disconnect() {
    logger.log('Closing SSE connection');

    if (reconnectTimer) {
      clearTimeout(reconnectTimer);
      reconnectTimer = null;
    }

    if (eventSource) {
      eventSource.close();
      eventSource = null;
    }

    notifyListeners('disconnected');

    // Mark session as inactive
    try {
      sessionStorage.removeItem(CONFIG.SESSION_KEY);
    } catch (_e) {
      // Ignore
    }
  }

  /**
   * Registers a listener for connection status changes
   * @param {Function} callback - Called with status string
   * @returns {Function} Unsubscribe function
   */
  function onStatusChange(callback) {
    if (typeof callback !== 'function') {
      logger.error('onStatusChange: callback must be a function');
      return function () {};
    }

    listeners.push(callback);

    // Immediately notify of current status
    if (isConnected) {
      callback('connected');
    } else if (eventSource) {
      callback('connecting');
    } else {
      callback('disconnected');
    }

    // Return unsubscribe function
    return function () {
      var index = listeners.indexOf(callback);
      if (index > -1) {
        listeners.splice(index, 1);
      }
    };
  }

  /**
   * Checks if connection is active
   * @returns {boolean}
   */
  function isActive() {
    return isConnected;
  }

  /**
   * Gets current connection status
   * @returns {string} 'connected', 'connecting', or 'disconnected'
   */
  function getStatus() {
    if (isConnected) return 'connected';
    if (eventSource) return 'connecting';
    return 'disconnected';
  }

  // Auto-connect when script loads if on main page or session was active
  if (typeof window !== 'undefined') {
    window.addEventListener('load', function () {
      // Check if we're on the main page or if session was previously active
      var isMainPage = window.location.pathname === '/';
      var wasActive = false;

      try {
        wasActive = sessionStorage.getItem(CONFIG.SESSION_KEY) === 'true';
      } catch (_e) {
        // Ignore
      }

      if (isMainPage || wasActive) {
        logger.log(
          'Auto-connecting SSE (main page: ' + isMainPage + ', was active: ' + wasActive + ')'
        );
        connect();
      }
    });

    // Keep connection alive during navigation (don't close on unload)
    // Only close if user explicitly navigates away from the domain
    window.addEventListener('beforeunload', function () {
      // Don't disconnect - let the connection persist
      logger.log('Page unloading, keeping SSE connection alive');
    });
  }

  // Public API
  return {
    connect: connect,
    disconnect: disconnect,
    onStatusChange: onStatusChange,
    isActive: isActive,
    getStatus: getStatus,
  };
})();

// Make available globally
if (typeof window !== 'undefined') {
  window.SSEManager = SSEManager;
}

// Export for modules
if (typeof module !== 'undefined' && module.exports) {
  module.exports = SSEManager;
}
