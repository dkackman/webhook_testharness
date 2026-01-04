/**
 * JSON rendering utilities using highlight.js with smart linking
 */

/**
 * Link configurations for specific JSON fields
 */
var jsonLinkConfigs = {
  asset_hash: { route: '/assets', param: 'asset_ids' },
  launcher_id: { route: '/nfts', param: 'launcher_ids' },
};

/**
 * Post-processes highlighted JSON HTML to add links for specific fields
 * @param {string} html - The highlighted HTML from highlight.js
 * @returns {string} - HTML with links added for configured fields
 */
function addLinksToHighlightedJson(html) {
  // Pattern to match key-value pairs where key is a linkable field
  // highlight.js outputs: <span class="hljs-attr">&quot;key&quot;</span><span class="hljs-punctuation">:</span> <span class="hljs-string">&quot;value&quot;</span>
  var linkableKeys = Object.keys(jsonLinkConfigs).join('|');
  var pattern = new RegExp(
    '<span class="hljs-attr">&quot;(' +
      linkableKeys +
      ')&quot;</span><span class="hljs-punctuation">:</span>\\s*<span class="hljs-string">&quot;([^&]+)&quot;</span>',
    'g'
  );

  return html.replace(pattern, function (match, key, value) {
    var config = jsonLinkConfigs[key];
    var href = config.route + '?' + config.param + '=' + encodeURIComponent(value);
    return (
      '<span class="hljs-attr">&quot;' +
      key +
      '&quot;</span><span class="hljs-punctuation">:</span> <span class="hljs-string">&quot;<a href="' +
      href +
      '">' +
      value +
      '</a>&quot;</span>'
    );
  });
}

/**
 * Renders JSON with syntax highlighting and smart links using highlight.js
 * @param {HTMLElement} container - The container element to render into
 * @param {Object} data - The data to render as JSON
 */
function renderJsonWithSyntax(container, data) {
  var jsonStr = JSON.stringify(data, null, 2);

  // Use highlight.js to highlight the JSON
  var highlighted = hljs.highlight(jsonStr, { language: 'json' });

  // Add links for specific fields
  var htmlWithLinks = addLinksToHighlightedJson(highlighted.value);

  // Sanitize with DOMPurify before inserting into the DOM
  // Allow anchor tags and highlight.js span classes
  var sanitized = DOMPurify.sanitize(htmlWithLinks, {
    ALLOWED_TAGS: ['span', 'a'],
    ALLOWED_ATTR: ['class', 'href'],
  });

  container.innerHTML = sanitized;
}

// Export for use in other modules (if using modules) or make globally available
if (typeof module !== 'undefined' && module.exports) {
  module.exports = { renderJsonWithSyntax };
}
