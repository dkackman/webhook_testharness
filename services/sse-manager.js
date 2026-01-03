/**
 * Server-Sent Events (SSE) connection manager
 * Handles client connections and event broadcasting
 */

class SSEManager {
  constructor() {
    this.connections = new Set();
  }

  /**
   * Add a new SSE connection
   * @param {Response} res - Express response object
   */
  addConnection(res) {
    this.connections.add(res);
  }

  /**
   * Remove an SSE connection
   * @param {Response} res - Express response object
   */
  removeConnection(res) {
    this.connections.delete(res);
  }

  /**
   * Get count of active connections
   * @returns {number} Number of active connections
   */
  getConnectionCount() {
    return this.connections.size;
  }

  /**
   * Broadcast an event to all connected clients
   * @param {Object} eventData - Event data with id, event type, and data payload
   * @param {number|string} eventData.id - Event ID
   * @param {string} eventData.event - Event type name
   * @param {string} eventData.data - JSON-stringified event data
   */
  broadcast(eventData) {
    const message = `id: ${eventData.id}\nevent: ${eventData.event}\ndata: ${eventData.data}\n\n`;
    const failedConnections = [];

    this.connections.forEach((res) => {
      try {
        res.write(message);
      } catch (error) {
        console.error('Error sending SSE message:', error);
        failedConnections.push(res);
      }
    });

    // Remove failed connections after iteration to avoid modifying Set during loop
    for (const res of failedConnections) {
      this.removeConnection(res);
    }
  }
}

// Export singleton instance
export default new SSEManager();
