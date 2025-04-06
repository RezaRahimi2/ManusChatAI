import React, { useState } from 'react';
import { Agent, Message } from '@shared/schema';
import { cn } from '@/lib/utils';
import { ChevronDown, ChevronRight, Clock } from 'lucide-react';
import { Avatar } from '@/components/ui/avatar';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { Separator } from '@/components/ui/separator';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Markdown } from '@/components/ui/markdown';
import ThinkingMessage from './ThinkingMessage';
import AgentTimeline from '@/components/workspace/AgentTimeline';
import AgentActivityIndicator, { AgentStatus } from '@/components/agents/AgentActivityIndicator';
import { format } from 'date-fns';

interface MessageGroupProps {
  messages: Message[];
  agents: Agent[];
  workspaceId?: number;
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
  agents,
  workspaceId,
  collaborationId,
  getAgent,
  showTechnicalView = false,
  className = ''
}: MessageGroupProps) {
  const [expanded, setExpanded] = useState(true);
  const [activeTab, setActiveTab] = useState<'messages' | 'timeline'>('messages');
  
  // Get the user message (trigger) for this group
  const userMessage = messages.find(m => m.role === 'user');
  
  // Get all agent messages (responses)
  const agentMessages = messages.filter(m => 
    m.role === 'assistant' || m.role === 'thinking'
  );
  
  // Get thinking messages
  const thinkingMessages = messages.filter(m => m.role === 'thinking');
  
  // Get final responses
  const finalResponses = messages.filter(m => 
    m.role === 'assistant' && m.metadata && 
    typeof m.metadata === 'object' && 
    (m.metadata as any).final === true
  );
  
  // Function to format timestamps
  const formatTime = (timestamp: number): string => {
    return format(new Date(timestamp), 'h:mm a');
  };
  
  // Generate timeline steps
  const timelineSteps: TimelineStep[] = messages
    .filter(msg => msg.agentId !== null)
    .map(msg => {
      let status: TimelineStep['status'] = 'completed';
      
      if (msg.role === 'thinking') {
        status = 'thinking';
      } else if (msg.metadata && typeof msg.metadata === 'object') {
        const meta = msg.metadata as Record<string, any>;
        if (meta.status === 'error') status = 'error';
        if (meta.status === 'waiting') status = 'waiting';
      }
      
      return {
        id: `${msg.id}`,
        agentId: msg.agentId!,
        timestamp: new Date(msg.createdAt),
        content: msg.content,
        status
      };
    });
  
  // Check if any agents are still thinking
  const activeAgentIds = new Set(
    thinkingMessages
      .filter(m => !finalResponses.some(r => r.agentId === m.agentId))
      .map(m => m.agentId)
      .filter(Boolean) as number[]
  );
  
  return (
    <Card className={cn("w-full", className)}>
      {/* Header with user message */}
      <div 
        className={cn(
          "flex items-start p-3 gap-3 cursor-pointer",
          !expanded && "border-b-0"
        )}
        onClick={() => setExpanded(!expanded)}
      >
        {/* User avatar */}
        <Avatar className="h-8 w-8 mt-1">
          <div className="flex h-full w-full items-center justify-center bg-blue-100 text-blue-600 dark:bg-blue-800 dark:text-blue-300">
            U
          </div>
        </Avatar>
        
        <div className="flex-1 min-w-0">
          {/* User info & timestamp */}
          <div className="flex items-center justify-between mb-1 text-sm">
            <div className="font-medium">You</div>
            <div className="text-xs text-muted-foreground flex items-center gap-1">
              <Clock className="h-3 w-3" />
              {userMessage && formatTime(userMessage.createdAt)}
            </div>
          </div>
          
          {/* User message content - always visible */}
          <div className="prose prose-sm dark:prose-invert max-w-none">
            {userMessage && <Markdown>{userMessage.content}</Markdown>}
          </div>
          
          {/* Active agents indicator */}
          {activeAgentIds.size > 0 && (
            <div className="mt-2 flex flex-wrap gap-2">
              {agents
                .filter(a => activeAgentIds.has(a.id))
                .map(agent => (
                  <AgentActivityIndicator 
                    key={agent.id}
                    agent={agent} 
                    isActive={true}
                    currentTools={[]}
                  />
                ))
              }
            </div>
          )}
        </div>
        
        {/* Expand/collapse button */}
        <Button variant="ghost" size="icon" className="h-8 w-8 mt-1" onClick={e => {
          e.stopPropagation();
          setExpanded(!expanded);
        }}>
          {expanded ? <ChevronDown className="h-4 w-4" /> : <ChevronRight className="h-4 w-4" />}
        </Button>
      </div>
      
      {/* Expandable content with agent responses */}
      {expanded && (
        <div className="px-3 pb-3">
          <Separator className="mb-3" />
          
          {/* Tabs for different views */}
          <Tabs 
            value={activeTab} 
            onValueChange={(value) => setActiveTab(value as 'messages' | 'timeline')}
            className="w-full"
          >
            <TabsList className="mb-2">
              <TabsTrigger value="messages" className="text-xs">Messages</TabsTrigger>
              <TabsTrigger value="timeline" className="text-xs">Timeline</TabsTrigger>
            </TabsList>
            
            {/* Messages tab content */}
            <TabsContent value="messages" className="space-y-3 mt-0">
              {thinkingMessages.map(message => {
                const agent = agents.find(a => a.id === message.agentId);
                if (!agent) return null;
                
                // Skip if there's a final response from this agent
                if (finalResponses.some(r => r.agentId === message.agentId)) {
                  return null;
                }
                
                return (
                  <ThinkingMessage 
                    key={message.id}
                    agent={agent}
                    content={message.content}
                  />
                );
              })}
              
              {finalResponses.map(message => {
                const agent = agents.find(a => a.id === message.agentId);
                if (!agent) return null;
                
                return (
                  <div key={message.id} className="flex items-start gap-3">
                    {/* Agent avatar/indicator */}
                    <div className="mt-1">
                      <AgentActivityIndicator agent={agent} isActive={false} />
                    </div>
                    
                    <div className="flex-1 min-w-0">
                      {/* Agent info & timestamp */}
                      <div className="flex items-center justify-between mb-1 text-sm">
                        <div className="font-medium">{agent.name}</div>
                        <div className="text-xs text-muted-foreground flex items-center gap-1">
                          <Clock className="h-3 w-3" />
                          {formatTime(message.createdAt)}
                        </div>
                      </div>
                      
                      {/* Agent message content */}
                      <div className="prose prose-sm dark:prose-invert max-w-none">
                        <Markdown>{message.content}</Markdown>
                      </div>
                    </div>
                  </div>
                );
              })}
              
              {agentMessages.length === 0 && (
                <div className="text-center text-sm text-muted-foreground py-6">
                  Waiting for agent responses...
                </div>
              )}
            </TabsContent>
            
            {/* Timeline tab content */}
            <TabsContent value="timeline" className="mt-0">
              <AgentTimeline agents={agents} messages={messages} />
            </TabsContent>
          </Tabs>
        </div>
      )}
    </Card>
  );
}