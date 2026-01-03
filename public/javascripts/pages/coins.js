/**
 * Coins page functionality
 * Uses pageModule factory to eliminate duplication
 */
(function () {
  'use strict';

  var coinsModule = createPageModule({
    formId: 'coin-form',
    inputId: 'coin-ids-input',
    entityType: 'coins',
    apiEndpoint: AppConfig.API.GET_COINS,
    validateFunction: validateCoinIds,
    urlParamName: 'coin_ids',
    stateConfig: {
      loading: 'loading',
      error: 'error',
      errorMessage: 'error-message',
      container: 'coins-container',
      data: 'coins-data',
    },
  });

  coinsModule.init();
})();
