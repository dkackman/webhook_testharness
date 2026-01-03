/**
 * Common error handling utilities for fetch operations
 */

/**
 * Builds a detailed error message from a fetch error
 * @param {string} prefix - Error message prefix (e.g., 'Failed to fetch transaction')
 * @param {Error} error - The error object
 * @returns {string} Formatted error message with all available details
 */
function buildErrorMessage(prefix, error) {
  'use strict';

  var errorMsg = prefix + ': ' + error.message;

  if (error.statusCode) {
    errorMsg += ' (Status: ' + error.statusCode + ')';
  }

  if (error.responseBody && error.responseBody.error) {
    errorMsg += ' - ' + error.responseBody.error;
  }

  return errorMsg;
}

/**
 * Creates a standardized error handler for fetch operations
 * @param {string} entityType - Type of entity being fetched (e.g., 'transaction', 'coins')
 * @param {Object} state - State manager instance with showError method
 * @returns {Function} Error handler function for use in catch blocks
 */
function createFetchErrorHandler(entityType, state) {
  'use strict';

  return function (error) {
    logger.error('Failed to fetch ' + entityType + ':', error);

    try {
      var errorMsg = buildErrorMessage('Failed to fetch ' + entityType, error);
      state.showError(errorMsg);
    } catch (displayError) {
      logger.error('Critical: Failed to display error:', displayError);
    }
  };
}

/**
 * Handles form submission for entity detail pages
 * Creates a standard submit handler that prevents default, trims input, and calls callback
 * @param {HTMLInputElement} inputElement - The input element to get value from
 * @param {Function} callback - Callback function to call with trimmed value
 * @returns {Function} Event handler function for form submit
 */
function createFormSubmitHandler(inputElement, callback) {
  'use strict';

  return function (e) {
    e.preventDefault();
    var value = inputElement.value.trim();
    if (value) {
      callback(value);
    }
  };
}

/**
 * Auto-loads data if URL parameter is present
 * @param {string} paramName - URL parameter name (e.g., 'transaction_id')
 * @param {HTMLInputElement} inputElement - Input element to populate
 * @param {Function} callback - Callback function to call with parameter value
 */
function autoLoadFromUrl(paramName, inputElement, callback) {
  'use strict';

  var urlParams = new URLSearchParams(window.location.search);
  var paramValue = urlParams.get(paramName);

  if (paramValue) {
    inputElement.value = paramValue;
    callback(paramValue);
  }
}

/**
 * Updates the URL with a query parameter without page reload
 * @param {string} paramName - Parameter name
 * @param {string} paramValue - Parameter value
 */
function updateUrlParam(paramName, paramValue) {
  'use strict';

  var url = new URL(window.location);
  url.searchParams.set(paramName, paramValue);
  window.history.pushState({}, '', url);
}

// Make available globally
if (typeof window !== 'undefined') {
  window.createFetchErrorHandler = createFetchErrorHandler;
  window.createFormSubmitHandler = createFormSubmitHandler;
  window.autoLoadFromUrl = autoLoadFromUrl;
  window.updateUrlParam = updateUrlParam;
}

// Export for modules
if (typeof module !== 'undefined' && module.exports) {
  module.exports = {
    createFetchErrorHandler: createFetchErrorHandler,
    createFormSubmitHandler: createFormSubmitHandler,
    autoLoadFromUrl: autoLoadFromUrl,
    updateUrlParam: updateUrlParam,
  };
}
