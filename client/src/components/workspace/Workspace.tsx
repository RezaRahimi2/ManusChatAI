import { useState, useEffect, useRef } from "react";
import { useQuery } from "@tanstack/react-query";
import ChatInput from "@/components/chat/ChatInput";
import ChatMessage from "@/components/chat/ChatMessage";
import ThinkingMessage from "@/components/chat/ThinkingMessage";
import { useSocket } from "@/lib/socket";
import { useAgentContext } from "@/context/AgentContext";
import { Message } from "@shared/schema";

interface WorkspaceProps {
  workspaceId: number;
}

export default function Workspace({ workspaceId }: WorkspaceProps) {
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const { getAgentById } = useAgentContext();
  const socket = useSocket();
  const [thinking, setThinking] = useState(false);
  
  // Fetch messages for this workspace
  const { data: messages = [], isLoading, refetch } = useQuery({
    queryKey: ['/api/messages', workspaceId],
    queryFn: async () => {
      const response = await fetch(`/api/messages?workspaceId=${workspaceId}`);
      if (!response.ok) {
        throw new Error('Failed to fetch messages');
      }
      return response.json();
    }
  });
  
  // Send message function
  const sendMessage = async (content: string) => {
    if (!content.trim() || !socket) return;
    
    // Add user message optimistically
    const userMessage = {
      id: Date.now(),
      workspaceId,
      role: 'user',
      content,
      createdAt: Date.now()
    };
    
    // Emit message to server
    socket.send(JSON.stringify({
      type: 'message',
      workspaceId,
      message: userMessage
    }));
    
    // Set thinking state for the UI
    setThinking(true);
  };
  
  // Listen for new messages from socket and join workspace
  useEffect(() => {
    if (!socket) return;
    
    // Join the workspace when socket connects
    socket.send(JSON.stringify({
      type: 'join_workspace',
      workspaceId
    }));
    
    console.log('Joining workspace:', workspaceId);
    
    const handleMessage = (event: MessageEvent) => {
      const data = JSON.parse(event.data);
      console.log('Workspace received message:', data);
      
      if (data.type === 'thinking') {
        setThinking(data.thinking);
      } else if (data.type === 'message' && data.workspaceId === workspaceId) {
        // Refetch messages to get the latest
        refetch();
        setThinking(false);
      } else if (data.type === 'joined_workspace') {
        console.log('Successfully joined workspace:', data.workspaceId);
      }
    };
    
    socket.addEventListener('message', handleMessage);
    
    return () => {
      // Leave the workspace when unmounting
      if (socket.readyState === WebSocket.OPEN) {
        socket.send(JSON.stringify({
          type: 'leave_workspace',
          workspaceId
        }));
      }
      socket.removeEventListener('message', handleMessage);
    };
  }, [socket, workspaceId, refetch]);
  
  // Scroll to bottom when messages change
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages, thinking]);
  
  if (isLoading) {
    return (
      <div className="flex-1 flex items-center justify-center">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary-500"></div>
      </div>
    );
  }
  
  return (
    <div className="flex-1 flex flex-col overflow-hidden">
      {/* Chat Messages Container */}
      <div className="flex-1 overflow-y-auto scrollbar-thin p-4 bg-grid">
        {messages.length === 0 ? (
          <div className="bg-white dark:bg-neutral-800 p-4 rounded-xl shadow-sm border border-neutral-200 dark:border-neutral-700 mb-6 max-w-3xl mx-auto">
            <div className="flex items-start mb-4">
              <div className="w-10 h-10 rounded-full bg-primary-500 flex items-center justify-center flex-shrink-0 mr-4">
                <span className="material-icons text-white">psychology</span>
              </div>
              <div>
                <h3 className="font-medium text-primary-500">Manus AI System</h3>
                <p className="mt-2 text-sm">
                  Welcome to Manus AI Clone. I am a multi-agent system designed to help you accomplish complex tasks. I can:
                </p>
                <ul className="list-disc pl-5 mt-2 text-sm">
                  <li>Research topics using the web</li>
                  <li>Generate and execute code</li>
                  <li>Create written content</li>
                  <li>Collaborate with specialized agents as needed</li>
                </ul>
                <p className="mt-2 text-sm">What would you like to work on today?</p>
              </div>
            </div>
          </div>
        ) : (
          messages.map((message) => (
            <ChatMessage 
              key={message.id} 
              message={message as any} 
              agent={message.agentId ? getAgentById(message.agentId) : undefined}
            />
          ))
        )}
        
        {thinking && <ThinkingMessage />}
        
        <div ref={messagesEndRef} />
      </div>
      
      {/* Input Area */}
      <ChatInput onSendMessage={sendMessage} />
    </div>
  );
}
