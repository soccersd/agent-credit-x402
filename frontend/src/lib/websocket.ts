/**
 * WebSocket client for real-time updates from the Rust backend
 */

import { BACKEND_WS_URL } from '@/lib/constants';

export type WebSocketMessageType =
  | 'initial_state'
  | 'state_changed'
  | 'credit_scored'
  | 'loan_created'
  | 'loan_repaid'
  | 'collateral_alert'
  | 'liquidation_alert'
  | 'error'
  | 'loop_iteration'
  | 'event';

export interface WebSocketMessage {
  type: WebSocketMessageType;
  [key: string]: any;
}

export type WebSocketEventHandler = (message: WebSocketMessage) => void;

export class AgentWebSocket {
  private ws: WebSocket | null = null;
  private url: string;
  private reconnectInterval: number = 3000;
  private maxReconnectAttempts: number = 10;
  private reconnectAttempts: number = 0;
  private eventHandlers: Map<WebSocketMessageType, Set<WebSocketEventHandler>> = new Map();
  private isConnecting: boolean = false;
  private shouldReconnect: boolean = true;

  constructor(url: string = BACKEND_WS_URL) {
    this.url = url;
  }

  /**
   * Connect to the WebSocket server
   */
  connect() {
    if (this.isConnecting || (this.ws && this.ws.readyState === WebSocket.OPEN)) {
      console.log('WebSocket already connected or connecting');
      return;
    }

    this.isConnecting = true;
    console.log('Connecting to WebSocket:', this.url);

    try {
      this.ws = new WebSocket(this.url);

      this.ws.onopen = () => {
        console.log('WebSocket connected');
        this.isConnecting = false;
        this.reconnectAttempts = 0;
        this.shouldReconnect = true;
      };

      this.ws.onmessage = (event) => {
        try {
          const message: WebSocketMessage = JSON.parse(event.data);
          this.handleMessage(message);
        } catch (error) {
          console.error('Failed to parse WebSocket message:', error, event.data);
        }
      };

      this.ws.onclose = () => {
        console.log('WebSocket disconnected');
        this.isConnecting = false;

        if (this.shouldReconnect && this.reconnectAttempts < this.maxReconnectAttempts) {
          this.reconnectAttempts++;
          console.log(`Reconnecting... Attempt ${this.reconnectAttempts}/${this.maxReconnectAttempts}`);
          setTimeout(() => this.connect(), this.reconnectInterval);
        }
      };

      this.ws.onerror = (error) => {
        // Silently handle connection errors - server may not be running yet
        this.isConnecting = false;
      };
    } catch (error) {
      console.error('Failed to create WebSocket connection:', error);
      this.isConnecting = false;
    }
  }

  /**
   * Disconnect from the WebSocket server
   */
  disconnect() {
    this.shouldReconnect = false;
    if (this.ws) {
      this.ws.close();
      this.ws = null;
    }
    this.eventHandlers.clear();
  }

  /**
   * Subscribe to a specific event type
   */
  on(eventType: WebSocketMessageType, handler: WebSocketEventHandler) {
    if (!this.eventHandlers.has(eventType)) {
      this.eventHandlers.set(eventType, new Set());
    }
    this.eventHandlers.get(eventType)!.add(handler);

    // Return unsubscribe function
    return () => {
      this.eventHandlers.get(eventType)?.delete(handler);
    };
  }

  /**
   * Subscribe to all events
   */
  onAllEvents(handler: WebSocketEventHandler) {
    return this.on('*' as WebSocketMessageType, handler);
  }

  /**
   * Handle incoming WebSocket message
   */
  private handleMessage(message: WebSocketMessage) {
    // Call type-specific handlers
    if (this.eventHandlers.has(message.type)) {
      this.eventHandlers.get(message.type)?.forEach(handler => {
        try {
          handler(message);
        } catch (error) {
          console.error(`Error handling ${message.type} event:`, error);
        }
      });
    }

    // Call wildcard handler (all events)
    if (this.eventHandlers.has('*' as WebSocketMessageType)) {
      this.eventHandlers.get('*' as WebSocketMessageType)?.forEach(handler => {
        try {
          handler(message);
        } catch (error) {
          console.error(`Error handling wildcard event:`, error);
        }
      });
    }
  }

  /**
   * Send a message to the server
   */
  send(data: any) {
    if (this.ws && this.ws.readyState === WebSocket.OPEN) {
      this.ws.send(JSON.stringify(data));
    } else {
      console.warn('Cannot send message: WebSocket is not connected');
    }
  }

  /**
   * Check if WebSocket is connected
   */
  isConnected(): boolean {
    return this.ws !== null && this.ws.readyState === WebSocket.OPEN;
  }
}

// Singleton instance
let wsInstance: AgentWebSocket | null = null;

/**
 * Get or create the WebSocket singleton instance
 */
export function getWebSocketInstance(url?: string): AgentWebSocket {
  if (!wsInstance) {
    wsInstance = new AgentWebSocket(url);
  }
  return wsInstance;
}

/**
 * Hook-like function to use WebSocket in React components
 * Returns cleanup function
 */
export function useAgentWebSocket(
  onMessage?: (message: WebSocketMessage) => void,
  url?: string
): { ws: AgentWebSocket; isConnected: boolean } {
  const ws = getWebSocketInstance(url);

  if (onMessage) {
    ws.onAllEvents(onMessage);
  }

  return {
    ws,
    isConnected: ws.isConnected(),
  };
}

export default AgentWebSocket;
