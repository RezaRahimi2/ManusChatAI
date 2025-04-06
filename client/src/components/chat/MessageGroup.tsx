import React, { useState, useMemo } from 'react';
import { cn } from '@/lib/utils';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { Avatar } from '@/components/ui/avatar';
import { ChevronDown, ChevronRight, User, Bot, Clock } from 'lucide-react';
import { Agent, Message } from '@shared/schema';
import Markdown from '@/components/ui/markdown';
import { AgentStatus } from '@/components/agents/AgentActivityIndicator';

interface MessageGroupProps {
  messages: Message[];
  collaborationId?: string;
  getAgent?: (id: number) => Agent | undefined;
  showTechnicalView?: boolean;
  className?: string;
}

interface TimelineStep {
  id: string;
  agentId: number;
  timestamp: Date;
  content: string;
  status: 'thinking' | 'completed' | 'error' | 'waiting';
}

/**
 * Groups related messages by user request and agent responses
 * Completely rewritten to avoid nested tabs issue
 */
export default function MessageGroup({
  messages,
  collaborationId,
  getAgent,
  showTechnicalView = false,
  className
}: MessageGroupProps) {
  const [expanded, setExpanded] = useState(true);
  const [activeView, setActiveView] = useState<'unified' | 'agents' | 'timeline' | 'technical'>('unified');
  const [activeAgentId, setActiveAgentId] = useState<number | null>(null);
  
  // Group and organize messages
  const {
    userMessage,
    agentMessages,
    timelineSteps,
    agents
  } = useMemo(() => {
    if (!messages.length) {
      return { userMessage: null, agentMessages: [], timelineSteps: [], agents: [] };
    }
    
    // Extract user message (first message in the group)
    const userMsg = messages[0].role === 'user' ? messages[0] : null;
    
    // Extract agent messages and build timeline
    const agentMsgs: Message[] = [];
    const timeline: TimelineStep[] = [];
    const activeAgentIds = new Set<number>();
    
    // Process all non-user messages
    messages.forEach(msg => {
      if (msg.role !== 'user' && msg.agentId) {
        // Add to agent messages
        agentMsgs.push(msg);
        
        // Track active agents
        activeAgentIds.add(msg.agentId);
        
        // Determine message type from metadata
        const messageType = typeof msg.metadata === 'object' && msg.metadata 
          ? (msg.metadata as any)?.type 
          : null;
          
        // Add to timeline
        timeline.push({
          id: `${msg.id}-${msg.agentId}-${msg.createdAt}`,
          agentId: msg.agentId,
          timestamp: new Date(msg.createdAt),
          content: msg.content,
          status: messageType === 'thinking' ? 'thinking' : 
                 messageType === 'error' ? 'error' : 'completed'
        });
      }
    });
    
    // Get unique agents with names
    const uniqueAgents: Agent[] = [];
    if (getAgent) {
      activeAgentIds.forEach(id => {
        const agent = getAgent(id);
        if (agent) {
          uniqueAgents.push(agent);
        }
      });
    }
    
    // Sort timeline by timestamp
    timeline.sort((a, b) => a.timestamp.getTime() - b.timestamp.getTime());
    
    return {
      userMessage: userMsg,
      agentMessages: agentMsgs,
      timelineSteps: timeline,
      agents: uniqueAgents
    };
  }, [messages, getAgent]);

  // Initialize the first agent tab when agents first load
  useMemo(() => {
    if (agents.length > 0 && !activeAgentId) {
      setActiveAgentId(agents[0].id);
    }
  }, [agents, activeAgentId]);
  
  // Format time for display
  const formatTime = (timestamp: Date | number | string): string => {
    const date = new Date(timestamp);
    return date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
  };
  
  // If no user message or agent messages, don't render
  if (!userMessage && agentMessages.length === 0) {
    return null;
  }
  
  // View switchger
  const renderTabSwitch = () => (
    <div className="w-full border-b flex items-center">
      <button 
        onClick={() => setActiveView('unified')} 
        className={`px-4 py-2 text-xs ${activeView === 'unified' ? 'border-b-2 border-primary font-medium' : 'text-muted-foreground'}`}
      >
        Unified View
      </button>
      <button 
        onClick={() => setActiveView('agents')} 
        className={`px-4 py-2 text-xs ${activeView === 'agents' ? 'border-b-2 border-primary font-medium' : 'text-muted-foreground'}`}
      >
        By Agent
      </button>
      <button 
        onClick={() => setActiveView('timeline')} 
        className={`px-4 py-2 text-xs ${activeView === 'timeline' ? 'border-b-2 border-primary font-medium' : 'text-muted-foreground'}`}
      >
        <span className="flex items-center gap-1">
          <Clock className="h-3.5 w-3.5" />
          <span>Timeline</span>
        </span>
      </button>
      {showTechnicalView && (
        <button 
          onClick={() => setActiveView('technical')} 
          className={`px-4 py-2 text-xs ${activeView === 'technical' ? 'border-b-2 border-primary font-medium' : 'text-muted-foreground'}`}
        >
          Technical View
        </button>
      )}
    </div>
  );
  
  // Unified view
  const renderUnifiedView = () => (
    <div className="p-4 space-y-4">
      {agentMessages
        .filter(msg => !(typeof msg.metadata === 'object' && msg.metadata && (msg.metadata as any)?.type === 'thinking'))
        .map((message, index) => {
          const agent = getAgent?.(message.agentId || 0);
          return (
            <div key={message.id || index} className="space-y-2">
              {agent && (
                <div className="flex items-center gap-2">
                  <span className="text-xs font-medium">{agent.name}</span>
                  <span className="text-xs text-muted-foreground">
                    {formatTime(message.createdAt)}
                  </span>
                </div>
              )}
              <div className="text-sm">
                <Markdown>{message.content}</Markdown>
              </div>
            </div>
          );
        })}
    </div>
  );
  
  // Agent tab view
  const renderAgentView = () => (
    <div className="agent-tabs">
      {/* Agent selector */}
      {agents.length > 0 && (
        <>
          <div className="w-full bg-muted/50 p-2 flex overflow-x-auto flex-nowrap">
            {agents.map((agent) => (
              <button
                key={agent.id}
                onClick={() => setActiveAgentId(agent.id)}
                className={`text-xs whitespace-nowrap px-3 py-1.5 rounded-md transition-colors ${
                  activeAgentId === agent.id
                    ? 'bg-background text-foreground shadow-sm' 
                    : 'text-muted-foreground hover:text-foreground'
                }`}
              >
                {agent.name}
              </button>
            ))}
          </div>
          
          {/* Agent content */}
          <div className="p-4">
            {agents.map(agent => (
              <div 
                key={agent.id} 
                className={`space-y-4 ${activeAgentId === agent.id ? 'block' : 'hidden'}`}
              >
                {agentMessages
                  .filter(msg => msg.agentId === agent.id && !(typeof msg.metadata === 'object' && msg.metadata && (msg.metadata as any)?.type === 'thinking'))
                  .map((message, index) => (
                    <div key={message.id || index} className="space-y-2">
                      <div className="flex items-center gap-2">
                        <span className="text-xs text-muted-foreground">
                          {formatTime(message.createdAt)}
                        </span>
                      </div>
                      <div className="text-sm">
                        <Markdown>{message.content}</Markdown>
                      </div>
                    </div>
                  ))}
                  
                {/* Show thinking if available */}
                {agentMessages
                  .filter(msg => msg.agentId === agent.id && typeof msg.metadata === 'object' && msg.metadata && (msg.metadata as any)?.type === 'thinking')
                  .map((message, index) => (
                    <div key={`thinking-${message.id || index}`} className="mt-4 p-3 bg-muted/50 rounded border text-sm">
                      <div className="flex items-center gap-2 mb-2">
                        <span className="text-xs font-medium">Reasoning Process</span>
                      </div>
                      <div className="text-xs text-muted-foreground">
                        <Markdown>{message.content}</Markdown>
                      </div>
                    </div>
                  ))}
              </div>
            ))}
          </div>
        </>
      )}
      {agents.length === 0 && (
        <div className="p-4 text-sm text-muted-foreground">
          No agent messages to display
        </div>
      )}
    </div>
  );
  
  // Timeline view
  const renderTimelineView = () => (
    <div className="p-2">
      <div className="space-y-0">
        {timelineSteps.map((step) => {
          const agent = getAgent?.(step.agentId);
          
          return (
            <div key={step.id} className="relative pl-6 ml-3 pb-4 pt-1 border-l">
              {/* Timeline dot */}
              <div 
                className={cn(
                  "absolute left-[-4px] top-2 w-2 h-2 rounded-full",
                  step.status === 'thinking' ? 'bg-blue-500' :
                  step.status === 'completed' ? 'bg-green-500' :
                  step.status === 'error' ? 'bg-red-500' :
                  'bg-neutral-400'
                )}
              />
              
              {/* Step details */}
              <div className="space-y-1">
                <div className="flex items-center justify-between text-xs">
                  <span className="font-medium">
                    {agent?.name || `Agent #${step.agentId}`}
                  </span>
                  <span className="text-muted-foreground text-xs">
                    {formatTime(step.timestamp)}
                  </span>
                </div>
                <div className={cn(
                  "text-xs p-2 rounded",
                  step.status === 'thinking' ? 'bg-blue-50 dark:bg-blue-950/30' :
                  step.status === 'completed' ? 'bg-neutral-50 dark:bg-neutral-900/30' :
                  step.status === 'error' ? 'bg-red-50 dark:bg-red-950/30' :
                  'bg-neutral-50 dark:bg-neutral-900/30'
                )}>
                  <Markdown>{step.content}</Markdown>
                </div>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
  
  // Technical view
  const renderTechnicalView = () => (
    <div className="p-4">
      <pre className="bg-neutral-950 text-neutral-50 p-3 rounded text-xs overflow-auto">
        {JSON.stringify(messages, null, 2)}
      </pre>
    </div>
  );
  
  return (
    <div className={cn('space-y-4 py-4', className)}>
      {/* User message */}
      {userMessage && (
        <div className="flex items-start gap-3">
          <Avatar className="bg-primary/10 mt-1">
            <User className="h-5 w-5 text-primary" />
          </Avatar>
          <div className="flex-1 space-y-2">
            <div className="flex items-center gap-2">
              <span className="font-medium">You</span>
              <span className="text-xs text-muted-foreground">
                {formatTime(userMessage.createdAt)}
              </span>
            </div>
            <div className="text-sm">
              <Markdown>{userMessage.content}</Markdown>
            </div>
          </div>
        </div>
      )}
      
      {/* Agent responses section */}
      {agentMessages.length > 0 && (
        <Card className="overflow-hidden">
          {/* Header with expand/collapse */}
          <div 
            className="flex items-center justify-between p-3 bg-muted cursor-pointer"
            onClick={() => setExpanded(!expanded)}
          >
            <div className="flex items-center gap-2">
              <Bot className="h-4 w-4" />
              <h3 className="text-sm font-medium">Agent Collaboration {collaborationId && `#${collaborationId}`}</h3>
            </div>
            <Button variant="ghost" size="icon" className="h-6 w-6">
              {expanded ? <ChevronDown className="h-4 w-4" /> : <ChevronRight className="h-4 w-4" />}
            </Button>
          </div>
          
          {/* Content when expanded */}
          {expanded && (
            <>
              {/* View switcher */}
              {renderTabSwitch()}
              
              {/* View content based on active tab */}
              {activeView === 'unified' && renderUnifiedView()}
              {activeView === 'agents' && renderAgentView()}
              {activeView === 'timeline' && renderTimelineView()}
              {activeView === 'technical' && showTechnicalView && renderTechnicalView()}
            </>
          )}
        </Card>
      )}
    </div>
  );
}