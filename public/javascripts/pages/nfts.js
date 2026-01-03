/**
 * NFTs page functionality
 */
(function () {
  'use strict';

  // DOM elements
  var $form = document.getElementById('nft-form');
  var $input = document.getElementById('launcher-ids-input');

  // State manager for main section
  var mainState = createStateManager({
    loading: 'loading',
    error: 'error',
    errorMessage: 'error-message',
    container: 'nfts-container',
    data: 'nfts-data',
  });

  /**
   * Displays NFT data
   * @param {Object} data - The NFT data to display
   */
  function showData(data) {
    mainState.showData();
    renderJsonWithSyntax(mainState.elements.data, data);
  }

  /**
   * Fetches NFT data from the API
   * @param {string} launcherIds - Comma-separated launcher IDs
   */
  function fetchNFTs(launcherIds) {
    if (!launcherIds) {
      return;
    }

    // Validate input
    var validation = validateLauncherIds(launcherIds);
    if (!validation.valid) {
      mainState.showError(validation.error);
      return;
    }

    mainState.showLoading();

    // Update URL
    var url = new URL(window.location);
    url.searchParams.set('launcher_ids', launcherIds);
    window.history.pushState({}, '', url);

    // Fetch with caching and retry logic
    var fetchUrl = buildUrl(AppConfig.API.GET_NFTS, { launcher_ids: launcherIds });
    fetchWithCache(fetchUrl, { maxRetries: 2 })
      .then(showData)
      .catch(function (error) {
        logger.error('Failed to fetch NFTs:', error);
        mainState.showError('Failed to fetch NFTs: ' + error.message);
      });
  }

  /**
   * Handles form submission
   * @param {Event} e - The submit event
   */
  function handleSubmit(e) {
    e.preventDefault();
    var launcherIds = $input.value.trim();
    if (launcherIds) {
      fetchNFTs(launcherIds);
    }
  }

  // Event listeners
  $form.addEventListener('submit', handleSubmit);

  // Auto-fetch if launcher_ids in URL
  var urlParams = new URLSearchParams(window.location.search);
  var initialLauncherIds = urlParams.get('launcher_ids');
  if (initialLauncherIds) {
    $input.value = initialLauncherIds;
    fetchNFTs(initialLauncherIds);
  }
})();
