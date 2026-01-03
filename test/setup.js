/**
 * Test setup - configures jsdom for browser environment simulation
 */

import { JSDOM } from 'jsdom';

// Create a DOM environment
const dom = new JSDOM('<!DOCTYPE html><html><body></body></html>', {
  url: 'http://localhost:3000',
  pretendToBeVisual: true,
});

// Set up global objects
global.window = dom.window;
global.document = dom.window.document;
global.navigator = dom.window.navigator;

// Mock localStorage
global.localStorage = {
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

// Mock sessionStorage
global.sessionStorage = {
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

/**
 * Reset localStorage and sessionStorage between tests
 */
export function resetStorage() {
  global.localStorage.clear();
  global.sessionStorage.clear();
}
