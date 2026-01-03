/**
 * Assets page functionality
 * Uses pageModule factory to eliminate duplication
 */
(function () {
  'use strict';

  var assetsModule = createPageModule({
    formId: 'asset-form',
    inputId: 'asset-ids-input',
    entityType: 'assets',
    apiEndpoint: AppConfig.API.GET_ASSETS,
    validateFunction: validateAssetIds,
    urlParamName: 'asset_ids',
    stateConfig: {
      loading: 'loading',
      error: 'error',
      errorMessage: 'error-message',
      container: 'assets-container',
      data: 'assets-data',
    },
  });

  assetsModule.init();
})();
