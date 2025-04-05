import { useState, useEffect, useRef } from "react";
import { useQuery } from "@tanstack/react-query";
import ChatInput from "@/components/chat/ChatInput";
import ChatMessage from "@/components/chat/ChatMessage";
import ThinkingMessage from "@/components/chat/ThinkingMessage";
import { useSocket, addMessageListener, removeMessageListener, sendChatMessage, joinWorkspace } from "@/lib/socket";
import { useAgentContext } from "@/context/AgentContext";
import { Message } from "@shared/schema";
import { useToast } from "@/hooks/use-toast";

interface WorkspaceProps {
  workspaceId: number;
}

export default function Workspace({ workspaceId }: WorkspaceProps) {
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const { getAgentById } = useAgentContext();
  const { isConnected, lastError, sendChatMessage } = useSocket();
  const [thinking, setThinking] = useState(false);
  const { toast } = useToast();
  
  // Fetch messages for this workspace
  const { data: messages = [], isLoading, refetch } = useQuery<Message[]>({
    queryKey: ['/api/messages', workspaceId],
    queryFn: async () => {
      const response = await fetch(`/api/messages?workspaceId=${workspaceId}`);
      if (!response.ok) {
        throw new Error('Failed to fetch messages');
      }
      return response.json() as Promise<Message[]>;
    }
  });
  
  // Show error toast if WebSocket has an error
  useEffect(() => {
    if (lastError) {
      toast({
        title: "Connection Error",
        description: lastError,
        variant: "destructive"
      });
    }
  }, [lastError, toast]);
  
  // Send message function using our improved socket utility
  const sendMessage = async (content: string) => {
    if (!content.trim() || !isConnected) return;
    
    // Set thinking state for the UI
    setThinking(true);
    
    // Send message via socket utility
    const sent = sendChatMessage(workspaceId, content);
    
    if (!sent) {
      toast({
        title: "Failed to send message",
        description: "There was a problem connecting to the server. Please try again.",
        variant: "destructive"
      });
      setThinking(false);
    }
  };
  
  // Listen for new messages from socket and join workspace
  useEffect(() => {
    if (!isConnected) return;
    
    // Join the workspace when socket connects
    joinWorkspace(workspaceId);
    
    console.log('Joining workspace:', workspaceId);
    
    // Define message handlers for different message types
    const handleThinkingMessage = (data: any) => {
      console.log('Setting thinking state to:', data.thinking);
      setThinking(data.thinking);
    };
    
    const handleNewMessage = (data: any) => {
      if (data.workspaceId === workspaceId) {
        console.log('Received new message for workspace, refetching messages');
        // Refetch messages to get the latest
        refetch();
        setThinking(false);
      }
    };
    
    const handleWorkspaceJoined = (data: any) => {
      if (data.workspaceId === workspaceId) {
        console.log('Successfully joined workspace:', data.workspaceId);
      }
    };
    
    const handleErrorMessage = (data: any) => {
      console.error('Received error from server:', data.error);
      toast({
        title: "Server Error",
        description: data.error || "Unknown error occurred",
        variant: "destructive"
      });
      if (data.workspaceId === workspaceId) {
        setThinking(false);
      }
    };
    
    // Register message handlers
    addMessageListener('thinking', handleThinkingMessage);
    addMessageListener('message', handleNewMessage);
    addMessageListener('joined_workspace', handleWorkspaceJoined);
    addMessageListener('error', handleErrorMessage);
    
    return () => {
      // Clean up all event listeners
      removeMessageListener('thinking', handleThinkingMessage);
      removeMessageListener('message', handleNewMessage);
      removeMessageListener('joined_workspace', handleWorkspaceJoined);
      removeMessageListener('error', handleErrorMessage);
      
      // Leave workspace handled by the socket.ts implementation
    };
  }, [isConnected, workspaceId, refetch, toast]);
  
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
          messages.map((message: Message) => (
            <ChatMessage 
              key={message.id} 
              message={message} 
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
