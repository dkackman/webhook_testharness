/**
 * Global SSE (Server-Sent Events) Connection Manager
 * Maintains a persistent connection across page navigation
 * Events are automatically saved to localStorage via EventStore
 */

var SSEManager = (function () {
  'use strict';

  var eventSource = null;
  var reconnectTimer = null;
  var heartbeatTimeout = null;
  var listeners = [];
  var isConnected = false;

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
   * Resets the heartbeat timeout timer
   * Called whenever any message is received from the server
   */
  function resetHeartbeatTimer() {
    // Clear existing timer
    if (heartbeatTimeout) {
      clearTimeout(heartbeatTimeout);
      heartbeatTimeout = null;
    }

    // Set new timer
    heartbeatTimeout = setTimeout(function () {
      logger.warn(
        'SSE heartbeat timeout - no messages received for ' + AppConfig.SSE.HEARTBEAT_TIMEOUT + 'ms'
      );

      // Close connection and trigger reconnect
      if (eventSource) {
        eventSource.close();
        eventSource = null;
      }

      notifyListeners('disconnected');

      // Attempt reconnection
      if (!reconnectTimer) {
        logger.log('Reconnecting after heartbeat timeout...');
        reconnectTimer = setTimeout(function () {
          reconnectTimer = null;
          connect();
        }, AppConfig.SSE.RECONNECT_DELAY);
      }
    }, AppConfig.SSE.HEARTBEAT_TIMEOUT);
  }

  /**
   * Clears the heartbeat timeout timer
   */
  function clearHeartbeatTimer() {
    if (heartbeatTimeout) {
      clearTimeout(heartbeatTimeout);
      heartbeatTimeout = null;
    }
  }

  /**
   * Handles incoming webhook events
   * @param {Object} event - SSE event object
   */
  function handleWebhookEvent(event) {
    // Reset heartbeat timer on any message
    resetHeartbeatTimer();
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
      sessionStorage.setItem(AppConfig.SSE.SESSION_KEY, 'true');
    } catch (e) {
      logger.warn('sessionStorage not available:', e);
    }

    eventSource = new EventSource(AppConfig.SSE.EVENTS_URL);

    eventSource.onopen = function () {
      logger.log('SSE connection established');
      notifyListeners('connected');

      // Clear any pending reconnect
      if (reconnectTimer) {
        clearTimeout(reconnectTimer);
        reconnectTimer = null;
      }

      // Start heartbeat monitoring
      resetHeartbeatTimer();
    };

    // Reset heartbeat on any message (including keepalives)
    eventSource.onmessage = function () {
      resetHeartbeatTimer();
    };

    eventSource.addEventListener('webhook', handleWebhookEvent);

    eventSource.onerror = function (error) {
      // Clear heartbeat timer on error
      clearHeartbeatTimer();
      logger.error('SSE connection error:', error);
      notifyListeners('disconnected');

      // Close existing connection
      if (eventSource) {
        eventSource.close();
        eventSource = null;
      }

      // Attempt reconnection
      if (!reconnectTimer) {
        logger.log('Reconnecting in ' + AppConfig.SSE.RECONNECT_DELAY + 'ms...');
        reconnectTimer = setTimeout(function () {
          reconnectTimer = null;
          connect();
        }, AppConfig.SSE.RECONNECT_DELAY);
      }
    };
  }

  /**
   * Closes SSE connection
   */
  function disconnect() {
    logger.log('Closing SSE connection');

    // Clear all timers
    if (reconnectTimer) {
      clearTimeout(reconnectTimer);
      reconnectTimer = null;
    }

    clearHeartbeatTimer();

    if (eventSource) {
      eventSource.close();
      eventSource = null;
    }

    notifyListeners('disconnected');

    // Mark session as inactive
    try {
      sessionStorage.removeItem(AppConfig.SSE.SESSION_KEY);
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
        wasActive = sessionStorage.getItem(AppConfig.SSE.SESSION_KEY) === 'true';
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
