/**
 * Input validation utilities
 */

/**
 * Validates a hex string (like transaction IDs, coin IDs, asset IDs)
 * @param {string} value - The value to validate
 * @param {number} [exactLength] - Optional exact length requirement
 * @returns {Object} Validation result with { valid: boolean, error: string }
 */
function validateHexString(value, exactLength) {
  if (!value || typeof value !== 'string') {
    return { valid: false, error: 'Value is required' };
  }

  var trimmed = value.trim();

  if (trimmed.length === 0) {
    return { valid: false, error: 'Value cannot be empty' };
  }

  // Check if it's a valid hex string
  var hexPattern = /^[0-9a-fA-F]+$/;
  if (!hexPattern.test(trimmed)) {
    return {
      valid: false,
      error: 'Value must contain only hexadecimal characters (0-9, a-f, A-F)',
    };
  }

  // Check exact length if specified
  if (exactLength && trimmed.length !== exactLength) {
    return { valid: false, error: 'Value must be exactly ' + exactLength + ' characters long' };
  }

  // Check even length (hex strings should be even)
  if (trimmed.length % 2 !== 0) {
    return { valid: false, error: 'Hex string must have an even number of characters' };
  }

  return { valid: true, value: trimmed };
}

/**
 * Validates a comma-separated list of hex strings
 * @param {string} value - The value to validate
 * @param {number} [exactLength] - Optional exact length requirement for each ID
 * @returns {Object} Validation result with { valid: boolean, error: string, values: array }
 */
function validateHexList(value, exactLength) {
  if (!value || typeof value !== 'string') {
    return { valid: false, error: 'Value is required' };
  }

  var trimmed = value.trim();

  if (trimmed.length === 0) {
    return { valid: false, error: 'Value cannot be empty' };
  }

  // Split by comma and trim each
  var ids = trimmed.split(',').map(function (id) {
    return id.trim();
  });

  // Remove empty strings
  ids = ids.filter(function (id) {
    return id.length > 0;
  });

  if (ids.length === 0) {
    return { valid: false, error: 'At least one valid ID is required' };
  }

  // Validate each ID
  for (var i = 0; i < ids.length; i++) {
    var result = validateHexString(ids[i], exactLength);
    if (!result.valid) {
      return { valid: false, error: 'ID ' + (i + 1) + ': ' + result.error };
    }
  }

  return { valid: true, values: ids };
}

/**
 * Validates a transaction ID (64 hex characters)
 * @param {string} value - The transaction ID to validate
 * @returns {Object} Validation result
 */
function validateTransactionId(value) {
  return validateHexString(value, 64);
}

/**
 * Validates a list of coin IDs (64 hex characters each)
 * @param {string} value - Comma-separated coin IDs
 * @returns {Object} Validation result
 */
function validateCoinIds(value) {
  return validateHexList(value, 64);
}

/**
 * Validates a list of asset IDs (64 hex characters each)
 * @param {string} value - Comma-separated asset IDs
 * @returns {Object} Validation result
 */
function validateAssetIds(value) {
  return validateHexList(value, 64);
}

/**
 * Validates a list of launcher IDs (NFT IDs - 64 hex characters each)
 * @param {string} value - Comma-separated launcher IDs
 * @returns {Object} Validation result
 */
function validateLauncherIds(value) {
  return validateHexList(value, 64);
}

// Make available globally
if (typeof window !== 'undefined') {
  window.validateHexString = validateHexString;
  window.validateHexList = validateHexList;
  window.validateTransactionId = validateTransactionId;
  window.validateCoinIds = validateCoinIds;
  window.validateAssetIds = validateAssetIds;
  window.validateLauncherIds = validateLauncherIds;
}

// Export for modules
if (typeof module !== 'undefined' && module.exports) {
  module.exports = {
    validateHexString: validateHexString,
    validateHexList: validateHexList,
    validateTransactionId: validateTransactionId,
    validateCoinIds: validateCoinIds,
    validateAssetIds: validateAssetIds,
    validateLauncherIds: validateLauncherIds,
  };
}
