/**
 * SSE Status Badge
 * Manages the visual status indicator for the SSE connection
 */

(function () {
  'use strict';

  /**
   * Initializes the SSE status badge
   * Listens for status changes and updates the badge appearance
   */
  function initSseStatusBadge() {
    if (!window.SSEManager) {
      if (window.logger) {
        window.logger.warn('SSEManager not available, skipping status badge initialization');
      }
      return;
    }

    var badge = document.getElementById('sse-status');
    if (!badge) {
      if (window.logger) {
        window.logger.warn('SSE status badge element not found');
      }
      return;
    }

    /**
     * Updates the badge based on connection status
     * @param {string} status - Connection status: 'connected', 'connecting', 'disconnected'
     */
    function updateBadge(status) {
      // Remove all status classes
      badge.classList.remove('text-bg-secondary', 'text-bg-success', 'text-bg-warning');

      // Clear and rebuild badge content safely using DOM APIs
      while (badge.firstChild) {
        badge.removeChild(badge.firstChild);
      }

      var icon = document.createElement('i');
      var space = document.createTextNode(' ');

      if (status === 'connected') {
        badge.classList.add('text-bg-success');
        icon.className = 'bi bi-wifi';
        badge.appendChild(icon);
        badge.appendChild(space);
        badge.appendChild(document.createTextNode('Events active'));
      } else if (status === 'connecting') {
        badge.classList.add('text-bg-warning');
        icon.className = 'bi bi-wifi';
        badge.appendChild(icon);
        badge.appendChild(space);
        badge.appendChild(document.createTextNode('Connecting...'));
      } else {
        badge.classList.add('text-bg-secondary');
        icon.className = 'bi bi-wifi-off';
        badge.appendChild(icon);
        badge.appendChild(space);
        badge.appendChild(document.createTextNode('Disconnected'));
      }
    }

    // Register status change listener
    SSEManager.onStatusChange(updateBadge);

    if (window.logger) {
      window.logger.log('SSE status badge initialized');
    }
  }

  // Initialize when DOM is ready
  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', initSseStatusBadge);
  } else {
    // DOM already loaded
    initSseStatusBadge();
  }

  // Export for testing
  if (typeof window !== 'undefined') {
    window.initSseStatusBadge = initSseStatusBadge;
  }
})();
