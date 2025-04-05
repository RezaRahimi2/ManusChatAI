import { useState, useEffect } from 'react';

let socket: WebSocket | null = null;
let isConnecting = false;
let reconnectAttempts = 0;
const maxReconnectAttempts = 5;
const reconnectDelay = 1000;

export const useSocket = () => {
  const [ws, setWs] = useState<WebSocket | null>(null);
  
  useEffect(() => {
    const connectWebSocket = () => {
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
        isConnecting = false;
        reconnectAttempts = 0;
        
        // Send a ping to verify connection
        try {
          newSocket.send(JSON.stringify({
            type: 'ping',
            timestamp: Date.now()
          }));
        } catch (err) {
          console.error('Failed to send ping:', err);
        }
      };
      
      newSocket.onmessage = (event) => {
        try {
          const data = JSON.parse(event.data);
          console.log('WebSocket message received:', data);
        } catch (err) {
          console.error('Failed to parse WebSocket message:', err);
        }
      };
      
      newSocket.onclose = (event) => {
        console.log('WebSocket closed:', event);
        socket = null;
        setWs(null);
        isConnecting = false;
        
        // Try to reconnect unless max attempts reached
        if (reconnectAttempts < maxReconnectAttempts) {
          reconnectAttempts++;
          setTimeout(connectWebSocket, reconnectDelay * reconnectAttempts);
        }
      };
      
      newSocket.onerror = (error) => {
        console.error('WebSocket error:', error);
        newSocket.close();
      };
    };
    
    connectWebSocket();
    
    // Clean up on unmount
    return () => {
      if (socket && socket.readyState === WebSocket.OPEN) {
        socket.close();
        socket = null;
      }
    };
  }, []);
  
  return ws;
};
