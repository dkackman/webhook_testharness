/**
 * State management utilities for consistent UI state handling
 */

/**
 * Manages the display state of a UI section (loading, error, data states)
 * @param {Object} elements - Object containing DOM elements
 * @param {HTMLElement} elements.container - Main container element
 * @param {HTMLElement} elements.loading - Loading state element
 * @param {HTMLElement} elements.error - Error state element
 * @param {HTMLElement} elements.errorMessage - Error message element
 * @param {HTMLElement} elements.data - Data display element
 * @param {string} state - The state to display: 'loading', 'error', 'data', 'hidden'
 * @param {string} [message] - Optional message for error state
 */
function setState(elements, state, message) {
  // Validate inputs
  if (!elements || typeof elements !== 'object') {
    if (window.logger) {
      window.logger.error('setState: elements parameter is required and must be an object');
    }
    return;
  }

  // Hide everything first
  if (elements.loading) elements.loading.style.display = 'none';
  if (elements.error) elements.error.style.display = 'none';
  if (elements.data) elements.data.style.display = 'none';

  // Show the appropriate state
  switch (state) {
    case 'loading':
      if (elements.container) elements.container.style.display = 'block';
      if (elements.loading) elements.loading.style.display = 'block';
      break;

    case 'error':
      if (elements.container) elements.container.style.display = 'block';
      if (elements.error) elements.error.style.display = 'block';
      if (elements.errorMessage && message) {
        elements.errorMessage.textContent = message;
      }
      break;

    case 'data':
      if (elements.container) elements.container.style.display = 'block';
      if (elements.data) elements.data.style.display = 'block';
      break;

    case 'hidden':
      if (elements.container) elements.container.style.display = 'none';
      break;

    default:
      if (window.logger) {
        window.logger.error(
          'setState: Invalid state "' + state + '". Must be "loading", "error", "data", or "hidden"'
        );
      }
  }
}

/**
 * Creates a state manager for a UI section
 * @param {Object} elementIds - Object containing element IDs
 * @param {string} [elementIds.container] - Container element ID
 * @param {string} [elementIds.loading] - Loading element ID
 * @param {string} [elementIds.error] - Error element ID
 * @param {string} [elementIds.errorMessage] - Error message element ID
 * @param {string} [elementIds.data] - Data element ID
 * @returns {Object} State manager with showLoading, showError, showData, hide methods
 */
function createStateManager(elementIds) {
  var elements = {
    container: elementIds.container ? document.getElementById(elementIds.container) : null,
    loading: elementIds.loading ? document.getElementById(elementIds.loading) : null,
    error: elementIds.error ? document.getElementById(elementIds.error) : null,
    errorMessage: elementIds.errorMessage ? document.getElementById(elementIds.errorMessage) : null,
    data: elementIds.data ? document.getElementById(elementIds.data) : null,
  };

  return {
    showLoading: function () {
      setState(elements, 'loading');
    },
    showError: function (message) {
      setState(elements, 'error', message);
    },
    showData: function () {
      setState(elements, 'data');
    },
    hide: function () {
      setState(elements, 'hidden');
    },
    elements: elements,
  };
}

// Make available globally
if (typeof window !== 'undefined') {
  window.setState = setState;
  window.createStateManager = createStateManager;
}

// Export for modules
if (typeof module !== 'undefined' && module.exports) {
  module.exports = { setState, createStateManager };
}
