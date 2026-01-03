/**
 * Webhook Test Harness - Client Application
 * Developer-focused webhook testing tool
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
          .attr('title', 'Resume event capture')
          .attr('aria-pressed', 'true')
          .attr('aria-label', 'Resume event capture');
      } else {
        $btn
          .removeClass('paused')
          .html('<i class="bi bi-pause-fill"></i>')
          .attr('title', 'Pause event capture')
          .attr('aria-pressed', 'false')
          .attr('aria-label', 'Pause event capture');
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

      // Update active state and aria-selected for accessibility
      $('.filter-btn').removeClass('active').attr('aria-selected', 'false');
      $('.filter-btn[data-filter="' + filter + '"]')
        .addClass('active')
        .attr('aria-selected', 'true');

      // Use CSS classes for filtering (much faster than iterating DOM)
      var $eventStream = $('#webhook-events');
      $eventStream.removeClass('filter-all filter-webhook filter-system');
      $eventStream.addClass('filter-' + filter);
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
        coins_updated: { text: 'Coins Updated', class: 'text-bg-warning' },
        cat_info: { text: 'CAT Info', class: 'text-bg-purple' },
        nft_data: { text: 'NFT Data', class: 'text-bg-purple' },
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

    /**
     * Creates a badge element
     * @private
     */
    createBadge: function (text, className) {
      var badge = document.createElement('span');
      badge.className = 'badge ' + className;
      badge.textContent = text;
      return badge;
    },

    /**
     * Creates a link element for entity details
     * @private
     */
    createEntityLink: function (href, icon, text) {
      // Validate URL before creating link
      try {
        // This will throw if the URL is malformed
        var validatedUrl = new URL(href, window.location.origin);

        // Ensure the URL is from the same origin (security check)
        if (validatedUrl.origin !== window.location.origin) {
          logger.warn('Attempted to create link to different origin:', href);
          return null;
        }
      } catch (e) {
        logger.error('Invalid URL for entity link:', href, e);
        return null;
      }

      var link = document.createElement('a');
      link.href = href;
      link.className = 'transaction-link';

      var iconEl = document.createElement('i');
      iconEl.className = icon;
      link.appendChild(iconEl);

      if (icon.includes('me-1')) {
        link.appendChild(document.createTextNode(' '));
      }
      link.appendChild(document.createTextNode(text));

      return link;
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
      var coinIds = null;
      var assetIds = null;
      var launcherIds = null;

      if (
        (eventType === 'transaction_updated' || eventType === 'transaction_confirmed') &&
        parsedData.body.data &&
        parsedData.body.data.transaction_id
      ) {
        transactionId = parsedData.body.data.transaction_id;
      }

      if (
        eventType === 'coins_updated' &&
        parsedData.body.data &&
        parsedData.body.data.coin_ids &&
        parsedData.body.data.coin_ids.length > 0
      ) {
        coinIds = parsedData.body.data.coin_ids;
      }

      if (
        eventType === 'cat_info' &&
        parsedData.body.data &&
        parsedData.body.data.asset_ids &&
        parsedData.body.data.asset_ids.length > 0
      ) {
        assetIds = parsedData.body.data.asset_ids;
      }

      if (
        eventType === 'nft_data' &&
        parsedData.body.data &&
        parsedData.body.data.launcher_ids &&
        parsedData.body.data.launcher_ids.length > 0
      ) {
        launcherIds = parsedData.body.data.launcher_ids;
      }

      var typeBadge = this.getEventTypeBadge(eventType);
      var verifyBadge = this.getVerificationBadge(verification);

      // Use stored timestamp if available (for restored events), otherwise generate new one
      var timestamp = eventData.timestamp
        ? this.formatTime(new Date(eventData.timestamp))
        : this.formatTime(new Date());

      var eventId = 'event-' + Date.now();

      var displayData = parsedData || eventData.data;
      var jsonString = JSON.stringify(displayData, null, 2);
      var summary = eventType ? eventType : 'Webhook received';
      if (transactionId) {
        summary += ': ' + transactionId.substring(0, 16) + '...';
      } else if (coinIds) {
        summary += ': ' + coinIds.length + ' coin' + (coinIds.length !== 1 ? 's' : '');
      } else if (assetIds) {
        summary += ': ' + assetIds.length + ' asset' + (assetIds.length !== 1 ? 's' : '');
      } else if (launcherIds) {
        summary += ': ' + launcherIds.length + ' NFT' + (launcherIds.length !== 1 ? 's' : '');
      }

      // Create DOM structure
      var eventItem = document.createElement('div');
      eventItem.className = 'event-item';
      eventItem.setAttribute('data-event-id', eventId);

      // Event header container
      var eventHeader = document.createElement('div');
      eventHeader.className = 'event-header';

      // Event meta (time, badges, links)
      var eventMeta = document.createElement('div');
      eventMeta.className = 'event-meta';

      // Time
      var timeSpan = document.createElement('span');
      timeSpan.className = 'event-time';
      timeSpan.textContent = timestamp;
      eventMeta.appendChild(timeSpan);

      // Event type badge
      var typeBadgeEl = this.createBadge(typeBadge.text, 'event-type-badge ' + typeBadge.class);
      eventMeta.appendChild(typeBadgeEl);

      // Verification badge
      var verifyBadgeEl = this.createBadge(
        verifyBadge.text,
        'verification-badge ' + verifyBadge.class
      );
      eventMeta.appendChild(verifyBadgeEl);

      // Transaction link
      if (transactionId) {
        var txLink = this.createEntityLink(
          '/transaction?transaction_id=' + encodeURIComponent(transactionId),
          'bi bi-box-arrow-up-right',
          transactionId.substring(0, 12) + '...'
        );
        if (txLink) {
          eventMeta.appendChild(txLink);
        }
      }

      // Coins link
      if (coinIds) {
        var coinsLink = this.createEntityLink(
          '/coins?coin_ids=' + encodeURIComponent(coinIds.join(',')),
          'bi bi-coin me-1',
          coinIds.length + ' coin' + (coinIds.length !== 1 ? 's' : '')
        );
        if (coinsLink) {
          eventMeta.appendChild(coinsLink);
        }
      }

      // Assets link
      if (assetIds) {
        var assetsLink = this.createEntityLink(
          '/assets?asset_ids=' + encodeURIComponent(assetIds.join(',')),
          'bi bi-gem me-1',
          assetIds.length + ' asset' + (assetIds.length !== 1 ? 's' : '')
        );
        if (assetsLink) {
          eventMeta.appendChild(assetsLink);
        }
      }

      // NFTs link
      if (launcherIds) {
        var nftsLink = this.createEntityLink(
          '/nfts?launcher_ids=' + encodeURIComponent(launcherIds.join(',')),
          'bi bi-image me-1',
          launcherIds.length + ' NFT' + (launcherIds.length !== 1 ? 's' : '')
        );
        if (nftsLink) {
          eventMeta.appendChild(nftsLink);
        }
      }

      eventHeader.appendChild(eventMeta);

      // Event actions (copy, toggle)
      var eventActions = document.createElement('div');
      eventActions.className = 'event-actions';

      var copyBtn = document.createElement('button');
      copyBtn.className = 'btn-action btn-copy';
      copyBtn.setAttribute('data-event-id', eventId);
      copyBtn.setAttribute('title', 'Copy JSON');
      var copyIcon = document.createElement('i');
      copyIcon.className = 'bi bi-clipboard';
      copyBtn.appendChild(copyIcon);
      eventActions.appendChild(copyBtn);

      var toggleBtn = document.createElement('button');
      toggleBtn.className = 'btn-action btn-toggle';
      toggleBtn.setAttribute('data-event-id', eventId);
      toggleBtn.setAttribute('title', 'Toggle details');
      var toggleIcon = document.createElement('i');
      toggleIcon.className = 'bi bi-code-slash';
      toggleBtn.appendChild(toggleIcon);
      eventActions.appendChild(toggleBtn);

      eventHeader.appendChild(eventActions);
      eventItem.appendChild(eventHeader);

      // Event summary
      var eventSummaryDiv = document.createElement('div');
      eventSummaryDiv.className = 'event-summary';
      eventSummaryDiv.textContent = summary;
      eventItem.appendChild(eventSummaryDiv);

      // Event details (JSON with syntax highlighting)
      var eventDetails = document.createElement('pre');
      eventDetails.className = 'event-details collapse';
      eventDetails.id = eventId + '-details';
      renderJsonWithSyntax(eventDetails, displayData);
      eventItem.appendChild(eventDetails);

      // Convert to jQuery and store JSON data
      var $el = $(eventItem);
      $el.data('json', jsonString);

      return $el;
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

    addWebhookEvent: function (eventData, skipPersist) {
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

      // Persist to localStorage (unless already saved by SSEManager)
      if (!skipPersist) {
        this.persistEvents();
      }
    },

    persistEvents: function () {
      if (!window.EventStore || !EventStore.isEnabled()) {
        return;
      }

      // Extract just the serializable data (not DOM elements)
      var serializableEvents = State.events.map(function (item) {
        return item.data;
      });

      EventStore.saveEvents(serializableEvents);
    },

    restoreEvents: function () {
      if (!window.EventStore || !EventStore.isEnabled()) {
        return;
      }

      var storedEvents = EventStore.loadEvents();

      if (storedEvents.length === 0) {
        return;
      }

      logger.log('Restoring ' + storedEvents.length + ' events from localStorage');

      // Restore in reverse order (oldest first, so they end up newest on top)
      for (var i = storedEvents.length - 1; i >= 0; i--) {
        var eventData = storedEvents[i];

        State.eventCount++;
        UI.clearPlaceholder();

        var $el = this.createEventElement(eventData);
        State.events.push({ el: $el, data: eventData });

        $('#webhook-events').prepend($el);
      }

      UI.updateEventCounter();

      // Apply current filter
      if (State.currentFilter !== 'all') {
        UI.applyFilter(State.currentFilter);
      }

      // Show system message about restored events
      this.addSystemEvent(
        'Restored ' + storedEvents.length + ' events from previous session',
        'info'
      );
    },

    clear: function () {
      State.events = [];
      State.eventCount = 0;
      UI.updateEventCounter();
      UI.showPlaceholder();

      // Clear persisted events from localStorage
      if (window.EventStore && EventStore.isEnabled()) {
        EventStore.clearEvents();
        logger.log('Cleared persisted events from localStorage');
      }
    },
  };

  // ============================================================
  // Server-Sent Events (using global SSEManager)
  // ============================================================

  var SSE = {
    setup: function () {
      // Monitor connection status from global SSEManager
      SSEManager.onStatusChange(function (status) {
        if (status === 'connected') {
          UI.updateConnectionStatus('connected');
          Events.addSystemEvent('Connected to event stream', 'success');
        } else if (status === 'connecting') {
          UI.updateConnectionStatus('connecting');
        } else if (status === 'disconnected') {
          UI.updateConnectionStatus('disconnected');
        }
      });

      // Listen for webhook events from global SSEManager
      window.addEventListener('webhook-received', function (customEvent) {
        var eventData = customEvent.detail;
        // Pass skipPersist=true because SSEManager already saved to localStorage
        Events.addWebhookEvent(eventData, true);
      });

      // Ensure connection is active
      if (!SSEManager.isActive()) {
        SSEManager.connect();
      }
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

      var requestBody = { url: AppConfig.WEBHOOK.URL };
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

    // Restore events from localStorage before connecting to SSE
    Events.restoreEvents();

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

    // Event delegation for event item buttons (copy, toggle)
    $('#webhook-events').on('click', '.btn-copy', function () {
      var eventId = $(this).attr('data-event-id');
      if (eventId) {
        WebhookApp.copyEvent(eventId);
      }
    });

    $('#webhook-events').on('click', '.btn-toggle', function () {
      var eventId = $(this).attr('data-event-id');
      if (eventId) {
        WebhookApp.toggleDetails(eventId);
      }
    });
  }

  $(document).ready(init);

  // Note: Connection is now managed globally by SSEManager
  // It persists across page navigation

  // ============================================================
  // Public API
  // ============================================================

  return {
    register: API.register,
    unregister: API.unregister,
    clearEvents: Events.clear,

    copyUrl: function () {
      UI.copyToClipboard(AppConfig.WEBHOOK.URL, $('[onclick="WebhookApp.copyUrl()"]'));
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

    exportEvents: function () {
      if (window.EventStore && EventStore.isEnabled()) {
        EventStore.exportEvents();
      }
    },

    getStorageStats: function () {
      if (window.EventStore && EventStore.isEnabled()) {
        var stats = EventStore.getStats();
        logger.log('Event Storage Stats:', stats);
        return stats;
      }
      return null;
    },
  };
})(jQuery);
