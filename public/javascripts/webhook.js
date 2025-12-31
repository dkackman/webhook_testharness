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

function updateButtonStates() {
  if (webhookId) {
    $('#register-btn').hide();
    $('#unregister-btn').show();
    $('#secret-input').prop('disabled', true);
    $('#response-display').text(`Webhook registered (ID: ${webhookId})`);
  } else {
    $('#register-btn').show();
    $('#unregister-btn').hide();
    $('#secret-input').prop('disabled', false);
  }
  
  if (webhookSecret) {
    $('#verification-enabled').text('✅ Enabled').css('color', 'green');
    $('#verification-status').css('background-color', '#e8f5e9');
  } else {
    $('#verification-enabled').text('❌ Disabled').css('color', '#666');
    $('#verification-status').css('background-color', '#f0f0f0');
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
  $('#webhook-events').text('Webhook events cleared. Waiting for new events...');
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

function setupEventSource() {
  // Create EventSource connection to receive webhook events
  eventSource = new EventSource('/events');
  
  eventSource.onopen = function(event) {
    $('#webhook-events').text('Connected to webhook event stream. Waiting for events...');
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
    try {
      const data = JSON.parse(event.data);
      data.event = data.event || 'webhook';
      displayWebhookEvent(data);
    } catch (error) {
      console.error('Error parsing webhook event:', error);
    }
  });

  eventSource.addEventListener('connected', function(event) {
    displayWebhookEvent({
      event: 'connected',
      data: event.data,
      timestamp: new Date().toISOString()
    });
  });

  eventSource.onerror = function(event) {
    console.error('SSE error:', event);
    $('#webhook-events').append('\n[ERROR] Connection lost. Attempting to reconnect...');
    
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
  
  // Check if this is a webhook event with verification info
  let eventHeader = `[${timestamp}] Event #${webhookEventCount} (${eventData.event})`;
  
  // Add verification status if present
  if (eventData.data && typeof eventData.data === 'string') {
    try {
      const parsedData = JSON.parse(eventData.data);
      if (parsedData.verification) {
        eventHeader += ` - ${parsedData.verification}`;
      }
    } catch (e) {
      // Not JSON or no verification field
    }
  }
  
  eventHeader += ':';
  const eventJson = JSON.stringify(eventData, null, 2);
  const eventDisplay = eventHeader + '\n' + eventJson + '\n\n';
  
  // Append new event to the display
  const currentContent = $('#webhook-events').text();
  if (currentContent === 'No webhook events yet' || currentContent === 'Connected to webhook event stream. Waiting for events...') {
    $('#webhook-events').text(eventDisplay);
  } else {
    $('#webhook-events').prepend(eventDisplay);
  }
  
  // Scroll to bottom of the pre element
  const preElement = document.getElementById('webhook-events');
  preElement.scrollTop = preElement.scrollHeight;
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
