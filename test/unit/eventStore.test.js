/**
 * Tests for eventStore.js
 */

import { expect } from 'chai';
import { JSDOM } from 'jsdom';
import { readFileSync } from 'fs';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

describe('EventStore', function () {
  let window, EventStore, AppConfig;

  beforeEach(function () {
    // Set up DOM and mocks
    const dom = new JSDOM('<!DOCTYPE html>');
    window = dom.window;
    global.window = window;

    // Mock localStorage using Object.defineProperty
    const localStorageMock = {
      _data: {},
      setItem(key, value) {
        this._data[key] = String(value);
      },
      getItem(key) {
        return this._data[key] || null;
      },
      removeItem(key) {
        delete this._data[key];
      },
      clear() {
        this._data = {};
      },
    };

    Object.defineProperty(window, 'localStorage', {
      value: localStorageMock,
      writable: true,
      configurable: true,
    });

    // Make localStorage available globally for the Function constructor scope
    global.localStorage = localStorageMock;

    // Load config
    const configPath = join(__dirname, '../../public/javascripts/config.js');
    const configCode = readFileSync(configPath, 'utf-8');
    const configScript = new window.Function(configCode);
    configScript.call(window);
    AppConfig = window.AppConfig;

    // Load logger (dependency)
    const loggerPath = join(__dirname, '../../public/javascripts/logger.js');
    const loggerCode = readFileSync(loggerPath, 'utf-8');
    const loggerScript = new window.Function(loggerCode);
    loggerScript.call(window);

    // Load eventStore
    const eventStorePath = join(__dirname, '../../public/javascripts/eventStore.js');
    const code = readFileSync(eventStorePath, 'utf-8');
    const script = new window.Function(code);
    script.call(window);
    EventStore = window.EventStore;
  });

  describe('saveEvents', function () {
    it('should save events to localStorage', function () {
      const events = [
        { id: 1, data: 'event1' },
        { id: 2, data: 'event2' },
      ];

      const result = EventStore.saveEvents(events);
      expect(result).to.be.true;

      const stored = JSON.parse(window.localStorage.getItem(AppConfig.EVENT_STORAGE.STORAGE_KEY));
      expect(stored).to.have.lengthOf(2);
      expect(stored[0].id).to.equal(1);
    });

    it('should enforce FIFO limit (keep most recent)', function () {
      const maxEvents = AppConfig.EVENT_STORAGE.MAX_EVENTS;
      const events = [];
      for (let i = 0; i < maxEvents + 10; i++) {
        events.push({ id: i, data: `event${i}` });
      }

      EventStore.saveEvents(events);

      const stored = JSON.parse(window.localStorage.getItem(AppConfig.EVENT_STORAGE.STORAGE_KEY));
      expect(stored).to.have.lengthOf(maxEvents);
      // Should keep the LAST maxEvents (most recent)
      expect(stored[0].id).to.equal(10); // First one should be id 10
      expect(stored[stored.length - 1].id).to.equal(maxEvents + 9); // Last one should be id 109
    });

    it('should handle empty array', function () {
      const result = EventStore.saveEvents([]);
      expect(result).to.be.true;

      const stored = JSON.parse(window.localStorage.getItem(AppConfig.EVENT_STORAGE.STORAGE_KEY));
      expect(stored).to.be.an('array').that.is.empty;
    });
  });

  describe('loadEvents', function () {
    it('should load events from localStorage', function () {
      const events = [
        { id: 1, data: 'event1' },
        { id: 2, data: 'event2' },
      ];

      window.localStorage.setItem(AppConfig.EVENT_STORAGE.STORAGE_KEY, JSON.stringify(events));

      const loaded = EventStore.loadEvents();
      expect(loaded).to.have.lengthOf(2);
      expect(loaded[0].id).to.equal(1);
    });

    it('should return empty array if no events stored', function () {
      const loaded = EventStore.loadEvents();
      expect(loaded).to.be.an('array').that.is.empty;
    });

    it('should return empty array if localStorage has invalid JSON', function () {
      window.localStorage.setItem(AppConfig.EVENT_STORAGE.STORAGE_KEY, 'invalid json');

      const loaded = EventStore.loadEvents();
      expect(loaded).to.be.an('array').that.is.empty;
    });
  });

  describe('addEvent', function () {
    it('should not modify original array', function () {
      const events = [{ id: 1, data: 'event1' }];
      const newEvent = { id: 2, data: 'event2' };

      const result = EventStore.addEvent(events, newEvent);

      // Original array should not be modified
      expect(events).to.have.lengthOf(1);
      // Should return true on success
      expect(result).to.be.true;
    });

    it('should automatically save to localStorage', function () {
      const events = [];
      const newEvent = { id: 1, data: 'event1' };

      const result = EventStore.addEvent(events, newEvent);

      expect(result).to.be.true;
      const stored = JSON.parse(window.localStorage.getItem(AppConfig.EVENT_STORAGE.STORAGE_KEY));
      expect(stored).to.have.lengthOf(1);
      expect(stored[0].id).to.equal(1);
    });
  });

  describe('clearEvents', function () {
    it('should clear events from localStorage', function () {
      const events = [{ id: 1, data: 'event1' }];
      EventStore.saveEvents(events);

      EventStore.clearEvents();

      const stored = window.localStorage.getItem(AppConfig.EVENT_STORAGE.STORAGE_KEY);
      expect(stored).to.be.null;
    });
  });

  describe('isEnabled', function () {
    it('should return enabled status', function () {
      const enabled = EventStore.isEnabled();
      // Should be true if both config is enabled AND localStorage is available
      expect(enabled).to.be.a('boolean');
      expect(enabled).to.equal(AppConfig.EVENT_STORAGE.ENABLED);
    });
  });

  describe('getStats', function () {
    it('should return statistics', function () {
      const events = [
        { id: 1, data: 'event1' },
        { id: 2, data: 'event2' },
      ];
      EventStore.saveEvents(events);

      const stats = EventStore.getStats();
      expect(stats.eventCount).to.equal(2);
      expect(stats.maxEvents).to.equal(AppConfig.EVENT_STORAGE.MAX_EVENTS);
      expect(stats.enabled).to.equal(EventStore.isEnabled());
    });
  });
});
