/**
 * Webhook Test Harness - Client Application
 * Consolidated module using revealing module pattern
 */

var WebhookApp = (function ($) {
  'use strict';

  // ============================================================
  // Cookie Utilities
  // ============================================================

  var Cookies = {
    set: function (name, value, days) {
      days = days || 365;
      var expires = new Date(Date.now() + days * 864e5).toUTCString();
      document.cookie = name + '=' + encodeURIComponent(value) + '; expires=' + expires + '; path=/';
    },

    get: function (name) {
      var value = '; ' + document.cookie;
      var parts = value.split('; ' + name + '=');
      if (parts.length === 2) {
        return decodeURIComponent(parts.pop().split(';').shift());
      }
      return null;
    },

    delete: function (name) {
      document.cookie = name + '=; expires=Thu, 01 Jan 1970 00:00:00 UTC; path=/';
    }
  };

  // ============================================================
  // UI Helpers
  // ============================================================

  var UI = {
    BADGE_VARIANTS: [
      'text-bg-secondary',
      'text-bg-success',
      'text-bg-danger',
      'text-bg-warning',
      'text-bg-info',
      'text-bg-light',
      'text-bg-dark'
    ],

    setBadge: function ($el, text, variant) {
      this.BADGE_VARIANTS.forEach(function (v) {
        $el.removeClass(v);
      });
      $el.addClass('text-bg-' + variant).text(text);
    },

    updateButtonStates: function () {
      if (State.webhookId) {
        $('#register-btn').hide();
        $('#unregister-btn').show();
        $('#secret-input').prop('disabled', true);
        $('#response-display').text('Webhook registered (ID: ' + State.webhookId + ')');
        this.setBadge($('#webhook-status'), 'Registered', 'success');
      } else {
        $('#register-btn').show();
        $('#unregister-btn').hide();
        $('#secret-input').prop('disabled', false);
        this.setBadge($('#webhook-status'), 'Not registered', 'secondary');
      }

      if (State.webhookSecret) {
        this.setBadge($('#verification-enabled'), 'Enabled', 'success');
        $('#verification-status')
          .removeClass('alert-secondary alert-danger')
          .addClass('alert-success');
      } else {
        this.setBadge($('#verification-enabled'), 'Disabled', 'secondary');
        $('#verification-status')
          .removeClass('alert-success alert-danger')
          .addClass('alert-secondary');
      }
    },

    handleProxyResponse: function (data) {
      var statusMessage = '';
      if (data.proxy_status === 'success') {
        statusMessage = '✅ ' + data.proxy_message + '\n\n';
      } else if (data.proxy_status === 'error') {
        statusMessage = '❌ ' + data.proxy_message + '\n';
        statusMessage += 'Details: ' + (data.error || data.details || 'Unknown error') + '\n\n';
      }
      return statusMessage + JSON.stringify(data, null, 2);
    },

    isPlaceholderContent: function (container) {
      var content = container.textContent;
      return content === 'No webhook events yet' ||
             content.indexOf('Webhook events cleared') !== -1 ||
             content === 'Connected.';
    },

    clearContainer: function (container) {
      while (container.firstChild) {
        container.removeChild(container.firstChild);
      }
    },

    setContainerText: function (container, text) {
      this.clearContainer(container);
      container.textContent = text;
    }
  };

  // ============================================================
  // State Management
  // ============================================================

  var State = {
    webhookId: Cookies.get('webhookId'),
    webhookSecret: Cookies.get('webhookSecret'),
    eventSource: null,
    eventCount: 0
  };

  // ============================================================
  // Server-Sent Events
  // ============================================================

  var SSE = {
    setup: function () {
      State.eventSource = new EventSource('/events');

      State.eventSource.onopen = function () {
        SSE.addSystemLog('Connected.', 'secondary');
      };

      State.eventSource.onmessage = function (event) {
        try {
          var data = JSON.parse(event.data);
          SSE.displayWebhookEvent(data);
        } catch (error) {
          console.error('Error parsing SSE data:', error);
        }
      };

      State.eventSource.addEventListener('webhook', function (event) {
        SSE.displayWebhookEvent({
          id: Date.now(),
          event: 'webhook',
          data: event.data,
          timestamp: new Date().toISOString()
        });
      });

      State.eventSource.addEventListener('connected', function (event) {
        SSE.displayWebhookEvent({
          event: 'connected',
          data: event.data,
          timestamp: new Date().toISOString()
        });
      });

      State.eventSource.onerror = function (event) {
        console.error('SSE error:', event);
        SSE.addSystemLog('Connection lost. Reconnecting…', 'warning');

        if (State.eventSource) {
          State.eventSource.close();
        }

        setTimeout(function () {
          SSE.setup();
        }, 3000);
      };
    },

    addSystemLog: function (message, variant) {
      variant = variant || 'secondary';
      var container = document.getElementById('webhook-events');
      if (!container) return;

      if (UI.isPlaceholderContent(container)) {
        UI.clearContainer(container);
      }

      var wrapper = document.createElement('div');
      wrapper.className = 'mb-3 pb-3 border-bottom';

      var header = document.createElement('div');
      header.className = 'fw-semibold text-' + variant;
      header.textContent = message;
      wrapper.appendChild(header);

      container.insertBefore(wrapper, container.firstChild);
    },

    displayWebhookEvent: function (eventData) {
      State.eventCount++;
      var timestamp = new Date().toLocaleTimeString();

      // Parse event data if it's a string
      var parsedData = null;
      if (eventData && typeof eventData.data === 'string') {
        try {
          parsedData = JSON.parse(eventData.data);
        } catch {
          parsedData = null;
        }
      } else if (eventData && eventData.body) {
        parsedData = eventData;
      }

      // Extract transaction ID if present
      var eventType = parsedData && parsedData.body && parsedData.body.event_type;
      var transactionId = null;
      if ((eventType === 'transaction_updated' || eventType === 'transaction_confirmed') &&
          parsedData.body.data && parsedData.body.data.transaction_id) {
        transactionId = parsedData.body.data.transaction_id;
      }

      // Create event container
      var eventDiv = document.createElement('div');
      eventDiv.className = 'mb-3 pb-3 border-bottom';

      // Add header
      var headerDiv = document.createElement('div');
      headerDiv.className = 'fw-semibold mb-1';
      headerDiv.textContent = '[' + timestamp + '] Event #' + State.eventCount;
      eventDiv.appendChild(headerDiv);

      // Add transaction link if present
      if (transactionId) {
        var linkDiv = document.createElement('div');
        linkDiv.className = 'mb-2';
        var link = document.createElement('a');
        link.href = '/transaction?transaction_id=' + encodeURIComponent(transactionId);
        link.textContent = 'View Transaction: ' + transactionId;
        link.target = '_blank';
        link.className = 'link-primary link-underline-opacity-0 link-underline-opacity-100-hover';
        linkDiv.appendChild(link);
        eventDiv.appendChild(linkDiv);
      }

      // Add JSON data
      var pre = document.createElement('pre');
      pre.className = 'm-0 p-2 border rounded bg-body';
      pre.style.overflowX = 'auto';
      pre.style.fontSize = '12px';
      var displayData = parsedData || eventData.data;
      var displayEvent = Object.assign({}, eventData, { data: displayData });
      pre.textContent = JSON.stringify(displayEvent, null, 2);
      eventDiv.appendChild(pre);

      // Add to container
      var container = document.getElementById('webhook-events');
      if (UI.isPlaceholderContent(container)) {
        UI.clearContainer(container);
      }
      container.insertBefore(eventDiv, container.firstChild);
    },

    clear: function () {
      var container = document.getElementById('webhook-events');
      if (container) {
        UI.setContainerText(container, 'Webhook events cleared. Waiting for new events...');
      }
      State.eventCount = 0;
    },

    reset: function () {
      var container = document.getElementById('webhook-events');
      if (container) {
        UI.setContainerText(container, 'No webhook events yet');
      }
      State.eventCount = 0;
    }
  };

  // ============================================================
  // Webhook API
  // ============================================================

  var API = {
    syncSecret: function () {
      if (!State.webhookSecret) return Promise.resolve();

      return fetch('/sync_secret', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ secret: State.webhookSecret })
      })
        .then(function () {
          console.log('Secret synced to server');
        })
        .catch(function (err) {
          console.error('Failed to sync secret:', err);
        });
    },

    register: function () {
      SSE.clear();

      var secret = $('#secret-input').val().trim();
      State.webhookSecret = secret || null;

      if (State.webhookSecret) {
        Cookies.set('webhookSecret', State.webhookSecret);
      } else {
        Cookies.delete('webhookSecret');
      }

      // Build request body
      var requestBody = {
        url: 'http://localhost:3000/sage_hook'
      };

      if (State.webhookSecret) {
        requestBody.secret = State.webhookSecret;
      }

      fetch('/proxy/register_webhook', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(requestBody)
      })
        .then(function (response) {
          return response.json();
        })
        .then(function (data) {
          if (data.proxy_status === 'success' && data.webhook_id) {
            State.webhookId = data.webhook_id;
            Cookies.set('webhookId', State.webhookId);
            UI.updateButtonStates();
          }
          $('#response-display').text(UI.handleProxyResponse(data));
        })
        .catch(function (error) {
          console.error('Error:', error);
          $('#response-display').text('❌ Network Error: ' + error.message);
        });
    },

    unregister: function () {
      if (!State.webhookId) {
        $('#response-display').text('Error: No webhook_id available. Please register a webhook first.');
        return;
      }

      SSE.clear();

      fetch('/proxy/unregister_webhook', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ webhook_id: State.webhookId })
      })
        .then(function (response) {
          return response.json();
        })
        .then(function (data) {
        // Always reset client state when unregistering
          State.webhookId = null;
          State.webhookSecret = null;
          Cookies.delete('webhookId');
          Cookies.delete('webhookSecret');
          $('#secret-input').val('');
          UI.updateButtonStates();
          SSE.reset();
          $('#response-display').text(UI.handleProxyResponse(data));
        })
        .catch(function (error) {
          console.error('Error:', error);
          // Reset state even on network error
          State.webhookId = null;
          State.webhookSecret = null;
          Cookies.delete('webhookId');
          Cookies.delete('webhookSecret');
          $('#secret-input').val('');
          UI.updateButtonStates();
          SSE.reset();
          $('#response-display').text('❌ Network Error: ' + error.message);
        });
    }
  };

  // ============================================================
  // Initialization
  // ============================================================

  function init() {
    // Sync secret to server on page load if it exists
    if (State.webhookSecret) {
      $('#secret-input').val(State.webhookSecret);
      API.syncSecret();
    }

    UI.updateButtonStates();
    SSE.setup();
  }

  // Initialize on document ready
  $(document).ready(init);

  // Clean up EventSource on page unload
  $(window).on('beforeunload', function () {
    if (State.eventSource) {
      State.eventSource.close();
    }
  });

  // ============================================================
  // Public API
  // ============================================================

  return {
    register: API.register,
    unregister: API.unregister,
    clearEvents: SSE.clear
  };

})(jQuery);
