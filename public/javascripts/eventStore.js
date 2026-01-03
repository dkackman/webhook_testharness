/**
 * Event persistence utility using localStorage
 * Implements FIFO (First In, First Out) cache with configurable limits
 */

var EventStore = (function () {
  'use strict';

  /**
   * Gets storage configuration from AppConfig
   * @returns {Object} Storage config
   */
  function getConfig() {
    return (
      (window.AppConfig && window.AppConfig.EVENT_STORAGE) || {
        ENABLED: false,
        MAX_EVENTS: 100,
        STORAGE_KEY: 'webhook_events',
        AUTO_RESTORE: true,
      }
    );
  }

  /**
   * Checks if localStorage is available
   * @returns {boolean}
   */
  function isStorageAvailable() {
    try {
      var test = '__storage_test__';
      localStorage.setItem(test, test);
      localStorage.removeItem(test);
      return true;
    } catch (e) {
      if (window.logger) {
        window.logger.warn('localStorage is not available:', e);
      }
      return false;
    }
  }

  /**
   * Loads events from localStorage
   * @returns {Array} Array of stored events
   */
  function loadEvents() {
    var config = getConfig();

    if (!config.ENABLED || !isStorageAvailable()) {
      return [];
    }

    try {
      var stored = localStorage.getItem(config.STORAGE_KEY);
      if (!stored) {
        return [];
      }

      var events = JSON.parse(stored);

      if (!Array.isArray(events)) {
        if (window.logger) {
          window.logger.warn('Invalid event storage format, clearing');
        }
        clearEvents();
        return [];
      }

      if (window.logger) {
        window.logger.log('Loaded ' + events.length + ' events from localStorage');
      }

      return events;
    } catch (e) {
      if (window.logger) {
        window.logger.error('Failed to load events from localStorage:', e);
      }
      // Clear corrupted data
      clearEvents();
      return [];
    }
  }

  /**
   * Saves events to localStorage with FIFO limit
   * @param {Array} events - Array of events to save
   * @returns {boolean} Success status
   */
  function saveEvents(events) {
    var config = getConfig();

    if (!config.ENABLED || !isStorageAvailable()) {
      return false;
    }

    if (!Array.isArray(events)) {
      if (window.logger) {
        window.logger.error('saveEvents: events must be an array');
      }
      return false;
    }

    try {
      // Enforce FIFO limit - keep only the most recent MAX_EVENTS
      var eventsToStore = events;
      if (events.length > config.MAX_EVENTS) {
        // Slice from the end to keep most recent events
        eventsToStore = events.slice(-config.MAX_EVENTS);

        if (window.logger) {
          window.logger.log(
            'Trimmed events from ' + events.length + ' to ' + config.MAX_EVENTS + ' (FIFO)'
          );
        }
      }

      var serialized = JSON.stringify(eventsToStore);

      // Check if we're approaching localStorage quota (usually 5-10MB)
      var sizeInBytes = new Blob([serialized]).size;
      var sizeInKB = Math.round(sizeInBytes / 1024);

      if (window.logger) {
        window.logger.log(
          'Saving ' + eventsToStore.length + ' events (' + sizeInKB + ' KB) to localStorage'
        );
      }

      localStorage.setItem(config.STORAGE_KEY, serialized);
      return true;
    } catch (e) {
      // Likely quota exceeded
      if (window.logger) {
        window.logger.error('Failed to save events to localStorage:', e);
      }

      // Try saving with fewer events
      if (events.length > 10) {
        var reducedEvents = events.slice(-Math.floor(config.MAX_EVENTS / 2));
        if (window.logger) {
          window.logger.warn('Retrying with reduced event count: ' + reducedEvents.length);
        }
        return saveEvents(reducedEvents);
      }

      return false;
    }
  }

  /**
   * Adds a new event and saves to localStorage
   * @param {Array} currentEvents - Current events array
   * @param {Object} newEvent - New event to add
   * @returns {boolean} Success status
   */
  function addEvent(currentEvents, newEvent) {
    if (!Array.isArray(currentEvents)) {
      if (window.logger) {
        window.logger.error('addEvent: currentEvents must be an array');
      }
      return false;
    }

    // Add new event at the end (prepend happens in DOM, but we store in chronological order)
    var updatedEvents = currentEvents.concat([newEvent]);
    return saveEvents(updatedEvents);
  }

  /**
   * Clears all events from localStorage
   * @returns {boolean} Success status
   */
  function clearEvents() {
    var config = getConfig();

    if (!isStorageAvailable()) {
      return false;
    }

    try {
      localStorage.removeItem(config.STORAGE_KEY);

      if (window.logger) {
        window.logger.log('Cleared events from localStorage');
      }

      return true;
    } catch (e) {
      if (window.logger) {
        window.logger.error('Failed to clear events from localStorage:', e);
      }
      return false;
    }
  }

  /**
   * Gets storage statistics
   * @returns {Object} Storage stats
   */
  function getStats() {
    var config = getConfig();
    var events = loadEvents();
    var serialized = JSON.stringify(events);
    var sizeInBytes = new Blob([serialized]).size;

    return {
      enabled: config.ENABLED,
      eventCount: events.length,
      maxEvents: config.MAX_EVENTS,
      sizeInBytes: sizeInBytes,
      sizeInKB: Math.round(sizeInBytes / 1024),
      storageKey: config.STORAGE_KEY,
      utilizationPercent: Math.round((events.length / config.MAX_EVENTS) * 100),
    };
  }

  /**
   * Exports events as JSON file for download
   * @param {string} filename - Filename for export
   */
  function exportEvents(filename) {
    filename = filename || 'webhook-events-' + new Date().toISOString().slice(0, 10) + '.json';

    var events = loadEvents();
    var json = JSON.stringify(events, null, 2);
    var blob = new Blob([json], { type: 'application/json' });
    var url = URL.createObjectURL(blob);

    var a = document.createElement('a');
    a.href = url;
    a.download = filename;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);

    if (window.logger) {
      window.logger.log('Exported ' + events.length + ' events to ' + filename);
    }
  }

  // Public API
  return {
    loadEvents: loadEvents,
    saveEvents: saveEvents,
    addEvent: addEvent,
    clearEvents: clearEvents,
    getStats: getStats,
    exportEvents: exportEvents,
    isEnabled: function () {
      return getConfig().ENABLED && isStorageAvailable();
    },
  };
})();

// Make available globally
if (typeof window !== 'undefined') {
  window.EventStore = EventStore;
}

// Export for modules
if (typeof module !== 'undefined' && module.exports) {
  module.exports = EventStore;
}
