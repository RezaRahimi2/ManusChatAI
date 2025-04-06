import { useState, useEffect, useCallback } from 'react';

// Shared socket instance for the application
let socket: WebSocket | null = null;
let isConnecting = false;
let reconnectAttempts = 0;
const maxReconnectAttempts = 5;
const reconnectDelay = 1000;

// Message listeners 
const messageListeners = new Map<string, Set<(data: any) => void>>();

// Helper to send messages through the socket with error handling
export const sendSocketMessage = (message: any): boolean => {
  if (!socket || socket.readyState !== WebSocket.OPEN) {
    console.error('Cannot send message: WebSocket is not connected');
    return false;
  }
  
  try {
    const messageString = JSON.stringify(message);
    socket.send(messageString);
    console.log('Sent WebSocket message:', message.type);
    return true;
  } catch (error) {
    console.error('Error sending WebSocket message:', error);
    return false;
  }
};

// Helper to join a workspace
export const joinWorkspace = (workspaceId: number): boolean => {
  return sendSocketMessage({
    type: 'join_workspace',
    workspaceId,
    timestamp: Date.now()
  });
};

// Helper to send a chat message to a workspace
export const sendChatMessage = (workspaceId: number, content: string): boolean => {
  console.log(`Sending chat message to workspace ${workspaceId}: "${content.substring(0, 50)}${content.length > 50 ? '...' : ''}"`);
  
  return sendSocketMessage({
    type: 'message',
    workspaceId,
    message: {
      content,
      timestamp: Date.now()
    },
    timestamp: Date.now()
  });
};

// Helper to stop an active collaboration in a workspace
export const stopCollaboration = (workspaceId: number, collaborationId: string): boolean => {
  console.log(`Stopping collaboration ${collaborationId} in workspace ${workspaceId}`);
  
  return sendSocketMessage({
    type: 'stop_collaboration',
    workspaceId,
    collaborationId,
    timestamp: Date.now()
  });
};

// Register a listener for specific message types
export const addMessageListener = (type: string, callback: (data: any) => void): void => {
  if (!messageListeners.has(type)) {
    messageListeners.set(type, new Set());
  }
  messageListeners.get(type)?.add(callback);
};

// Remove a listener
export const removeMessageListener = (type: string, callback: (data: any) => void): void => {
  messageListeners.get(type)?.delete(callback);
  if (messageListeners.get(type)?.size === 0) {
    messageListeners.delete(type);
  }
};

// React hook for using WebSocket
export const useSocket = () => {
  const [ws, setWs] = useState<WebSocket | null>(null);
  const [isConnected, setIsConnected] = useState<boolean>(false);
  const [lastError, setLastError] = useState<string | null>(null);
  
  // Connect to WebSocket
  const connect = useCallback(() => {
    if (socket !== null || isConnecting) return;
    
    isConnecting = true;
    
    // Create WebSocket connection
    const protocol = window.location.protocol === "https:" ? "wss:" : "ws:";
    const wsUrl = `${protocol}//${window.location.host}/ws`;
    
    console.log('Connecting to WebSocket at:', wsUrl);
    const newSocket = new WebSocket(wsUrl);
    
    newSocket.onopen = () => {
      console.log('WebSocket connected');
      socket = newSocket;
      setWs(newSocket);
      setIsConnected(true);
      setLastError(null);
      isConnecting = false;
      reconnectAttempts = 0;
      
      // Send a ping to verify connection
      try {
        const pingData = {
          type: 'ping',
          timestamp: Date.now()
        };
        console.log('Sending WebSocket ping:', pingData);
        newSocket.send(JSON.stringify(pingData));
      } catch (err) {
        console.error('Failed to send ping:', err);
      }
    };
    
    newSocket.onmessage = (event) => {
      try {
        const data = JSON.parse(event.data);
        console.log('WebSocket message received:', data);
        
        // Handle specific message types
        if (data.type === 'error') {
          setLastError(data.error || 'Unknown server error');
          console.error('Server reported error:', data.error);
        }
        
        // Notify all listeners for this message type
        if (data.type && messageListeners.has(data.type)) {
          messageListeners.get(data.type)?.forEach(callback => {
            try {
              callback(data);
            } catch (callbackError) {
              console.error('Error in message listener callback:', callbackError);
            }
          });
        }
        
        // Notify 'all' listeners that receive every message
        if (messageListeners.has('all')) {
          messageListeners.get('all')?.forEach(callback => {
            try {
              callback(data);
            } catch (callbackError) {
              console.error('Error in general message listener callback:', callbackError);
            }
          });
        }
      } catch (err) {
        console.error('Failed to parse WebSocket message:', err);
      }
    };
    
    newSocket.onclose = (event) => {
      console.log('WebSocket closed:', event);
      socket = null;
      setWs(null);
      setIsConnected(false);
      isConnecting = false;
      
      // Try to reconnect unless max attempts reached
      if (reconnectAttempts < maxReconnectAttempts) {
        reconnectAttempts++;
        const delay = reconnectDelay * reconnectAttempts;
        console.log(`Reconnecting in ${delay}ms (attempt ${reconnectAttempts} of ${maxReconnectAttempts})`);
        setTimeout(connect, delay);
      } else {
        setLastError('Failed to connect to server after multiple attempts. Please refresh the page.');
      }
    };
    
    newSocket.onerror = (error) => {
      console.error('WebSocket error:', error);
      setLastError('Connection error occurred. Trying to reconnect...');
      newSocket.close();
    };
  }, []);
  
  useEffect(() => {
    connect();
    
    // Clean up on unmount
    return () => {
      // Don't actually close the shared socket on component unmount
      // Just clean up the component state
      setWs(null);
      setIsConnected(false);
    };
  }, [connect]);
  
  return { 
    socket: ws, 
    isConnected, 
    lastError,
    sendMessage: sendSocketMessage,
    joinWorkspace,
    sendChatMessage,
    stopCollaboration
  };
};
