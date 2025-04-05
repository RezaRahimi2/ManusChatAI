import { WebSocketServer, WebSocket } from 'ws';
import { agentManager } from './agents/agentManager';

// Client connection tracking
const workspaceClients = new Map<number, Set<WebSocket>>();
const clientWorkspaces = new Map<WebSocket, Set<number>>();

export function setupWebSocketHandlers(wss: WebSocketServer, agentManagerInstance: any): void {
  wss.on('connection', (ws: WebSocket) => {
    console.log('WebSocket client connected');
    
    ws.on('message', async (data: string) => {
      try {
        const message = JSON.parse(data);
        console.log('Received WebSocket message:', message.type);
        
        switch (message.type) {
          case 'join_workspace':
            joinWorkspace(ws, message.workspaceId);
            break;
            
          case 'leave_workspace':
            leaveWorkspace(ws, message.workspaceId);
            break;
            
          case 'message':
            // Process new message
            if (message.workspaceId && message.message && message.message.content) {
              console.log(`Processing message for workspace ${message.workspaceId}: "${message.message.content.substring(0, 50)}${message.message.content.length > 50 ? '...' : ''}"`);
              
              // Add client to workspace if not already joined
              joinWorkspace(ws, message.workspaceId);
              
              try {
                // Process the message
                await agentManager.processMessage(
                  message.workspaceId,
                  message.message.content
                );
                console.log(`Successfully processed message for workspace ${message.workspaceId}`);
              } catch (processError) {
                console.error(`Error processing message with agentManager:`, processError);
                
                // Send specific error about message processing
                ws.send(JSON.stringify({
                  type: 'error',
                  workspaceId: message.workspaceId,
                  error: processError instanceof Error ? processError.message : 'Failed to process message',
                  timestamp: Date.now()
                }));
              }
            } else {
              console.error('Invalid message format:', message);
              ws.send(JSON.stringify({
                type: 'error',
                error: 'Invalid message format. Must include workspaceId, message, and content.',
                timestamp: Date.now()
              }));
            }
            break;
            
          case 'ping':
            // Respond to ping with pong
            ws.send(JSON.stringify({
              type: 'pong',
              timestamp: Date.now()
            }));
            break;
            
          default:
            console.log('Received message with type:', message.type);
        }
      } catch (error) {
        console.error('Error processing WebSocket message:', error);
        
        // Send error back to client
        ws.send(JSON.stringify({
          type: 'error',
          error: error instanceof Error ? error.message : 'Unknown error',
          timestamp: Date.now()
        }));
      }
    });
    
    ws.on('close', () => {
      // Clean up when client disconnects
      cleanupClient(ws);
      console.log('WebSocket client disconnected');
    });
    
    ws.on('error', (error) => {
      console.error('WebSocket error:', error);
      cleanupClient(ws);
    });
    
    // Send initial connection confirmation
    ws.send(JSON.stringify({
      type: 'connected',
      timestamp: Date.now()
    }));
  });
}

// Workspace management functions
function joinWorkspace(ws: WebSocket, workspaceId: number): void {
  // Add client to workspace clients
  if (!workspaceClients.has(workspaceId)) {
    workspaceClients.set(workspaceId, new Set());
  }
  workspaceClients.get(workspaceId)?.add(ws);
  
  // Add workspace to client workspaces
  if (!clientWorkspaces.has(ws)) {
    clientWorkspaces.set(ws, new Set());
  }
  clientWorkspaces.get(ws)?.add(workspaceId);
  
  // Confirm workspace joining
  ws.send(JSON.stringify({
    type: 'joined_workspace',
    workspaceId,
    timestamp: Date.now()
  }));
}

function leaveWorkspace(ws: WebSocket, workspaceId: number): void {
  // Remove client from workspace
  workspaceClients.get(workspaceId)?.delete(ws);
  
  // Clean up empty workspace sets
  if (workspaceClients.get(workspaceId)?.size === 0) {
    workspaceClients.delete(workspaceId);
  }
  
  // Remove workspace from client
  clientWorkspaces.get(ws)?.delete(workspaceId);
  
  // Clean up empty client sets
  if (clientWorkspaces.get(ws)?.size === 0) {
    clientWorkspaces.delete(ws);
  }
  
  // Confirm workspace leaving
  ws.send(JSON.stringify({
    type: 'left_workspace',
    workspaceId,
    timestamp: Date.now()
  }));
}

function cleanupClient(ws: WebSocket): void {
  // Get all workspaces this client was in
  const workspaces = clientWorkspaces.get(ws);
  
  if (workspaces) {
    // Convert to array to avoid downlevelIteration issues
    const workspaceIds = Array.from(workspaces);
    
    // Remove client from all workspace clients
    workspaceIds.forEach(workspaceId => {
      const clients = workspaceClients.get(workspaceId);
      if (clients) {
        clients.delete(ws);
        
        // Clean up empty workspace sets
        if (clients.size === 0) {
          workspaceClients.delete(workspaceId);
        }
      }
    });
    
    // Remove client entry
    clientWorkspaces.delete(ws);
  }
}

// Broadcast message to all clients in a workspace
export function broadcastToWorkspace(workspaceId: number, message: any): void {
  const clients = workspaceClients.get(workspaceId);
  
  if (clients) {
    const messageStr = JSON.stringify(message);
    
    clients.forEach(client => {
      if (client.readyState === WebSocket.OPEN) {
        client.send(messageStr);
      }
    });
  }
}

// Send message to specific client
export function sendToClient(ws: WebSocket, message: any): void {
  if (ws.readyState === WebSocket.OPEN) {
    ws.send(JSON.stringify(message));
  }
}
