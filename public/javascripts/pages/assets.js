/**
 * Assets page functionality
 */
(function() {
  'use strict';

  // DOM elements
  var $form = document.getElementById('asset-form');
  var $input = document.getElementById('asset-ids-input');

  // State manager for main section
  var mainState = createStateManager({
    loading: 'loading',
    error: 'error',
    errorMessage: 'error-message',
    container: 'assets-container',
    data: 'assets-data'
  });

  /**
   * Displays asset data
   * @param {Object} data - The asset data to display
   */
  function showData(data) {
    mainState.showData();
    renderJsonWithSyntax(mainState.elements.data, data);
  }

  /**
   * Fetches asset data from the API
   * @param {string} assetIds - Comma-separated asset IDs
   */
  function fetchAssets(assetIds) {
    if (!assetIds) {
      return;
    }

    // Validate input
    var validation = validateAssetIds(assetIds);
    if (!validation.valid) {
      mainState.showError(validation.error);
      return;
    }

    mainState.showLoading();

    // Update URL
    var url = new URL(window.location);
    url.searchParams.set('asset_ids', assetIds);
    window.history.pushState({}, '', url);

    // Fetch with caching and retry logic
    var fetchUrl = buildUrl(AppConfig.API.GET_ASSETS, { asset_ids: assetIds });
    fetchWithCache(fetchUrl, { maxRetries: 2 })
      .then(showData)
      .catch(function(error) {
        logger.error('Failed to fetch assets:', error);
        mainState.showError('Failed to fetch assets: ' + error.message);
      });
  }

  /**
   * Handles form submission
   * @param {Event} e - The submit event
   */
  function handleSubmit(e) {
    e.preventDefault();
    var assetIds = $input.value.trim();
    if (assetIds) {
      fetchAssets(assetIds);
    }
  }

  // Event listeners
  $form.addEventListener('submit', handleSubmit);

  // Auto-fetch if asset_ids in URL
  var urlParams = new URLSearchParams(window.location.search);
  var initialAssetIds = urlParams.get('asset_ids');
  if (initialAssetIds) {
    $input.value = initialAssetIds;
    fetchAssets(initialAssetIds);
  }
})();
