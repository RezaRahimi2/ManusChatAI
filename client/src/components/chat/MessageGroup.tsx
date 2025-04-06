import React, { useState, useMemo, useEffect } from 'react';
import { cn } from '@/lib/utils';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { Avatar } from '@/components/ui/avatar';
import { 
  ChevronDown, ChevronRight, User, Bot, Clock, Brain, 
  Search, Code, Edit, Lightbulb, Code2, LayoutDashboard,
  Users, GitBranch
} from 'lucide-react';
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
  useEffect(() => {
    if (agents.length > 0 && !activeAgentId) {
      setActiveAgentId(agents[0].id);
    }
  }, [agents, activeAgentId]);
  
  // Format time for display
  const formatTime = (timestamp: Date | number | string): string => {
    const date = new Date(timestamp);
    return date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
  };
  
  // Get agent color based on type
  const getAgentColor = (type?: string): string => {
    switch(type) {
      case 'orchestrator': return '#7c3aed'; // Violet
      case 'planner': return '#2563eb';      // Blue
      case 'research': return '#059669';     // Green
      case 'code': return '#f59e0b';         // Amber
      case 'writer': return '#db2777';       // Pink
      case 'thinker': return '#6366f1';      // Indigo
      default: return '#6b7280';             // Gray
    }
  };
  
  // Get agent icon component based on type
  const getAgentIcon = (type?: string) => {
    switch(type) {
      case 'orchestrator': return <Brain className="h-3.5 w-3.5 text-primary" />;
      case 'planner': return <Clock className="h-3.5 w-3.5 text-primary" />;
      case 'research': return <Search className="h-3.5 w-3.5 text-primary" />;
      case 'code': return <Code className="h-3.5 w-3.5 text-primary" />;
      case 'writer': return <Edit className="h-3.5 w-3.5 text-primary" />;
      case 'thinker': return <Lightbulb className="h-3.5 w-3.5 text-primary" />;
      default: return <Bot className="h-3.5 w-3.5 text-primary" />;
    }
  };
  
  // Get smaller agent icon for timeline view
  const getAgentIconForTimeline = (type?: string) => {
    switch(type) {
      case 'orchestrator': return <Brain className="h-2 w-2" />;
      case 'planner': return <Clock className="h-2 w-2" />;
      case 'research': return <Search className="h-2 w-2" />;
      case 'code': return <Code className="h-2 w-2" />;
      case 'writer': return <Edit className="h-2 w-2" />;
      case 'thinker': return <Lightbulb className="h-2 w-2" />;
      default: return <Bot className="h-2 w-2" />;
    }
  };
  
  // Get action label for timeline specifically
  const getActionLabelForTimeline = (content: string): string => {
    // Shorter labels for timeline view
    const contentLower = content.toLowerCase();
    if (contentLower.includes('analyzing') || contentLower.includes('analysis')) {
      return 'analyzing';
    } else if (contentLower.includes('researching') || contentLower.includes('research')) {
      return 'researching';
    } else if (contentLower.includes('code') || contentLower.includes('function')) {
      return 'coding';
    } else if (contentLower.includes('plan') || contentLower.includes('steps')) {
      return 'planning';
    } else if (contentLower.includes('thinking') || contentLower.includes('consider')) {
      return 'thinking';
    } else if (contentLower.includes('responding') || contentLower.includes('response')) {
      return 'responding';
    } else if (contentLower.includes('error') || contentLower.includes('failed')) {
      return 'error';
    } else if (contentLower.includes('completed') || contentLower.includes('finished')) {
      return 'completed';
    }
    
    return 'active';
  };
  
  // Get action label based on message metadata
  const getActionLabel = (message: Message): string => {
    // Check if metadata exists and is an object
    if (!message.metadata || typeof message.metadata !== 'object') {
      return 'Response';
    }
    
    const metadata = message.metadata as any;
    
    // Check for action type
    if (metadata.action) {
      return metadata.action;
    }
    
    // Check for message type
    if (metadata.type) {
      switch (metadata.type) {
        case 'thinking': return 'Thinking';
        case 'response': return 'Response';
        case 'error': return 'Error';
        case 'suggestion': return 'Suggestion';
        case 'question': return 'Question';
        case 'analysis': return 'Analysis';
        case 'summary': return 'Summary';
        default: return metadata.type.charAt(0).toUpperCase() + metadata.type.slice(1);
      }
    }
    
    // Check content for specific patterns
    const content = message.content.toLowerCase();
    if (content.includes('analyzing') || content.includes('analysis')) {
      return 'Analysis';
    } else if (content.includes('researching') || content.includes('research')) {
      return 'Research';
    } else if (content.includes('code') || content.includes('function')) {
      return 'Code Generation';
    } else if (content.includes('plan') || content.includes('steps')) {
      return 'Planning';
    } else if (content.includes('thinking') || content.includes('consider')) {
      return 'Thinking';
    }
    
    return 'Response';
  };
  
  // If no user message or agent messages, don't render
  if (!userMessage && agentMessages.length === 0) {
    return null;
  }
  
  // View switcher with modern design
  const renderTabSwitch = () => (
    <div className="w-full border-b bg-muted/20">
      <div className="flex justify-center p-2 gap-1">
        <button
          onClick={() => setActiveView('unified')}
          className={`px-3 py-1.5 text-xs rounded-md flex items-center gap-1.5 transition-all ${
            activeView === 'unified'
              ? 'bg-white dark:bg-neutral-800 text-primary font-medium shadow-sm border border-primary/20'
              : 'hover:bg-white/70 dark:hover:bg-neutral-800/70 text-muted-foreground hover:text-foreground'
          }`}
        >
          <LayoutDashboard className="h-3 w-3" />
          Unified View
        </button>
        <button
          onClick={() => setActiveView('agents')}
          className={`px-3 py-1.5 text-xs rounded-md flex items-center gap-1.5 transition-all ${
            activeView === 'agents'
              ? 'bg-white dark:bg-neutral-800 text-primary font-medium shadow-sm border border-primary/20'
              : 'hover:bg-white/70 dark:hover:bg-neutral-800/70 text-muted-foreground hover:text-foreground'
          }`}
        >
          <Users className="h-3 w-3" />
          By Agent
        </button>
        <button
          onClick={() => setActiveView('timeline')}
          className={`px-3 py-1.5 text-xs rounded-md flex items-center gap-1.5 transition-all ${
            activeView === 'timeline'
              ? 'bg-white dark:bg-neutral-800 text-primary font-medium shadow-sm border border-primary/20'
              : 'hover:bg-white/70 dark:hover:bg-neutral-800/70 text-muted-foreground hover:text-foreground'
          }`}
        >
          <GitBranch className="h-3 w-3" />
          Timeline
        </button>
        {showTechnicalView && (
          <button
            onClick={() => setActiveView('technical')}
            className={`px-3 py-1.5 text-xs rounded-md flex items-center gap-1.5 transition-all ${
              activeView === 'technical'
                ? 'bg-white dark:bg-neutral-800 text-primary font-medium shadow-sm border border-primary/20'
                : 'hover:bg-white/70 dark:hover:bg-neutral-800/70 text-muted-foreground hover:text-foreground'
            }`}
          >
            <Code2 className="h-3 w-3" />
            Technical View
          </button>
        )}
      </div>
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
            <div key={message.id || index} className="rounded-md overflow-hidden border shadow-sm" style={{ borderLeft: `4px solid ${getAgentColor(agent?.type)}` }}>
              {agent && (
                <div className="flex items-center justify-between bg-muted/40 px-3 py-2">
                  <div className="flex items-center gap-2">
                    <Avatar className="h-6 w-6 bg-primary/10">
                      {getAgentIcon(agent.type)}
                    </Avatar>
                    <div>
                      <span className="text-sm font-semibold" style={{ color: getAgentColor(agent?.type) }}>{agent.name}</span>
                    </div>
                  </div>
                  <div className="flex items-center gap-2">
                    <div className="text-xs px-2 py-0.5 rounded-full bg-muted text-muted-foreground font-medium">
                      {getActionLabel(message)}
                    </div>
                    <span className="text-xs text-muted-foreground">
                      {formatTime(message.createdAt)}
                    </span>
                  </div>
                </div>
              )}
              <div className="text-sm bg-card p-3">
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
          <div className="w-full bg-muted/50 p-2 flex overflow-x-auto flex-nowrap gap-1">
            {agents.map((agent) => (
              <button
                key={agent.id}
                onClick={() => setActiveAgentId(agent.id)}
                className={`text-xs whitespace-nowrap px-3 py-1.5 rounded-md transition-colors flex items-center gap-1 ${
                  activeAgentId === agent.id
                    ? 'bg-white dark:bg-neutral-800 text-primary font-medium shadow-sm border border-primary/20' 
                    : 'text-muted-foreground hover:bg-white/50 dark:hover:bg-neutral-800/50 hover:text-foreground'
                }`}
                style={{ 
                  borderLeft: activeAgentId === agent.id ? `3px solid ${getAgentColor(agent.type)}` : ''
                }}
              >
                <span className="h-2 w-2 rounded-full" style={{ backgroundColor: getAgentColor(agent.type) }}></span>
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
                {/* Agent header */}
                <div className="flex items-center gap-2 p-3 bg-muted/50 rounded-lg mb-4 border-l-4" style={{ borderColor: getAgentColor(agent.type) }}>
                  <Avatar className="h-8 w-8 bg-primary/10">
                    {getAgentIcon(agent.type)}
                  </Avatar>
                  <div>
                    <div className="font-bold text-primary">{agent.name}</div>
                    <div className="text-xs text-muted-foreground">
                      {agent.description || `${agent.type.charAt(0).toUpperCase() + agent.type.slice(1)} agent`}
                    </div>
                  </div>
                </div>
                
                {/* Agent messages */}
                {agentMessages
                  .filter(msg => msg.agentId === agent.id && !(typeof msg.metadata === 'object' && msg.metadata && (msg.metadata as any)?.type === 'thinking'))
                  .map((message, index) => (
                    <div key={message.id || index} className="rounded-md overflow-hidden border shadow-sm" style={{ borderLeft: `4px solid ${getAgentColor(agent.type)}` }}>
                      <div className="flex items-center justify-between bg-muted/30 px-3 py-2">
                        <div className="flex items-center gap-2">
                          <div className="flex text-xs items-center font-medium px-2 py-0.5 rounded-full" 
                               style={{ 
                                 backgroundColor: `${getAgentColor(agent.type)}20`,
                                 color: getAgentColor(agent.type)
                               }}>
                            {getActionLabel(message)}
                          </div>
                        </div>
                        <div className="text-xs text-muted-foreground">
                          {formatTime(message.createdAt)}
                        </div>
                      </div>
                      <div className="text-sm bg-card p-3">
                        <Markdown>{message.content}</Markdown>
                      </div>
                    </div>
                  ))}
                  
                {/* Show thinking if available */}
                {agentMessages
                  .filter(msg => msg.agentId === agent.id && typeof msg.metadata === 'object' && msg.metadata && (msg.metadata as any)?.type === 'thinking')
                  .map((message, index) => (
                    <div key={`thinking-${message.id || index}`} className="rounded-md overflow-hidden border shadow-sm bg-blue-50/30 dark:bg-blue-950/20">
                      <div className="flex items-center justify-between bg-blue-100/50 dark:bg-blue-900/30 px-3 py-2 border-b border-blue-200 dark:border-blue-800">
                        <div className="flex items-center gap-2">
                          <span className="text-xs font-medium flex items-center text-blue-700 dark:text-blue-400">
                            <Brain className="h-3.5 w-3.5 mr-1" />
                            Reasoning Process
                          </span>
                        </div>
                        <div className="text-xs text-blue-600/80 dark:text-blue-400/80">
                          {formatTime(message.createdAt)}
                        </div>
                      </div>
                      <div className="text-xs p-3 text-muted-foreground">
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
            <div key={step.id} className="relative pl-6 ml-3 pb-4 pt-1 border-l" style={{ 
              borderColor: agent?.type ? getAgentColor(agent.type) + '40' : undefined 
            }}>
              {/* Timeline dot */}
              <div 
                className={cn(
                  "absolute left-[-5px] top-2 w-3.5 h-3.5 rounded-full border-2 flex items-center justify-center",
                  step.status === 'thinking' ? 'bg-blue-100 border-blue-500 dark:bg-blue-900' :
                  step.status === 'completed' ? 'bg-green-100 border-green-500 dark:bg-green-900' :
                  step.status === 'error' ? 'bg-red-100 border-red-500 dark:bg-red-900' :
                  'bg-neutral-100 border-neutral-400 dark:bg-neutral-800'
                )}
              >
                {agent?.type && (
                  <div className="text-[8px]" style={{ color: getAgentColor(agent.type) }}>
                    {step.status === 'thinking' ? (
                      <Brain className="h-2 w-2" />
                    ) : step.status === 'error' ? (
                      <Clock className="h-2 w-2" />
                    ) : (
                      getAgentIconForTimeline(agent.type)
                    )}
                  </div>
                )}
              </div>
              
              {/* Step details */}
              <div className="space-y-1">
                <div className="flex items-center justify-between text-xs gap-2">
                  <div className="flex items-center gap-1.5">
                    <span className="font-medium" style={{ color: agent?.type ? getAgentColor(agent.type) : undefined }}>
                      {agent?.name || `Agent #${step.agentId}`}
                    </span>
                    <span className="px-1.5 py-0.5 rounded-full text-[10px] bg-muted text-muted-foreground">
                      {step.status === 'thinking' ? 'thinking...' : 
                       step.status === 'error' ? 'error' : 
                       step.status === 'waiting' ? 'waiting' : getActionLabelForTimeline(step.content)}
                    </span>
                  </div>
                  <span className="text-muted-foreground text-[10px]">
                    {formatTime(step.timestamp)}
                  </span>
                </div>
                <div className={cn(
                  "text-xs p-2 rounded border-l-2 ml-1",
                  step.status === 'thinking' 
                    ? 'bg-blue-50/50 border-blue-300 dark:bg-blue-950/20 dark:border-blue-700' :
                  step.status === 'completed' 
                    ? 'bg-card border-neutral-200 dark:border-neutral-700' :
                  step.status === 'error' 
                    ? 'bg-red-50/50 border-red-300 dark:bg-red-950/20 dark:border-red-700' :
                  'bg-neutral-50 border-neutral-200 dark:bg-neutral-900/30 dark:border-neutral-700'
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
        <Card className="overflow-hidden border shadow-md">
          {/* Header with expand/collapse */}
          <div 
            className="flex items-center justify-between p-3 bg-primary/5 cursor-pointer border-b"
            onClick={() => setExpanded(!expanded)}
          >
            <div className="flex items-center gap-2">
              <Bot className="h-4 w-4 text-primary" />
              <h3 className="text-sm font-medium">Agent Collaboration {collaborationId && `#${collaborationId}`}</h3>
            </div>
            <Button 
              variant="ghost" 
              size="icon" 
              className="h-6 w-6 hover:bg-primary/10"
              onClick={(e) => {
                e.stopPropagation();
                setExpanded(!expanded);
              }}
            >
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