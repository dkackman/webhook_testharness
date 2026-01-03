/**
 * Enhanced fetch utilities with timeout, retry logic, caching, and better error handling
 */

// Cache for API responses
var cache = new Map();

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
 * Fetches data with timeout support
 * @param {string} url - The URL to fetch
 * @param {number} timeout - Timeout in milliseconds (default: 10000)
 * @returns {Promise<any>} The JSON response
 */
function fetchWithTimeout(url, timeout) {
  timeout = timeout || (window.AppConfig && window.AppConfig.TIMEOUTS.FETCH) || 10000;

  var controller = new AbortController();
  var timeoutId = setTimeout(function () {
    controller.abort();
  }, timeout);

  return fetch(url, { signal: controller.signal })
    .then(function (response) {
      clearTimeout(timeoutId);
      if (!response.ok) {
        var statusCode = response.status;
        return response
          .json()
          .then(function (err) {
            var error = new Error(
              err.message || err.error || 'Request failed with status ' + statusCode
            );
            error.statusCode = statusCode;
            throw error;
          })
          .catch(function (parseError) {
            // If JSON parsing fails, throw original error with status
            if (parseError.statusCode) throw parseError;
            var error = new Error('Request failed with status ' + statusCode);
            error.statusCode = statusCode;
            throw error;
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
 * @returns {Promise<any>} The JSON response
 */
function fetchWithRetry(url, options) {
  options = options || {};
  var maxRetries = options.maxRetries !== undefined ? options.maxRetries : 3;
  var initialDelay = options.initialDelay || 1000;
  var timeout = options.timeout;

  function attempt(retryCount) {
    return fetchWithTimeout(url, timeout).catch(function (error) {
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
 * Evicts old cache entries if cache size exceeds MAX_CACHE_SIZE
 */
function evictOldCacheEntries() {
  if (cache.size <= AppConfig.CACHE.MAX_SIZE) return;

  // Convert to array, sort by timestamp (oldest first), and remove oldest entries
  var entries = Array.from(cache.entries());
  entries.sort(function (a, b) {
    return a[1].timestamp - b[1].timestamp;
  });

  var entriesToRemove = cache.size - AppConfig.CACHE.MAX_SIZE;
  for (var i = 0; i < entriesToRemove; i++) {
    cache.delete(entries[i][0]);
  }
}

/**
 * Fetches data with caching support
 * @param {string} url - The URL to fetch
 * @param {Object} [options] - Options object
 * @param {number} [options.timeout] - Timeout in milliseconds
 * @param {number} [options.maxRetries] - Maximum number of retries
 * @param {number} [options.initialDelay] - Initial retry delay in ms
 * @param {boolean} [options.skipCache] - Skip cache and force fresh fetch
 * @param {number} [options.cacheTTL] - Custom cache TTL in ms (default: 5 minutes)
 * @returns {Promise<any>} The JSON response
 */
function fetchWithCache(url, options) {
  options = options || {};
  var cacheTTL = options.cacheTTL !== undefined ? options.cacheTTL : AppConfig.CACHE.TTL;
  var skipCache = options.skipCache || false;

  // Check cache first (unless skipCache is true)
  if (!skipCache) {
    var cached = cache.get(url);
    var now = Date.now();

    if (cached && now - cached.timestamp < cacheTTL) {
      if (window.logger) {
        window.logger.log('Using cached data for:', url);
      }
      return Promise.resolve(cached.data);
    }
  }

  // Fetch fresh data
  return fetchWithRetry(url, options).then(function (data) {
    // Store in cache
    cache.set(url, {
      data: data,
      timestamp: Date.now(),
    });

    // Evict old entries if cache is too large
    evictOldCacheEntries();

    return data;
  });
}

/**
 * Clears the entire cache
 */
function clearCache() {
  cache.clear();
  if (window.logger) {
    window.logger.log('Cache cleared');
  }
}

/**
 * Clears cache entries matching a URL pattern
 * @param {RegExp|string} pattern - Pattern to match URLs against
 */
function clearCachePattern(pattern) {
  var regex = typeof pattern === 'string' ? new RegExp(pattern) : pattern;
  var keys = Array.from(cache.keys());

  keys.forEach(function (key) {
    if (regex.test(key)) {
      cache.delete(key);
    }
  });

  if (window.logger) {
    window.logger.log('Cache cleared for pattern:', pattern);
  }
}

/**
 * Gets cache statistics
 * @returns {Object} Cache stats
 */
function getCacheStats() {
  var now = Date.now();
  var entries = Array.from(cache.entries());

  return {
    size: cache.size,
    maxSize: AppConfig.CACHE.MAX_SIZE,
    entries: entries.map(function (entry) {
      return {
        url: entry[0],
        age: Math.round((now - entry[1].timestamp) / 1000) + 's',
        expiresIn: Math.round((AppConfig.CACHE.TTL - (now - entry[1].timestamp)) / 1000) + 's',
      };
    }),
  };
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
  window.fetchWithCache = fetchWithCache;
  window.buildUrl = buildUrl;
  window.clearCache = clearCache;
  window.clearCachePattern = clearCachePattern;
  window.getCacheStats = getCacheStats;
}

// Export for modules
if (typeof module !== 'undefined' && module.exports) {
  module.exports = {
    fetchWithTimeout: fetchWithTimeout,
    fetchWithRetry: fetchWithRetry,
    fetchWithCache: fetchWithCache,
    buildUrl: buildUrl,
    clearCache: clearCache,
    clearCachePattern: clearCachePattern,
    getCacheStats: getCacheStats,
  };
}
