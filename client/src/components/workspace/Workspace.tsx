import { useState, useEffect, useRef } from "react";
import { useQuery } from "@tanstack/react-query";
import ChatInput from "@/components/chat/ChatInput";
import ChatMessage from "@/components/chat/ChatMessage";
import ThinkingMessage from "@/components/chat/ThinkingMessage";
import MessageGroup from "@/components/chat/MessageGroup";
import AgentTimeline from "@/components/workspace/AgentTimeline";
import CollaborationControls from "@/components/workspace/CollaborationControls";
import { useSocket, addMessageListener, removeMessageListener, sendChatMessage, joinWorkspace } from "@/lib/socket";
import { useAgentContext } from "@/context/AgentContext";
import { Message, Agent } from "@shared/schema";
import { useToast } from "@/hooks/use-toast";
import { AgentStatus } from "@/components/agents/AgentActivityIndicator";

interface WorkspaceProps {
  workspaceId: number;
}

export default function Workspace({ workspaceId }: WorkspaceProps) {
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const { getAgentById, getAllAgents } = useAgentContext();
  const { isConnected, lastError, sendChatMessage } = useSocket();
  const [thinking, setThinking] = useState(false);
  const [thinkingAgent, setThinkingAgent] = useState<Agent | undefined>(undefined);
  const [thinkingContent, setThinkingContent] = useState<string>('');
  const [showControls, setShowControls] = useState(false);
  const [activeAgents, setActiveAgents] = useState<Map<number, AgentStatus>>(new Map());
  const [currentCollaboration, setCurrentCollaboration] = useState<string | undefined>();
  const [showTechnicalView, setShowTechnicalView] = useState(false);
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
      
      // Update thinking agent
      if (data.agent && data.thinking) {
        const agent = getAgentById(data.agent);
        setThinkingAgent(agent);
        
        // Update active agents
        const newActiveAgents = new Map(activeAgents);
        newActiveAgents.set(data.agent, AgentStatus.PROCESSING);
        setActiveAgents(newActiveAgents);
      } else if (!data.thinking) {
        setThinkingAgent(undefined);
        
        // Mark agent as completed if it was previously processing
        if (data.agent) {
          const newActiveAgents = new Map(activeAgents);
          if (newActiveAgents.has(data.agent) && newActiveAgents.get(data.agent) === AgentStatus.PROCESSING) {
            newActiveAgents.set(data.agent, AgentStatus.COMPLETED);
          }
          setActiveAgents(newActiveAgents);
        }
      }
    };
    
    const handleNewMessage = (data: any) => {
      if (data.workspaceId === workspaceId) {
        console.log('Received new message for workspace, refetching messages');
        
        // Store thinking content if available
        if (data.message?.metadata?.thinking) {
          setThinkingContent(data.message.content);
        }
        
        // If this message has an agent, add it to active agents
        if (data.message?.agentId) {
          const newActiveAgents = new Map(activeAgents);
          newActiveAgents.set(data.message.agentId, AgentStatus.COMPLETED);
          setActiveAgents(newActiveAgents);
        }
        
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
    
    const handleCollaborationStarted = (data: any) => {
      if (data.workspaceId === workspaceId) {
        console.log('Collaboration started:', data.collaboration);
        setCurrentCollaboration(data.collaboration.id);
        
        // Set agent statuses
        const newActiveAgents = new Map<number, AgentStatus>();
        
        // Add initiator agent
        const initiatorName = data.collaboration.initiatorAgent;
        const initiator = getAllAgents().find(a => a.name === initiatorName);
        if (initiator) {
          newActiveAgents.set(initiator.id, AgentStatus.PROCESSING);
        }
        
        // Add participant agents
        data.collaboration.participantAgents.forEach((agentName: string) => {
          const agent = getAllAgents().find(a => a.name === agentName);
          if (agent) {
            newActiveAgents.set(agent.id, AgentStatus.WAITING);
          }
        });
        
        setActiveAgents(newActiveAgents);
      }
    };
    
    const handleCollaborationStepUpdate = (data: any) => {
      if (data.workspaceId === workspaceId && data.collaborationId === currentCollaboration) {
        console.log('Collaboration step update:', data);
        
        // Find agent by name
        const agentName = data.agentName;
        const agent = getAllAgents().find(a => a.name === agentName);
        
        if (agent) {
          const newActiveAgents = new Map(activeAgents);
          
          if (data.status === 'in_progress') {
            newActiveAgents.set(agent.id, AgentStatus.PROCESSING);
          } else if (data.status === 'completed') {
            newActiveAgents.set(agent.id, AgentStatus.COMPLETED);
          }
          
          setActiveAgents(newActiveAgents);
        }
      }
    };
    
    const handleCollaborationCompleted = (data: any) => {
      if (data.workspaceId === workspaceId && data.collaborationId === currentCollaboration) {
        console.log('Collaboration completed:', data.collaborationId);
        // Keep the collaboration ID for message grouping
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
        setThinkingAgent(undefined);
      }
    };
    
    // Register message handlers
    addMessageListener('thinking', handleThinkingMessage);
    addMessageListener('message', handleNewMessage);
    addMessageListener('joined_workspace', handleWorkspaceJoined);
    addMessageListener('collaboration_started', handleCollaborationStarted);
    addMessageListener('collaboration_step_update', handleCollaborationStepUpdate);
    addMessageListener('collaboration_completed', handleCollaborationCompleted);
    addMessageListener('error', handleErrorMessage);
    
    return () => {
      // Clean up all event listeners
      removeMessageListener('thinking', handleThinkingMessage);
      removeMessageListener('message', handleNewMessage);
      removeMessageListener('joined_workspace', handleWorkspaceJoined);
      removeMessageListener('collaboration_started', handleCollaborationStarted);
      removeMessageListener('collaboration_step_update', handleCollaborationStepUpdate);
      removeMessageListener('collaboration_completed', handleCollaborationCompleted);
      removeMessageListener('error', handleErrorMessage);
      
      // Leave workspace handled by the socket.ts implementation
    };
  }, [isConnected, workspaceId, refetch, toast, activeAgents, getAllAgents, currentCollaboration, getAgentById]);
  
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
  
  // Group messages by their collaboration ID and timestamp for a better visual thread
  const groupedMessages = messages.reduce((groups, message) => {
    const collaborationId = message.metadata && typeof message.metadata === 'object' && 'collaborationId' in message.metadata 
      ? message.metadata.collaborationId as string 
      : undefined;
    
    const lastGroup = groups[groups.length - 1];
    
    // If this message belongs to the current collaboration and it's close in time
    if (
      collaborationId && 
      lastGroup && 
      lastGroup.collaborationId === collaborationId &&
      lastGroup.messages[lastGroup.messages.length - 1].agentId === message.agentId
    ) {
      lastGroup.messages.push(message);
    } else {
      // Start a new group
      groups.push({
        id: message.id.toString(),
        collaborationId,
        messages: [message]
      });
    }
    
    return groups;
  }, [] as { id: string, collaborationId: string | undefined, messages: Message[] }[]);

  // Toggle for the collaboration controls
  const toggleControls = () => {
    setShowControls(!showControls);
  };
  
  // Toggle for technical view
  const toggleTechnicalView = () => {
    setShowTechnicalView(!showTechnicalView);
  };
  
  // Handler for collaboration config changes
  const handleConfigChange = (config: any) => {
    console.log('Collaboration config changed:', config);
    // In a real implementation, we would send this to the server
    // sendCollaborationConfig(workspaceId, config);
  };

  return (
    <div className="flex-1 flex flex-col overflow-hidden">
      {/* Active Agents Timeline - Only show when agents are active */}
      {activeAgents.size > 0 && (
        <div className="border-b border-neutral-200 dark:border-neutral-700 bg-white dark:bg-neutral-900">
          <AgentTimeline 
            activeAgents={Array.from(activeAgents.entries())
              .filter(([id]) => getAgentById(id) !== undefined)
              .map(([id, status]) => ({
                agent: getAgentById(id) as Agent,
                status
              }))}
            onShowDetails={toggleControls}
          />
        </div>
      )}
      
      {/* Collaboration Controls - Show when toggled */}
      {showControls && (
        <div className="border-b border-neutral-200 dark:border-neutral-700 bg-white dark:bg-neutral-900 p-4">
          <CollaborationControls
            onConfigChange={handleConfigChange}
            availableAgents={getAllAgents()}
            className="w-full"
          />
        </div>
      )}
      
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
          // Render message groups instead of individual messages
          groupedMessages.map((group) => (
            <MessageGroup 
              key={group.id} 
              messages={group.messages}
              collaborationId={group.collaborationId}
              getAgent={getAgentById}
              showTechnicalView={showTechnicalView}
            />
          ))
        )}
        
        {thinking && <ThinkingMessage agent={thinkingAgent} content={thinkingContent} showTechnicalView={showTechnicalView} />}
        
        {/* Technical View Toggle Button */}
        {messages.length > 0 && (
          <div className="flex justify-end mb-2">
            <button 
              onClick={toggleTechnicalView}
              className={`text-xs rounded-full px-3 py-1 flex items-center ${
                showTechnicalView 
                  ? 'bg-primary-100 dark:bg-primary-900 text-primary-700 dark:text-primary-300' 
                  : 'bg-neutral-100 dark:bg-neutral-800 text-neutral-600 dark:text-neutral-400'
              }`}
            >
              <span className={`material-icons-outlined text-sm mr-1 ${
                showTechnicalView ? 'text-primary-500' : 'text-neutral-500'
              }`}>
                code
              </span>
              Technical View
            </button>
          </div>
        )}
        
        <div ref={messagesEndRef} />
      </div>
      
      {/* Input Area */}
      <ChatInput onSendMessage={sendMessage} />
    </div>
  );
}
