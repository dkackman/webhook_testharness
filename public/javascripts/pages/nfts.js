/**
 * NFTs page functionality
 * Uses pageModule factory to eliminate duplication
 */
(function () {
  'use strict';

  var nftsModule = createPageModule({
    formId: 'nft-form',
    inputId: 'launcher-ids-input',
    entityType: 'NFTs',
    apiEndpoint: AppConfig.API.GET_NFTS,
    validateFunction: validateLauncherIds,
    urlParamName: 'launcher_ids',
    stateConfig: createDefaultStateConfig('nfts'),
  });

  nftsModule.init();
})();
