import React, { useState, useEffect } from 'react';
import { cn } from '@/lib/utils';
import { Button } from '@/components/ui/button';
import { ScrollArea } from '@/components/ui/scroll-area';
import { ChevronDown, ChevronRight, Clock, AlertCircle, CheckCircle } from 'lucide-react';
import { Agent, Message } from '@shared/schema';

interface AgentTimelineProps {
  activeAgents: {
    agent: Agent;
    status: string;
  }[];
  onShowDetails?: () => void;
  agents?: Agent[];
  messages?: Message[];
  className?: string;
}

interface TimelineEvent {
  agent: Agent;
  timestamp: Date;
  status: 'waiting' | 'thinking' | 'completed' | 'error' | 'active';
  message?: string;
}

/**
 * Timeline visualization of agent activities during collaboration
 */
export default function AgentTimeline({
  activeAgents,
  agents = [],
  messages = [],
  onShowDetails,
  className
}: AgentTimelineProps) {
  const [expanded, setExpanded] = useState(false);
  const [events, setEvents] = useState<TimelineEvent[]>([]);
  
  // Format time display
  const formatTime = (date: Date): string => {
    return date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' });
  };
  
  // Extract timeline events from messages and agent statuses 
  // Memoize event generation to avoid infinite render loops
  useEffect(() => {
    // Skip if no data to process
    if (!messages.length && !activeAgents.length) {
      setEvents([]);
      return;
    }
    
    // Create a stable JSON representation of the inputs for comparison
    const messagesJSON = JSON.stringify(messages.map(m => ({
      id: m.id,
      agentId: m.agentId,
      createdAt: m.createdAt,
      content: m.content,
      metadata: m.metadata
    })));
    
    const agentsJSON = JSON.stringify(agents.map(a => ({
      id: a.id,
      name: a.name
    })));
    
    const activeAgentsJSON = JSON.stringify(activeAgents.map(a => ({
      id: a.agent.id,
      status: a.status
    })));
    
    // Create a stabilized identifier for dependencies
    const dependencyHash = `${messagesJSON}-${agentsJSON}-${activeAgentsJSON}`;
    
    // Don't regenerate events if dependencies haven't changed
    const generateEvents = () => {
      const newEvents: TimelineEvent[] = [];
      
      // Add events from messages
      messages.forEach(message => {
        if (!message.agentId) return;
        
        // Find corresponding agent
        const agent = agents.find(a => a.id === message.agentId);
        if (!agent) return;
        
        // Determine status based on message metadata.type
        let status: TimelineEvent['status'] = 'completed';
        const messageType = typeof message.metadata === 'object' && message.metadata 
          ? (message.metadata as any)?.type 
          : null;
        
        if (messageType === 'thinking') {
          status = 'thinking';
        } else if (messageType === 'error') {
          status = 'error';
        }
        
        newEvents.push({
          agent,
          timestamp: new Date(message.createdAt),
          status,
          message: message.content
        });
      });
      
      // Add events from active agents
      activeAgents.forEach(({ agent, status }) => {
        // Skip if agent is already in timeline with more recent events
        const lastAgentEvent = newEvents
          .filter(e => e.agent.id === agent.id)
          .sort((a, b) => b.timestamp.getTime() - a.timestamp.getTime())[0];
        
        if (lastAgentEvent && 
            (lastAgentEvent.status === 'thinking' || lastAgentEvent.status === 'completed')) {
          return;
        }
        
        // Map status string to timeline status
        let timelineStatus: TimelineEvent['status'] = 'waiting';
        if (status === 'processing') {
          timelineStatus = 'active';
        } else if (status === 'completed') {
          timelineStatus = 'completed';
        } else if (status === 'error') {
          timelineStatus = 'error';
        }
        
        newEvents.push({
          agent,
          timestamp: new Date(),
          status: timelineStatus
        });
      });
      
      // Sort events by timestamp, most recent first
      newEvents.sort((a, b) => b.timestamp.getTime() - a.timestamp.getTime());
      
      return newEvents;
    };
    
    // Process once for each unique set of dependencies
    setEvents(generateEvents());
    
  // Using this stable dependency identifier instead of the actual objects
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [JSON.stringify(messages.map(m => m.id)), 
      JSON.stringify(activeAgents.map(a => `${a.agent.id}-${a.status}`)), 
      JSON.stringify(agents.map(a => a.id))]);
  
  // No timeline if there are no events
  if (events.length === 0) {
    return null;
  }
  
  return (
    <div className={cn('border rounded-md overflow-hidden', className)}>
      <div 
        className="flex items-center justify-between p-3 bg-muted cursor-pointer"
        onClick={() => setExpanded(!expanded)}
      >
        <div className="flex items-center gap-2">
          <Clock className="h-4 w-4 opacity-70" />
          <h3 className="text-sm font-medium">Agent Activity Timeline</h3>
        </div>
        <Button variant="ghost" size="icon" className="h-6 w-6">
          {expanded ? <ChevronDown className="h-4 w-4" /> : <ChevronRight className="h-4 w-4" />}
        </Button>
      </div>
      
      {expanded && (
        <ScrollArea className="max-h-[240px]">
          <div className="p-2">
            {events.map((event, index) => (
              <div key={`${event.agent.id}-${event.timestamp.getTime()}-${index}`} className="ml-2 pl-4 py-2 border-l relative">
                {/* Timeline dot */}
                <div 
                  className={cn(
                    "absolute left-[-5px] top-3 w-2.5 h-2.5 rounded-full border-2 border-background",
                    event.status === 'thinking' || event.status === 'active' ? 'bg-blue-500' :
                    event.status === 'completed' ? 'bg-green-500' :
                    event.status === 'error' ? 'bg-red-500' : 'bg-muted'
                  )} 
                />
                
                {/* Event content */}
                <div className="flex flex-col">
                  <div className="flex items-center gap-2">
                    <span className="text-xs text-muted-foreground">{formatTime(event.timestamp)}</span>
                    <span className="text-sm font-medium">{event.agent.name}</span>
                    
                    {/* Status indicator */}
                    {event.status === 'thinking' && (
                      <span className="inline-flex items-center px-1.5 py-0.5 rounded-full text-xs bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-300">
                        Thinking...
                      </span>
                    )}
                    {event.status === 'active' && (
                      <span className="inline-flex items-center px-1.5 py-0.5 rounded-full text-xs bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-300">
                        Processing...
                      </span>
                    )}
                    {event.status === 'completed' && (
                      <span className="inline-flex items-center gap-1 px-1.5 py-0.5 rounded-full text-xs bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-300">
                        <CheckCircle className="h-3 w-3" />
                        Completed
                      </span>
                    )}
                    {event.status === 'error' && (
                      <span className="inline-flex items-center gap-1 px-1.5 py-0.5 rounded-full text-xs bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-300">
                        <AlertCircle className="h-3 w-3" />
                        Error
                      </span>
                    )}
                    {event.status === 'waiting' && (
                      <span className="inline-flex items-center px-1.5 py-0.5 rounded-full text-xs bg-neutral-100 text-neutral-800 dark:bg-neutral-800 dark:text-neutral-300">
                        Waiting
                      </span>
                    )}
                  </div>
                  
                  {/* Message preview */}
                  {event.message && (
                    <div className="mt-1 text-xs text-muted-foreground line-clamp-2">
                      {event.message}
                    </div>
                  )}
                </div>
              </div>
            ))}
            
            {/* Show full view button */}
            {onShowDetails && (
              <div className="p-2 flex justify-center">
                <Button 
                  variant="outline" 
                  size="sm" 
                  className="text-xs"
                  onClick={onShowDetails}
                >
                  Show Detailed View
                </Button>
              </div>
            )}
          </div>
        </ScrollArea>
      )}
    </div>
  );
}