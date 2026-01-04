/**
 * Enhanced fetch utilities with timeout, retry logic, and better error handling
 */

/**
 * Sleeps for a specified duration
 * @param {number} ms - Milliseconds to sleep
 * @returns {Promise<void>}
 */
function sleep(ms) {
  return new Promise(function (resolve) {
    setTimeout(resolve, ms);
  });
}

/**
 * Checks if an error is retryable (network errors, timeouts, 5xx errors)
 * @param {Error} error - The error to check
 * @param {number} [statusCode] - HTTP status code if available
 * @returns {boolean}
 */
function isRetryableError(error, statusCode) {
  // Retry on timeout
  if (error.name === 'AbortError') return true;

  // Retry on network errors
  if (error.message.includes('network') || error.message.includes('Network')) return true;

  // Retry on 5xx server errors
  if (statusCode && statusCode >= 500 && statusCode < 600) return true;

  // Don't retry 4xx client errors
  if (statusCode && statusCode >= 400 && statusCode < 500) return false;

  return false;
}

/**
 * Creates a fetch error with status information
 * @param {number} statusCode - HTTP status code
 * @param {string} statusText - HTTP status text
 * @param {Object} [responseBody] - Parsed response body if available
 * @returns {Error}
 */
function createFetchError(statusCode, statusText, responseBody) {
  var message;
  if (responseBody && (responseBody.message || responseBody.error)) {
    message = responseBody.message || responseBody.error;
  } else {
    message =
      'Request failed with status ' + statusCode + (statusText ? ' (' + statusText + ')' : '');
  }

  var error = new Error(message);
  error.statusCode = statusCode;
  error.statusText = statusText;
  if (responseBody) {
    error.responseBody = responseBody;
  }
  return error;
}

/**
 * Fetches data with timeout support (fallback for browsers without AbortController)
 * @param {string} url - The URL to fetch
 * @param {Object} options - Fetch options
 * @param {number} options.timeout - Timeout in milliseconds
 * @param {string} [options.method] - HTTP method
 * @param {Object} [options.body] - Request body (will be JSON stringified)
 * @param {Object} [options.headers] - Request headers
 * @returns {Promise<any>} The JSON response
 */
function fetchWithTimeoutFallback(url, options) {
  var timeout = options.timeout;
  var fetchOptions = {};

  if (options.method) {
    fetchOptions.method = options.method;
  }
  if (options.body) {
    fetchOptions.body = JSON.stringify(options.body);
    fetchOptions.headers = Object.assign({ 'Content-Type': 'application/json' }, options.headers);
  } else if (options.headers) {
    fetchOptions.headers = options.headers;
  }

  return new Promise(function (resolve, reject) {
    var timeoutId = setTimeout(function () {
      reject(new Error('Request timed out'));
    }, timeout);

    fetch(url, fetchOptions)
      .then(function (response) {
        clearTimeout(timeoutId);
        resolve(response);
      })
      .catch(function (error) {
        clearTimeout(timeoutId);
        reject(error);
      });
  });
}

/**
 * Fetches data with timeout support
 * @param {string} url - The URL to fetch
 * @param {Object} [options] - Options object
 * @param {number} [options.timeout] - Timeout in milliseconds (default: 10000)
 * @param {string} [options.method] - HTTP method (default: GET)
 * @param {Object} [options.body] - Request body (will be JSON stringified)
 * @param {Object} [options.headers] - Additional headers
 * @returns {Promise<any>} The JSON response
 */
function fetchWithTimeout(url, options) {
  options = options || {};
  var timeout = options.timeout || (window.AppConfig && window.AppConfig.TIMEOUTS.FETCH) || 10000;

  // Build fetch options
  var fetchOptions = {};
  if (options.method) {
    fetchOptions.method = options.method;
  }
  if (options.body) {
    fetchOptions.body = JSON.stringify(options.body);
    fetchOptions.headers = Object.assign({ 'Content-Type': 'application/json' }, options.headers);
  } else if (options.headers) {
    fetchOptions.headers = options.headers;
  }

  // Check for AbortController support
  if (typeof AbortController === 'undefined') {
    if (window.logger) {
      window.logger.warn('AbortController not supported, using timeout fallback');
    }

    return fetchWithTimeoutFallback(url, Object.assign({ timeout: timeout }, options)).then(
      function (response) {
        if (!response.ok) {
          var statusCode = response.status;
          var statusText = response.statusText;
          return response
            .json()
            .then(function (body) {
              throw createFetchError(statusCode, statusText, body);
            })
            .catch(function (parseError) {
              if (parseError.statusCode) throw parseError;
              throw createFetchError(statusCode, statusText);
            });
        }
        return response.json();
      }
    );
  }

  // Use AbortController for modern browsers
  var controller = new AbortController();
  var timeoutId = setTimeout(function () {
    controller.abort();
  }, timeout);

  fetchOptions.signal = controller.signal;

  return fetch(url, fetchOptions)
    .then(function (response) {
      clearTimeout(timeoutId);
      if (!response.ok) {
        var statusCode = response.status;
        var statusText = response.statusText;
        return response
          .json()
          .then(function (body) {
            throw createFetchError(statusCode, statusText, body);
          })
          .catch(function (parseError) {
            if (parseError.statusCode) throw parseError;
            throw createFetchError(statusCode, statusText);
          });
      }
      return response.json();
    })
    .catch(function (error) {
      clearTimeout(timeoutId);
      if (error.name === 'AbortError') {
        var timeoutError = new Error(
          (window.AppConfig && window.AppConfig.ERRORS.FETCH_TIMEOUT) || 'Request timed out'
        );
        timeoutError.name = 'AbortError';
        throw timeoutError;
      }
      throw error;
    });
}

/**
 * Fetches data with retry logic using exponential backoff
 * @param {string} url - The URL to fetch
 * @param {Object} [options] - Options object
 * @param {number} [options.timeout] - Timeout in milliseconds (default: 10000)
 * @param {number} [options.maxRetries] - Maximum number of retries (default: 3)
 * @param {number} [options.initialDelay] - Initial retry delay in ms (default: 1000)
 * @param {string} [options.method] - HTTP method (default: GET)
 * @param {Object} [options.body] - Request body (will be JSON stringified)
 * @param {Object} [options.headers] - Additional headers
 * @returns {Promise<any>} The JSON response
 */
function fetchWithRetry(url, options) {
  options = options || {};
  var maxRetries = options.maxRetries !== undefined ? options.maxRetries : 3;
  var initialDelay = options.initialDelay || 1000;

  function attempt(retryCount) {
    return fetchWithTimeout(url, options).catch(function (error) {
      var shouldRetry = isRetryableError(error, error.statusCode);

      if (shouldRetry && retryCount < maxRetries) {
        // Exponential backoff: delay * 2^retryCount
        var delay = initialDelay * Math.pow(2, retryCount);
        if (window.logger) {
          window.logger.warn(
            'Request failed, retrying in ' +
              delay +
              'ms... (attempt ' +
              (retryCount + 1) +
              '/' +
              maxRetries +
              ')'
          );
        }

        return sleep(delay).then(function () {
          return attempt(retryCount + 1);
        });
      }

      // No more retries or non-retryable error
      throw error;
    });
  }

  return attempt(0);
}

/**
 * Builds a URL with query parameters
 * @param {string} baseUrl - The base URL
 * @param {Object} params - Query parameters as key-value pairs
 * @returns {string} The complete URL with query string
 */
function buildUrl(baseUrl, params) {
  var url = baseUrl;
  var queryString = Object.keys(params)
    .filter(function (key) {
      return params[key] != null;
    })
    .map(function (key) {
      return encodeURIComponent(key) + '=' + encodeURIComponent(params[key]);
    })
    .join('&');

  if (queryString) {
    url += '?' + queryString;
  }
  return url;
}

// Make available globally
if (typeof window !== 'undefined') {
  window.fetchWithTimeout = fetchWithTimeout;
  window.fetchWithRetry = fetchWithRetry;
  window.buildUrl = buildUrl;
}

// Export for modules
if (typeof module !== 'undefined' && module.exports) {
  module.exports = {
    fetchWithTimeout: fetchWithTimeout,
    fetchWithRetry: fetchWithRetry,
    buildUrl: buildUrl,
  };
}
