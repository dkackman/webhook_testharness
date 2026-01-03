/**
 * Coins page functionality
 */
(function() {
  'use strict';

  // DOM elements
  var $form = document.getElementById('coin-form');
  var $input = document.getElementById('coin-ids-input');

  // State manager for main section
  var mainState = createStateManager({
    loading: 'loading',
    error: 'error',
    errorMessage: 'error-message',
    container: 'coins-container',
    data: 'coins-data'
  });

  /**
   * Displays coin data
   * @param {Object} data - The coin data to display
   */
  function showData(data) {
    mainState.showData();
    renderJsonWithSyntax(mainState.elements.data, data);
  }

  /**
   * Fetches coin data from the API
   * @param {string} coinIds - Comma-separated coin IDs
   */
  function fetchCoins(coinIds) {
    if (!coinIds) {
      return;
    }

    // Validate input
    var validation = validateCoinIds(coinIds);
    if (!validation.valid) {
      mainState.showError(validation.error);
      return;
    }

    mainState.showLoading();

    // Update URL
    var url = new URL(window.location);
    url.searchParams.set('coin_ids', coinIds);
    window.history.pushState({}, '', url);

    // Fetch with caching and retry logic
    var fetchUrl = buildUrl(AppConfig.API.GET_COINS, { coin_ids: coinIds });
    fetchWithCache(fetchUrl, { maxRetries: 2 })
      .then(showData)
      .catch(function(error) {
        logger.error('Failed to fetch coins:', error);
        mainState.showError('Failed to fetch coins: ' + error.message);
      });
  }

  /**
   * Handles form submission
   * @param {Event} e - The submit event
   */
  function handleSubmit(e) {
    e.preventDefault();
    var coinIds = $input.value.trim();
    if (coinIds) {
      fetchCoins(coinIds);
    }
  }

  // Event listeners
  $form.addEventListener('submit', handleSubmit);

  // Auto-fetch if coin_ids in URL
  var urlParams = new URLSearchParams(window.location.search);
  var initialCoinIds = urlParams.get('coin_ids');
  if (initialCoinIds) {
    $input.value = initialCoinIds;
    fetchCoins(initialCoinIds);
  }
})();
