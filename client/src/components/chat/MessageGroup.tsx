import React, { useState, useMemo } from 'react';
import { cn } from '@/lib/utils';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { Tabs, TabsList, TabsTrigger, TabsContent } from '@/components/ui/tabs';
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
 */
export default function MessageGroup({
  messages,
  collaborationId,
  getAgent,
  showTechnicalView = false,
  className
}: MessageGroupProps) {
  const [expanded, setExpanded] = useState(true);
  const [activeTab, setActiveTab] = useState<string>('unified');
  
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
  
  // Format time for display
  const formatTime = (timestamp: Date | number | string): string => {
    const date = new Date(timestamp);
    return date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
  };
  
  // If no user message or agent messages, don't render
  if (!userMessage && agentMessages.length === 0) {
    return null;
  }
  
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
          
          {/* View options tabs */}
          {expanded && (
            <>
              <div className="border-b">
                <Tabs defaultValue="unified" value={activeTab} onValueChange={setActiveTab}>
                  <TabsList className="w-full justify-start h-10 px-3">
                    <TabsTrigger value="unified" className="text-xs">
                      Unified View
                    </TabsTrigger>
                    <TabsTrigger value="agents" className="text-xs">
                      By Agent
                    </TabsTrigger>
                    <TabsTrigger value="timeline" className="text-xs flex items-center gap-1">
                      <Clock className="h-3.5 w-3.5" />
                      <span>Timeline</span>
                    </TabsTrigger>
                    {showTechnicalView && (
                      <TabsTrigger value="technical" className="text-xs">
                        Technical View
                      </TabsTrigger>
                    )}
                  </TabsList>
                </Tabs>
              </div>
              
              {/* Unified view */}
              <TabsContent value="unified" className="p-4 space-y-4">
                {/* Combine all agent messages into a unified response */}
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
              </TabsContent>
              
              {/* Agent view */}
              <TabsContent value="agents" className="p-0">
                {agents.length > 0 && (
                  <Tabs defaultValue={agents[0]?.id.toString() || "0"}>
                    <TabsList className="w-full justify-start p-2 overflow-x-auto flex-nowrap h-auto bg-muted/50">
                      {agents.map(agent => (
                        <TabsTrigger 
                          key={agent.id} 
                          value={agent.id.toString()}
                          className="text-xs whitespace-nowrap"
                        >
                          {agent.name}
                        </TabsTrigger>
                      ))}
                    </TabsList>
                    
                    {agents.map(agent => (
                      <TabsContent key={agent.id} value={agent.id.toString()} className="p-4 space-y-4">
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
                      </TabsContent>
                    ))}
                  </Tabs>
                )}
                {agents.length === 0 && (
                  <div className="p-4 text-sm text-muted-foreground">
                    No agent messages to display
                  </div>
                )}
              </TabsContent>
              
              {/* Timeline view */}
              <TabsContent value="timeline" className="p-0">
                <div className="p-2">
                  <div className="space-y-0">
                    {timelineSteps.map((step, index) => {
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
              </TabsContent>
              
              {/* Technical view for debugging */}
              {showTechnicalView && (
                <TabsContent value="technical" className="p-4">
                  <pre className="bg-neutral-950 text-neutral-50 p-3 rounded text-xs overflow-auto">
                    {JSON.stringify(messages, null, 2)}
                  </pre>
                </TabsContent>
              )}
            </>
          )}
        </Card>
      )}
    </div>
  );
}