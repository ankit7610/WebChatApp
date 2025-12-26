/**
 * WebSocket Service
 * Handles real-time communication with server
 * Features: auto-reconnect, event handling, message queue
 */

class WebSocketService {
  constructor() {
    this.ws = null;
    this.reconnectAttempts = 0;
    this.maxReconnectAttempts = 5;
    this.reconnectDelay = 2000;
    this.listeners = new Map();
    this.messageQueue = [];
    this.isConnecting = false;
  }

  /**
   * Connect to WebSocket server
   */
  connect(token) {
    if (this.ws && (this.ws.readyState === WebSocket.OPEN || this.ws.readyState === WebSocket.CONNECTING)) {
      console.log('Already connected or connecting');
      return;
    }

    this.shouldReconnect = true;
    this.isConnecting = true;

    const WS_URL =
      import.meta.env.VITE_WS_URL || 'ws://localhost:3000';

    try {
      this.ws = new WebSocket(`${WS_URL}?token=${token}`);

      this.ws.onopen = () => {
        console.log('✅ WebSocket connected');
        this.isConnecting = false;
        this.reconnectAttempts = 0;

        // Send queued messages
        while (this.messageQueue.length > 0) {
          const msg = this.messageQueue.shift();
          this.send(msg);
        }

        this.emit('open');
      };

      this.ws.onmessage = (event) => {
        try {
          const data = JSON.parse(event.data);
          this.emit(data.type, data);
        } catch (error) {
          console.error('Failed to parse message:', error);
        }
      };

      this.ws.onclose = (event) => {
        console.log('❌ WebSocket closed:', event.code, event.reason);
        this.isConnecting = false;
        this.emit('close');

        // Auto-reconnect
        if (
          this.shouldReconnect &&
          this.reconnectAttempts < this.maxReconnectAttempts &&
          event.code !== 4001 // Don't reconnect on auth failure
        ) {
          this.reconnectAttempts++;
          console.log(
            `Reconnecting... (${this.reconnectAttempts}/${this.maxReconnectAttempts})`
          );

          setTimeout(() => {
            const token = localStorage.getItem('chatToken');
            if (token) {
              this.connect(token);
            }
          }, this.reconnectDelay * this.reconnectAttempts);
        } else if (this.shouldReconnect) {
          this.emit('max_reconnect_reached');
        }
      };

      this.ws.onerror = (error) => {
        console.error('WebSocket error:', error);
        this.isConnecting = false;
        this.emit('error', error);
      };
    } catch (error) {
      console.error('WebSocket connection error:', error);
      this.isConnecting = false;
      this.emit('error', error);
    }
  }

  /**
   * Send message to server
   */
  send(data) {
    if (this.ws && this.ws.readyState === WebSocket.OPEN) {
      this.ws.send(JSON.stringify(data));
    } else {
      // Queue message for when connection is ready
      this.messageQueue.push(data);
    }
  }

  /**
   * Send chat message
   */
  sendMessage(text, receiverId, clientId) {
    this.send({
      type: 'message',
      text,
      receiverId,
      clientId,
    });
  }

  /**
   * Register event listener
   */
  on(event, callback) {
    if (!this.listeners.has(event)) {
      this.listeners.set(event, []);
    }
    this.listeners.get(event).push(callback);
  }

  /**
   * Remove event listener
   */
  off(event, callback) {
    if (!this.listeners.has(event)) return;

    const listeners = this.listeners.get(event);
    const index = listeners.indexOf(callback);
    if (index > -1) {
      listeners.splice(index, 1);
    }
  }

  /**
   * Emit event to listeners
   */
  emit(event, data) {
    if (!this.listeners.has(event)) return;

    this.listeners.get(event).forEach((callback) => {
      try {
        callback(data);
      } catch (error) {
        console.error(`Error in ${event} listener:`, error);
      }
    });
  }

  /**
   * Disconnect from server
   */
  disconnect() {
    if (this.ws) {
      this.shouldReconnect = false;
      this.ws.close();
      this.ws = null;
    }
  }

  /**
   * Check if connected
   */
  isConnected() {
    return this.ws && this.ws.readyState === WebSocket.OPEN;
  }
}

// Export singleton instance
export default new WebSocketService();
