/**
 * Page Module Factory
 * Creates standardized page modules for entity detail pages (coins, assets, NFTs, etc.)
 * Eliminates code duplication across similar pages
 */

/**
 * Creates a default state configuration object
 * @param {string} prefix - Element ID prefix (e.g., 'coins', 'assets', 'nfts')
 * @returns {Object} State configuration object with standard element IDs
 */
function createDefaultStateConfig(prefix) {
  'use strict';

  return {
    loading: 'loading',
    error: 'error',
    errorMessage: 'error-message',
    container: prefix + '-container',
    data: prefix + '-data',
  };
}

/**
 * Creates a page module with standard functionality
 * @param {Object} config - Page configuration
 * @param {string} config.formId - Form element ID
 * @param {string} config.inputId - Input element ID
 * @param {string} config.entityType - Human-readable entity type (e.g., 'coins', 'assets', 'NFTs')
 * @param {string} config.apiEndpoint - API endpoint from AppConfig.API
 * @param {Function} config.validateFunction - Validation function to use
 * @param {string} config.urlParamName - URL parameter name (e.g., 'coin_ids', 'asset_ids')
 * @param {Object} config.stateConfig - State manager configuration object
 * @returns {Object} Page module with init method
 */
function createPageModule(config) {
  'use strict';

  // Validate required configuration
  var required = [
    'formId',
    'inputId',
    'entityType',
    'apiEndpoint',
    'validateFunction',
    'urlParamName',
    'stateConfig',
  ];
  for (var i = 0; i < required.length; i++) {
    if (!config[required[i]]) {
      throw new Error('Missing required config: ' + required[i]);
    }
  }

  // DOM elements
  var $form = document.getElementById(config.formId);
  var $input = document.getElementById(config.inputId);

  if (!$form) {
    throw new Error('Form element not found: ' + config.formId);
  }
  if (!$input) {
    throw new Error('Input element not found: ' + config.inputId);
  }

  // State manager for main section
  var mainState = createStateManager(config.stateConfig);

  /**
   * Displays entity data
   * @param {Object} data - The data to display
   */
  function showData(data) {
    mainState.showData();
    renderJsonWithSyntax(mainState.elements.data, data);
  }

  /**
   * Fetches entity data from the API
   * @param {string} ids - Comma-separated entity IDs
   */
  function fetchData(ids) {
    if (!ids) {
      return;
    }

    // Validate input
    var validation = config.validateFunction(ids);
    if (!validation.valid) {
      mainState.showError(validation.error);
      return;
    }

    mainState.showLoading();

    // Update URL
    updateUrlParam(config.urlParamName, ids);

    // Build fetch URL
    var params = {};
    params[config.urlParamName] = ids;
    var fetchUrl = buildUrl(config.apiEndpoint, params);

    // Fetch with caching and retry logic
    fetchWithCache(fetchUrl, { maxRetries: 2 })
      .then(showData)
      .catch(createFetchErrorHandler(config.entityType, mainState));
  }

  /**
   * Initializes the page module
   */
  function init() {
    // Event listeners
    $form.addEventListener('submit', createFormSubmitHandler($input, fetchData));

    // Auto-fetch if parameter in URL
    autoLoadFromUrl(config.urlParamName, $input, fetchData);
  }

  // Public API
  return {
    init: init,
    fetchData: fetchData,
  };
}

// Make available globally
if (typeof window !== 'undefined') {
  window.createDefaultStateConfig = createDefaultStateConfig;
  window.createPageModule = createPageModule;
}

// Export for modules
if (typeof module !== 'undefined' && module.exports) {
  module.exports = createPageModule;
}
