// UI Helper Functions

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

function handleProxyResponse(data) {
  let statusMessage = '';
  if (data.proxy_status === 'success') {
    statusMessage = '✅ ' + data.proxy_message + '\n\n';
  } else if (data.proxy_status === 'error') {
    statusMessage = '❌ ' + data.proxy_message + '\n';
    statusMessage += 'Details: ' + (data.error || data.details || 'Unknown error') + '\n\n';
  }
  return statusMessage + JSON.stringify(data, null, 2);
}

function clearPlaceholderContent(container) {
  const content = container.innerHTML;
  if (content === 'No webhook events yet' || 
      content.includes('Webhook events cleared') ||
      content.includes('Connected')) {
    container.innerHTML = '';
  }
}
