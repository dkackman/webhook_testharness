/**
 * Transaction page functionality
 */
(function () {
  'use strict';

  // DOM elements
  var $form = document.getElementById('transaction-form');
  var $input = document.getElementById('transaction-id-input');

  // State managers
  var mainState = createStateManager({
    loading: 'loading',
    error: 'error',
    errorMessage: 'error-message',
    container: 'transaction-container',
    data: 'transaction-data',
  });

  var inputCoinsState = createStateManager({
    container: 'input-coins-container',
    loading: 'input-coins-loading',
    error: 'input-coins-error',
    errorMessage: 'input-coins-error-message',
    data: 'input-coins-data',
  });

  var outputCoinsState = createStateManager({
    container: 'output-coins-container',
    loading: 'output-coins-loading',
    error: 'output-coins-error',
    errorMessage: 'output-coins-error-message',
    data: 'output-coins-data',
  });

  /**
   * Fetches coins for a specific type (input or output)
   * @param {Array<string>} coinIds - Array of coin IDs
   * @param {string} type - Type: 'input' or 'output'
   */
  function fetchCoins(coinIds, type) {
    var state = type === 'input' ? inputCoinsState : outputCoinsState;

    state.showLoading();

    var coinIdsParam = coinIds.join(',');
    var fetchUrl = buildUrl(AppConfig.API.GET_COINS, { coin_ids: coinIdsParam });

    fetchWithCache(fetchUrl, { maxRetries: 2 })
      .then(function (coinsData) {
        state.showData();
        renderJsonWithSyntax(state.elements.data, coinsData);
      })
      .catch(createFetchErrorHandler(type + ' coins', state));
  }

  /**
   * Displays transaction data and triggers coin fetching
   * @param {Object} data - The transaction data
   */
  function showData(data) {
    mainState.showData();
    renderJsonWithSyntax(mainState.elements.data, data);

    // Extract coin IDs and fetch coins asynchronously
    if (data.transaction) {
      if (data.transaction.input_coin_ids && data.transaction.input_coin_ids.length > 0) {
        fetchCoins(data.transaction.input_coin_ids, 'input');
      }
      if (data.transaction.output_coin_ids && data.transaction.output_coin_ids.length > 0) {
        fetchCoins(data.transaction.output_coin_ids, 'output');
      }
    }
  }

  /**
   * Fetches transaction data from the API
   * @param {string} transactionId - The transaction ID
   */
  function fetchTransaction(transactionId) {
    if (!transactionId) {
      return;
    }

    // Validate input
    var validation = validateTransactionId(transactionId);
    if (!validation.valid) {
      mainState.showError(validation.error);
      return;
    }

    mainState.showLoading();

    // Hide coin sections
    inputCoinsState.hide();
    outputCoinsState.hide();

    // Update URL
    updateUrlParam('transaction_id', transactionId);

    // Fetch with caching and retry logic
    var fetchUrl = buildUrl(AppConfig.API.GET_TRANSACTION, { transaction_id: transactionId });
    fetchWithCache(fetchUrl, { maxRetries: 2 })
      .then(showData)
      .catch(createFetchErrorHandler('transaction', mainState));
  }

  // Event listeners
  $form.addEventListener('submit', createFormSubmitHandler($input, fetchTransaction));

  // Auto-fetch if transaction_id in URL
  autoLoadFromUrl('transaction_id', $input, fetchTransaction);
})();
