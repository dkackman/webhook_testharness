/**
 * JSON rendering utilities with syntax highlighting and smart linking
 */

/**
 * Creates a colored span element for JSON syntax highlighting
 * @param {string} text - The text content
 * @param {string} className - CSS class name for styling
 * @returns {HTMLSpanElement}
 */
function createColoredSpan(text, className) {
  var span = document.createElement('span');
  span.className = className;
  span.textContent = text;
  return span;
}

/**
 * Creates a link element for specific JSON fields
 * @param {string} key - The JSON key name
 * @param {string} value - The value (with quotes)
 * @param {string} className - CSS class for the link
 * @returns {HTMLAnchorElement|null}
 */
function createFieldLink(key, value, className) {
  var linkConfigs = {
    asset_hash: { route: '/assets', param: 'asset_ids' },
    launcher_id: { route: '/nfts', param: 'launcher_ids' },
    // Add more linkable fields here as needed
    // 'coin_id': { route: '/coins', param: 'coin_ids' }
  };

  var config = linkConfigs[key];
  if (!config) return null;

  var cleanValue = value.replace(/^"|"$/g, '');
  var link = document.createElement('a');
  link.href = config.route + '?' + config.param + '=' + encodeURIComponent(cleanValue);
  link.className = className;
  link.textContent = value;
  return link;
}

/**
 * Renders JSON with syntax highlighting and smart links
 * @param {HTMLElement} container - The container element to render into
 * @param {Object} data - The data to render as JSON
 */
function renderJsonWithSyntax(container, data) {
  container.textContent = '';
  var jsonStr = JSON.stringify(data, null, 2);
  var fragment = document.createDocumentFragment();
  var pattern =
    /("(\\u[a-zA-Z0-9]{4}|\\[^u]|[^\\"])*"(\s*:)?|\b(true|false|null)\b|-?\d+(?:\.\d*)?(?:[eE][+-]?\d+)?)/g;
  var lastIndex = 0;
  var lastKey = null;
  var match;

  // Iterate through regex matches
  pattern.lastIndex = 0;
  while ((match = pattern.exec(jsonStr)) !== null) {
    var matchStart = match.index;

    // Add any text between matches
    if (matchStart > lastIndex) {
      fragment.appendChild(document.createTextNode(jsonStr.slice(lastIndex, matchStart)));
    }

    var value = match[0];
    var cls = 'json-number';

    if (/^"/.test(value)) {
      if (/:$/.test(value)) {
        // This is a key
        cls = 'json-key';
        lastKey = value.replace(/^"|":$/g, '');
      } else {
        // This is a string value
        cls = 'json-string';

        // Check if this value should be a link
        if (lastKey) {
          var link = createFieldLink(lastKey, value, cls);
          if (link) {
            fragment.appendChild(link);
            lastIndex = pattern.lastIndex;
            lastKey = null;
            continue;
          }
        }
        lastKey = null;
      }
    } else if (/true|false/.test(value)) {
      cls = 'json-boolean';
      lastKey = null;
    } else if (/null/.test(value)) {
      cls = 'json-null';
      lastKey = null;
    } else {
      // number
      lastKey = null;
    }

    fragment.appendChild(createColoredSpan(value, cls));
    lastIndex = pattern.lastIndex;
  }

  // Add any remaining text
  if (lastIndex < jsonStr.length) {
    fragment.appendChild(document.createTextNode(jsonStr.slice(lastIndex)));
  }

  container.appendChild(fragment);
}

// Export for use in other modules (if using modules) or make globally available
if (typeof module !== 'undefined' && module.exports) {
  module.exports = { renderJsonWithSyntax };
}
