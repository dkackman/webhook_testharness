// Server-Sent Events Management

let eventSource = null;
let webhookEventCount = 0;

function clearWebhookEvents() {
  $('#webhook-events').html('Webhook events cleared. Waiting for new events...');
  webhookEventCount = 0;
}

function addSystemLog(message, variant = 'secondary') {
  const container = document.getElementById('webhook-events');
  if (!container) return;

  clearPlaceholderContent(container);

  const wrapper = document.createElement('div');
  wrapper.className = 'mb-3 pb-3 border-bottom';

  const header = document.createElement('div');
  header.className = `fw-semibold text-${variant}`;
  header.textContent = message;
  wrapper.appendChild(header);

  container.insertBefore(wrapper, container.firstChild);
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
  
  // Parse event data if it's a string
  let parsedData = null;
  if (typeof eventData?.data === 'string') {
    try {
      parsedData = JSON.parse(eventData.data);
    } catch (e) {
      parsedData = null;
    }
  } else if (eventData?.body) {
    parsedData = eventData;
  }

  // Extract transaction ID if present
  const eventType = parsedData?.body?.event_type;
  const transactionId = ((eventType === 'transaction_updated' || eventType === 'transaction_confirmed') &&
    parsedData?.body?.data?.transaction_id) ? parsedData.body.data.transaction_id : null;
  
  // Create event container
  const eventDiv = document.createElement('div');
  eventDiv.className = 'mb-3 pb-3 border-bottom';
  
  // Add header
  const headerDiv = document.createElement('div');
  headerDiv.className = 'fw-semibold mb-1';
  headerDiv.textContent = `[${timestamp}] Event #${webhookEventCount}`;
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
  clearPlaceholderContent(container);
  container.insertBefore(eventDiv, container.firstChild);
}

// Clean up EventSource connection when page is unloaded
window.addEventListener('beforeunload', function() {
  if (eventSource) {
    eventSource.close();
  }
});
