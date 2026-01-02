// Webhook API Functions

// Webhook state
let webhookId = getCookie('webhookId');
let webhookSecret = getCookie('webhookSecret');

// Sync secret to server on page load if it exists
if (webhookSecret) {
  $('#secret-input').val(webhookSecret);
  fetch('/sync_secret', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ secret: webhookSecret })
  }).then(() => {
    console.log('Secret synced to server');
  }).catch(err => {
    console.error('Failed to sync secret:', err);
  });
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
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(requestBody),
  })
  .then(response => response.json())
  .then(data => {
    if (data.proxy_status === 'success' && data.webhook_id) {
      webhookId = data.webhook_id;
      setCookie('webhookId', webhookId);
      updateButtonStates();
    }
    $('#response-display').text(handleProxyResponse(data));
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
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ webhook_id: webhookId }),
  })
  .then(response => response.json())
  .then(data => {
    // Always reset client state when unregistering, even on error
    // If server returns error, webhook doesn't exist anyway
    webhookId = null;
    webhookSecret = null;
    deleteCookie('webhookId');
    deleteCookie('webhookSecret');
    $('#secret-input').val('');
    updateButtonStates();
    $('#webhook-events').html('No webhook events yet');
    webhookEventCount = 0;
    $('#response-display').text(handleProxyResponse(data));
  })
  .catch(error => {
    console.error('Error:', error);
    // Reset state even on network error
    webhookId = null;
    webhookSecret = null;
    deleteCookie('webhookId');
    deleteCookie('webhookSecret');
    $('#secret-input').val('');
    updateButtonStates();
    $('#webhook-events').html('No webhook events yet');
    webhookEventCount = 0;
    $('#response-display').text('❌ Network Error: ' + error.message);
  });
}
