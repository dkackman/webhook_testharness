/**
 * Webhook Test Harness - Client Application
 * Developer-focused webhook testing tool
 */

var WebhookApp = (function ($) {
  'use strict';

  // ============================================================
  // Configuration
  // ============================================================

  var CONFIG = {
    WEBHOOK_URL: 'http://localhost:3000/sage_hook',
    RECONNECT_DELAY: 3000,
  };

  // ============================================================
  // Cookie Utilities
  // ============================================================

  var Cookies = {
    set: function (name, value, days) {
      days = days || 365;
      var expires = new Date(Date.now() + days * 864e5).toUTCString();
      document.cookie =
        name + '=' + encodeURIComponent(value) + '; expires=' + expires + '; path=/';
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
    },
  };

  // ============================================================
  // State Management
  // ============================================================

  var State = {
    webhookId: Cookies.get('webhookId'),
    webhookSecret: Cookies.get('webhookSecret'),
    eventSource: null,
    eventCount: 0,
    isPaused: false,
    currentFilter: 'all',
    events: [], // Store events for filtering
  };

  // ============================================================
  // UI Helpers
  // ============================================================

  var UI = {
    updateConnectionStatus: function (status) {
      var $el = $('#connection-status');
      $el.removeClass('text-bg-warning text-bg-success text-bg-danger connected disconnected');

      if (status === 'connected') {
        $el.addClass('text-bg-success connected').html('<i class="bi bi-wifi me-1"></i>Connected');
      } else if (status === 'connecting') {
        $el
          .addClass('text-bg-warning')
          .html(
            '<span class="spinner-grow spinner-grow-sm me-1" role="status"></span>Connecting...'
          );
      } else {
        $el
          .addClass('text-bg-danger disconnected')
          .html('<i class="bi bi-wifi-off me-1"></i>Disconnected');
      }
    },

    updateEventCounter: function () {
      $('#event-counter').text(State.eventCount + ' event' + (State.eventCount !== 1 ? 's' : ''));
    },

    updateButtonStates: function () {
      var $panel = $('#setup-panel');

      if (State.webhookId) {
        $('#register-btn').hide();
        $('#unregister-btn').show();
        $('#secret-input').prop('disabled', true);
        $('#response-status').text('Registered: ' + State.webhookId);
        $('#webhook-status')
          .removeClass('text-bg-secondary')
          .addClass('text-bg-success')
          .text('Registered');
        $panel.addClass('registered');

        // Auto-collapse setup panel
        var collapse = bootstrap.Collapse.getOrCreateInstance($('#setup-body')[0]);
        collapse.hide();
      } else {
        $('#register-btn').show();
        $('#unregister-btn').hide();
        $('#secret-input').prop('disabled', false);
        $('#webhook-status')
          .removeClass('text-bg-success')
          .addClass('text-bg-secondary')
          .text('Not registered');
        $panel.removeClass('registered');
      }

      // HMAC badge
      if (State.webhookSecret) {
        $('#hmac-badge')
          .removeClass('text-bg-secondary')
          .addClass('text-bg-success')
          .text('HMAC: On');
      } else {
        $('#hmac-badge')
          .removeClass('text-bg-success')
          .addClass('text-bg-secondary')
          .text('HMAC: Off');
      }
    },

    togglePause: function () {
      State.isPaused = !State.isPaused;
      var $btn = $('#pause-btn');

      if (State.isPaused) {
        $btn
          .addClass('paused')
          .html('<i class="bi bi-play-fill"></i>')
          .attr('title', 'Resume event capture');
      } else {
        $btn
          .removeClass('paused')
          .html('<i class="bi bi-pause-fill"></i>')
          .attr('title', 'Pause event capture');
      }
    },

    copyToClipboard: function (text, $button) {
      navigator.clipboard.writeText(text).then(function () {
        var $icon = $button.find('i');
        var originalClass = $icon.attr('class');
        $icon.attr('class', 'bi bi-check copy-success');
        setTimeout(function () {
          $icon.attr('class', originalClass);
        }, 1500);
      });
    },

    clearPlaceholder: function () {
      var $placeholder = $('#webhook-events .event-placeholder');
      if ($placeholder.length) {
        $placeholder.remove();
      }
    },

    showPlaceholder: function () {
      var container = document.getElementById('webhook-events');
      container.innerHTML =
        '<div class="event-placeholder text-center text-muted py-5">' +
        '<i class="bi bi-inbox d-block fs-1 mb-2"></i>' +
        'Waiting for webhook events...' +
        '</div>';
    },

    applyFilter: function (filter) {
      State.currentFilter = filter;
      $('.filter-btn').removeClass('active');
      $('.filter-btn[data-filter="' + filter + '"]').addClass('active');

      $('.event-item').each(function () {
        var $item = $(this);
        var isSystem = $item.hasClass('system-event');

        if (filter === 'all') {
          $item.show();
        } else if (filter === 'webhook') {
          $item.toggle(!isSystem);
        } else if (filter === 'system') {
          $item.toggle(isSystem);
        }
      });
    },
  };

  // ============================================================
  // Event Display
  // ============================================================

  var Events = {
    getEventTypeBadge: function (eventType) {
      var badges = {
        transaction_updated: { text: 'TX Updated', class: 'text-bg-info' },
        transaction_confirmed: { text: 'TX Confirmed', class: 'text-bg-success' },
        wallet_sync: { text: 'Wallet Sync', class: 'text-bg-primary' },
      };
      return badges[eventType] || { text: eventType || 'Event', class: 'text-bg-secondary' };
    },

    getVerificationBadge: function (status) {
      if (!status || status === 'No signature required') {
        return { text: 'No HMAC', class: 'text-bg-secondary' };
      }
      if (status.includes('VERIFIED')) {
        return { text: 'Verified', class: 'text-bg-success' };
      }
      return { text: 'Failed', class: 'text-bg-danger' };
    },

    formatTime: function (date) {
      return date.toLocaleTimeString('en-US', {
        hour12: false,
        hour: '2-digit',
        minute: '2-digit',
        second: '2-digit',
        fractionalSecondDigits: 3,
      });
    },

    syntaxHighlight: function (json) {
      if (typeof json !== 'string') {
        json = JSON.stringify(json, null, 2);
      }
      return json
        .replace(/&/g, '&amp;')
        .replace(/</g, '&lt;')
        .replace(/>/g, '&gt;')
        .replace(
          /("(\\u[a-zA-Z0-9]{4}|\\[^u]|[^\\"])*"(\s*:)?|\b(true|false|null)\b|-?\d+(?:\.\d*)?(?:[eE][+-]?\d+)?)/g,
          function (match) {
            var cls = 'json-number';
            if (/^"/.test(match)) {
              if (/:$/.test(match)) {
                cls = 'json-key';
                match = match.slice(0, -1) + '</span>:';
                return '<span class="' + cls + '">' + match;
              } else {
                cls = 'json-string';
              }
            } else if (/true|false/.test(match)) {
              cls = 'json-boolean';
            } else if (/null/.test(match)) {
              cls = 'json-null';
            }
            return '<span class="' + cls + '">' + match + '</span>';
          }
        );
    },

    createEventElement: function (eventData) {
      var parsedData = null;
      if (eventData && typeof eventData.data === 'string') {
        try {
          parsedData = JSON.parse(eventData.data);
        } catch (_e) {
          parsedData = null;
        }
      } else if (eventData && eventData.body) {
        parsedData = eventData;
      }

      var eventType = parsedData && parsedData.body && parsedData.body.event_type;
      var verification = parsedData && parsedData.verification;
      var transactionId = null;

      if (
        (eventType === 'transaction_updated' || eventType === 'transaction_confirmed') &&
        parsedData.body.data &&
        parsedData.body.data.transaction_id
      ) {
        transactionId = parsedData.body.data.transaction_id;
      }

      var typeBadge = this.getEventTypeBadge(eventType);
      var verifyBadge = this.getVerificationBadge(verification);
      var timestamp = this.formatTime(new Date());
      var eventId = 'event-' + Date.now();

      var displayData = parsedData || eventData.data;
      var jsonString = JSON.stringify(displayData, null, 2);
      var summary = eventType
        ? eventType + (transactionId ? ': ' + transactionId.substring(0, 16) + '...' : '')
        : 'Webhook received';

      var html =
        '<div class="event-item" data-event-id="' +
        eventId +
        '">' +
        '  <div class="event-header">' +
        '    <div class="event-meta">' +
        '      <span class="event-time">' +
        timestamp +
        '</span>' +
        '      <span class="badge event-type-badge ' +
        typeBadge.class +
        '">' +
        typeBadge.text +
        '</span>' +
        '      <span class="badge verification-badge ' +
        verifyBadge.class +
        '">' +
        verifyBadge.text +
        '</span>' +
        (transactionId
          ? '      <a href="/transaction?transaction_id=' +
            encodeURIComponent(transactionId) +
            '" target="_blank" class="transaction-link"><i class="bi bi-box-arrow-up-right"></i>' +
            transactionId.substring(0, 12) +
            '...</a>'
          : '') +
        '    </div>' +
        '    <div class="event-actions">' +
        '      <button class="btn-action" onclick="WebhookApp.copyEvent(\'' +
        eventId +
        '\')" title="Copy JSON">' +
        '        <i class="bi bi-clipboard"></i>' +
        '      </button>' +
        '      <button class="btn-action" onclick="WebhookApp.toggleDetails(\'' +
        eventId +
        '\')" title="Toggle details">' +
        '        <i class="bi bi-code-slash"></i>' +
        '      </button>' +
        '    </div>' +
        '  </div>' +
        '  <div class="event-summary">' +
        summary +
        '</div>' +
        '  <pre class="event-details collapse" id="' +
        eventId +
        '-details">' +
        this.syntaxHighlight(jsonString) +
        '  </pre>' +
        '</div>';

      // Store raw JSON for copy
      var el = $(html);
      el.data('json', jsonString);

      return el;
    },

    addSystemEvent: function (message, variant) {
      variant = variant || 'secondary';
      UI.clearPlaceholder();

      var html =
        '<div class="event-item system-event">' +
        '  <div class="event-summary text-' +
        variant +
        '">' +
        '    <i class="bi bi-info-circle me-1"></i>' +
        message +
        '  </div>' +
        '</div>';

      $('#webhook-events').prepend(html);
    },

    addWebhookEvent: function (eventData) {
      if (State.isPaused) return;

      State.eventCount++;
      UI.updateEventCounter();
      UI.clearPlaceholder();

      var $el = this.createEventElement(eventData);
      State.events.push({ el: $el, data: eventData });

      $('#webhook-events').prepend($el);

      // Apply current filter
      if (State.currentFilter !== 'all') {
        UI.applyFilter(State.currentFilter);
      }
    },

    clear: function () {
      State.events = [];
      State.eventCount = 0;
      UI.updateEventCounter();
      UI.showPlaceholder();
    },
  };

  // ============================================================
  // Server-Sent Events
  // ============================================================

  var SSE = {
    setup: function () {
      UI.updateConnectionStatus('connecting');
      State.eventSource = new EventSource('/events');

      State.eventSource.onopen = function () {
        UI.updateConnectionStatus('connected');
        Events.addSystemEvent('Connected to event stream', 'success');
      };

      State.eventSource.addEventListener('webhook', function (event) {
        Events.addWebhookEvent({
          id: Date.now(),
          event: 'webhook',
          data: event.data,
          timestamp: new Date().toISOString(),
        });
      });

      State.eventSource.onerror = function () {
        UI.updateConnectionStatus('disconnected');
        Events.addSystemEvent('Connection lost. Reconnecting...', 'warning');

        if (State.eventSource) {
          State.eventSource.close();
        }

        setTimeout(function () {
          SSE.setup();
        }, CONFIG.RECONNECT_DELAY);
      };
    },
  };

  // ============================================================
  // API
  // ============================================================

  var API = {
    syncSecret: function () {
      if (!State.webhookSecret) return Promise.resolve();

      return fetch('/sync_secret', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ secret: State.webhookSecret }),
      }).catch(function (err) {
        console.error('Failed to sync secret:', err);
      });
    },

    register: function () {
      Events.clear();
      $('#response-status').text('Registering...');

      var secret = $('#secret-input').val().trim();
      State.webhookSecret = secret || null;

      if (State.webhookSecret) {
        Cookies.set('webhookSecret', State.webhookSecret);
      } else {
        Cookies.delete('webhookSecret');
      }

      var requestBody = { url: CONFIG.WEBHOOK_URL };
      if (State.webhookSecret) {
        requestBody.secret = State.webhookSecret;
      }

      fetch('/proxy/register_webhook', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(requestBody),
      })
        .then(function (response) {
          return response.json();
        })
        .then(function (data) {
          if (data.proxy_status === 'success' && data.webhook_id) {
            State.webhookId = data.webhook_id;
            Cookies.set('webhookId', State.webhookId);
            UI.updateButtonStates();
            Events.addSystemEvent('Webhook registered successfully', 'success');
          } else {
            $('#response-status').text('Error: ' + (data.error || data.proxy_message));
          }
        })
        .catch(function (error) {
          $('#response-status').text('Network error: ' + error.message);
        });
    },

    unregister: function () {
      if (!State.webhookId) return;

      $('#response-status').text('Unregistering...');

      fetch('/proxy/unregister_webhook', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ webhook_id: State.webhookId }),
      })
        .then(function (response) {
          return response.json();
        })
        .then(function () {
          State.webhookId = null;
          State.webhookSecret = null;
          Cookies.delete('webhookId');
          Cookies.delete('webhookSecret');
          $('#secret-input').val('');
          UI.updateButtonStates();
          Events.clear();
          $('#response-status').text('Ready');
          Events.addSystemEvent('Webhook unregistered', 'secondary');
        })
        .catch(function (error) {
          $('#response-status').text('Error: ' + error.message);
        });
    },
  };

  // ============================================================
  // Initialization
  // ============================================================

  function init() {
    // Restore state
    if (State.webhookSecret) {
      $('#secret-input').val(State.webhookSecret);
      API.syncSecret();
    }

    UI.updateButtonStates();
    UI.updateEventCounter();
    SSE.setup();

    // Event handlers
    $('#pause-btn').on('click', UI.togglePause);

    $('.filter-btn').on('click', function () {
      UI.applyFilter($(this).data('filter'));
    });

    $('#toggle-secret').on('click', function () {
      var $input = $('#secret-input');
      var $icon = $(this).find('i');
      if ($input.attr('type') === 'password') {
        $input.attr('type', 'text');
        $icon.removeClass('bi-eye').addClass('bi-eye-slash');
      } else {
        $input.attr('type', 'password');
        $icon.removeClass('bi-eye-slash').addClass('bi-eye');
      }
    });
  }

  $(document).ready(init);

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
    clearEvents: Events.clear,

    copyUrl: function () {
      UI.copyToClipboard(CONFIG.WEBHOOK_URL, $('[onclick="WebhookApp.copyUrl()"]'));
    },

    copyEvent: function (eventId) {
      var $item = $('[data-event-id="' + eventId + '"]');
      var json = $item.data('json');
      UI.copyToClipboard(json, $item.find('.btn-action').first());
    },

    toggleDetails: function (eventId) {
      var $details = $('#' + eventId + '-details');
      $details.collapse('toggle');
    },

    togglePause: UI.togglePause,
  };
})(jQuery);
