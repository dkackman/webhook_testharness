// Cookie management functions
function setCookie(name, value, days = 365) {
  const expires = new Date(Date.now() + days * 864e5).toUTCString();
  document.cookie = `${name}=${encodeURIComponent(value)}; expires=${expires}; path=/`;
}

function getCookie(name) {
  const value = `; ${document.cookie}`;
  const parts = value.split(`; ${name}=`);
  if (parts.length === 2) return decodeURIComponent(parts.pop().split(';').shift());
  return null;
}

function deleteCookie(name) {
  document.cookie = `${name}=; expires=Thu, 01 Jan 1970 00:00:00 UTC; path=/`;
}

// Webhook state management
let webhookId = getCookie('webhookId');
let webhookSecret = getCookie('webhookSecret');

let eventHistory = [];

function setBadge($el, text, variant) {
  const variants = [
    'text-bg-secondary',
    'text-bg-success',
    'text-bg-danger',
    'text-bg-warning',
    'text-bg-info',
    'text-bg-light',
    'text-bg-dark',
  ];
  variants.forEach((v) => $el.removeClass(v));
  $el.addClass(`text-bg-${variant}`).text(text);
}

function updateButtonStates() {
  if (webhookId) {
    $('#register-btn').hide();
    $('#unregister-btn').show();
    $('#secret-input').prop('disabled', true);
    $('#response-display').text(`Webhook registered (ID: ${webhookId})`);
    setBadge($('#webhook-status'), 'Registered', 'success');
  } else {
    $('#register-btn').show();
    $('#unregister-btn').hide();
    $('#secret-input').prop('disabled', false);
    setBadge($('#webhook-status'), 'Not registered', 'secondary');
  }
  
  if (webhookSecret) {
    setBadge($('#verification-enabled'), 'Enabled', 'success');
    $('#verification-status')
      .removeClass('alert-secondary alert-danger')
      .addClass('alert-success');
  } else {
    setBadge($('#verification-enabled'), 'Disabled', 'secondary');
    $('#verification-status')
      .removeClass('alert-success alert-danger')
      .addClass('alert-secondary');
  }
}

// Sync secret to server on page load if it exists
if (webhookSecret) {
  $('#secret-input').val(webhookSecret);
  fetch('/sync_secret', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json'
    },
    body: JSON.stringify({ secret: webhookSecret })
  }).then(() => {
    console.log('Secret synced to server');
  }).catch(err => {
    console.error('Failed to sync secret:', err);
  });
}

function clearWebhookEvents() {
  eventHistory = [];
  $('#webhook-events').html('Webhook events cleared. Waiting for new events...');
  webhookEventCount = 0;
}

function registerWebhook() {
  clearWebhookEvents();
  
  const secret = $('#secret-input').val().trim();
  webhookSecret = secret || null;
  
  if (webhookSecret) {
    setCookie('webhookSecret', webhookSecret);
  } else {
    deleteCookie('webhookSecret');
  }
  
  // Build request body
  const requestBody = { 
    url: 'http://localhost:3000/sage_hook'
  };
  
  if (webhookSecret) {
    requestBody.secret = webhookSecret;
  }
  
  fetch('/proxy/register_webhook', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json'
    },
    body: JSON.stringify(requestBody),
  })
  .then(response => response.json())
  .then(data => {
    // Display proxy connection status
    let statusMessage = '';
    if (data.proxy_status === 'success') {
      statusMessage = '✅ ' + data.proxy_message + '\n\n';
      if (data.webhook_id) {
        webhookId = data.webhook_id;
        setCookie('webhookId', webhookId);
        updateButtonStates();
      }
    } else if (data.proxy_status === 'error') {
      statusMessage = '❌ ' + data.proxy_message + '\n';
      statusMessage += 'Details: ' + (data.error || data.details || 'Unknown error') + '\n\n';
    }
    
    $('#response-display').text(statusMessage + JSON.stringify(data, null, 2));
  })
  .catch(error => {
    console.error('Error:', error);
    $('#response-display').text('❌ Network Error: ' + error.message);
  });
}

function unregisterWebhook() {
  if (!webhookId) {
    $('#response-display').text('Error: No webhook_id available. Please register a webhook first.');
    return;
  }

  clearWebhookEvents();

  fetch('/proxy/unregister_webhook', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json'
    },
    body: JSON.stringify({ webhook_id: webhookId }),
  })
  .then(response => response.json())
  .then(data => {
    // Display proxy connection status
    let statusMessage = '';
    if (data.proxy_status === 'success') {
      statusMessage = '✅ ' + data.proxy_message + '\n\n';
      webhookId = null;
      webhookSecret = null;
      deleteCookie('webhookId');
      deleteCookie('webhookSecret');
      $('#secret-input').val('');
      updateButtonStates();

      // Clear event history on unregister.
      eventHistory = [];
      $('#webhook-events').html('No webhook events yet');
      webhookEventCount = 0;
    } else if (data.proxy_status === 'error') {
      statusMessage = '❌ ' + data.proxy_message + '\n';
      statusMessage += 'Details: ' + (data.error || data.details || 'Unknown error') + '\n\n';
    }
    
    $('#response-display').text(statusMessage + JSON.stringify(data, null, 2));
  })
  .catch(error => {
    console.error('Error:', error);
    $('#response-display').text('❌ Network Error: ' + error.message);
  });
}

// Server-Sent Events management
let eventSource = null;
let webhookEventCount = 0;

function addSystemLog(message, variant = 'secondary') {
  const container = document.getElementById('webhook-events');
  if (!container) return;

  if (
    container.innerHTML === 'No webhook events yet' ||
    container.innerHTML.includes('Webhook events cleared')
  ) {
    container.innerHTML = '';
  }

  const wrapper = document.createElement('div');
  wrapper.className = 'mb-3 pb-3 border-bottom';

  const header = document.createElement('div');
  header.className = `fw-semibold text-${variant}`;
  header.textContent = message;
  wrapper.appendChild(header);

  container.insertBefore(wrapper, container.firstChild);
}

function renderEventToDom(displayEvent) {
  const container = document.getElementById('webhook-events');
  if (!container) return;

  const currentContent = container.innerHTML;
  if (
    currentContent === 'No webhook events yet' ||
    currentContent.includes('Webhook events cleared') ||
    currentContent.includes('Connected')
  ) {
    container.innerHTML = '';
  }

  if (displayEvent.event === 'system') {
    const wrapper = document.createElement('div');
    wrapper.className = 'mb-3 pb-3 border-bottom';
    const header = document.createElement('div');
    header.className = `fw-semibold text-${displayEvent.data?.variant || 'secondary'}`;
    header.textContent = displayEvent.data?.message || 'System';
    wrapper.appendChild(header);
    container.insertBefore(wrapper, container.firstChild);
    return;
  }

  // For webhook/connected events, reuse existing renderer
  displayWebhookEvent(displayEvent);
}

function setupEventSource() {
  // Create EventSource connection to receive webhook events
  eventSource = new EventSource('/events');
  
  eventSource.onopen = function(event) {
    // Connection is implicit; avoid separate SSE vs webhook distinction.
    addSystemLog('Connected.', 'secondary');
  };

  eventSource.onmessage = function(event) {
    try {
      const data = JSON.parse(event.data);
      displayWebhookEvent(data);
    } catch (error) {
      console.error('Error parsing SSE data:', error);
    }
  };

  eventSource.addEventListener('webhook', function(event) {
    // For named SSE events, `event.data` is the payload string.
    // Normalize to the same shape used elsewhere: { event, data: <string> }.
    displayWebhookEvent({
      id: Date.now(),
      event: 'webhook',
      data: event.data,
      timestamp: new Date().toISOString(),
    });
  });

  eventSource.addEventListener('connected', function(event) {
    displayWebhookEvent({
      event: 'connected',
      data: event.data,
      timestamp: new Date().toISOString(),
    });
  });

  eventSource.onerror = function(event) {
    console.error('SSE error:', event);
    addSystemLog('Connection lost. Reconnecting…', 'warning');
    
    if (eventSource) {
      eventSource.close();
    }
    
    setTimeout(function() {
      setupEventSource();
    }, 3000);
  };
}

function displayWebhookEvent(eventData) {
  webhookEventCount++;
  const timestamp = new Date().toLocaleTimeString();
  
  // Parse event data
  let parsedData = null;
  let transactionId = null;
  let verificationStatus = '';

  // Most events arrive as: { event, data: '<json string>' }
  // but be defensive in case we ever pass the parsed payload directly.
  if (typeof eventData?.data === 'string') {
    try {
      parsedData = JSON.parse(eventData.data);
    } catch (e) {
      parsedData = null;
    }
  } else if (eventData && typeof eventData === 'object' && eventData.body) {
    parsedData = eventData;
  }

  if (parsedData?.verification) {
    verificationStatus = ` - ${parsedData.verification}`;
  }

  const eventType = parsedData?.body?.event_type;
  if (
    (eventType === 'transaction_updated' || eventType === 'transaction_confirmed') &&
    parsedData?.body?.data?.transaction_id
  ) {
    transactionId = parsedData.body.data.transaction_id;
  }
  
  // Create event header
  const eventHeader = `[${timestamp}] Event #${webhookEventCount}`;
  
  // Create event container
  const eventDiv = document.createElement('div');
  eventDiv.className = 'mb-3 pb-3 border-bottom';
  
  // Add header
  const headerDiv = document.createElement('div');
  headerDiv.className = 'fw-semibold mb-1';
  headerDiv.textContent = eventHeader;
  eventDiv.appendChild(headerDiv);
  
  // Add transaction link if present
  if (transactionId) {
    const linkDiv = document.createElement('div');
    linkDiv.className = 'mb-2';
    const link = document.createElement('a');
    link.href = `/transaction?transaction_id=${encodeURIComponent(transactionId)}`;
    link.textContent = `View Transaction: ${transactionId}`;
    link.target = '_blank';
    link.className = 'link-primary link-underline-opacity-0 link-underline-opacity-100-hover';
    linkDiv.appendChild(link);
    eventDiv.appendChild(linkDiv);
  }
  
  // Add JSON data
  const pre = document.createElement('pre');
  pre.className = 'm-0 p-2 border rounded bg-body';
  pre.style.overflowX = 'auto';
  pre.style.fontSize = '12px';
  const displayData = parsedData ?? eventData.data;
  const displayEvent = {
    ...eventData,
    data: displayData,
  };
  pre.textContent = JSON.stringify(displayEvent, null, 2);
  eventDiv.appendChild(pre);
  
  // Add to container
  const container = document.getElementById('webhook-events');
  container.insertBefore(eventDiv, container.firstChild);
}

// Initialize on page load
$(document).ready(function() {
  updateButtonStates();
  setupEventSource();
});

// Clean up EventSource connection when page is unloaded
window.addEventListener('beforeunload', function() {
  if (eventSource) {
    eventSource.close();
  }
});
