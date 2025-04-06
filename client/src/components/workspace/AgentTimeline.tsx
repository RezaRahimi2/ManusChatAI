import React from 'react';
import { Agent, Message } from '@shared/schema';
import { cn } from '@/lib/utils';
import { 
  AlignJustify, 
  Check, 
  Clock, 
  AlertCircle, 
  ArrowRight,
  Loader2
} from 'lucide-react';
import { 
  Tooltip, 
  TooltipContent, 
  TooltipTrigger 
} from '@/components/ui/tooltip';
import { format } from 'date-fns';

interface AgentTimelineProps {
  agents: Agent[];
  messages: Message[];
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
  agents,
  messages,
  className = ''
}: AgentTimelineProps) {
  // Generate events from messages
  const timelineEvents = React.useMemo(() => {
    const events: TimelineEvent[] = [];
    let activeAgents = new Set<number>();
    
    messages.forEach(message => {
      if (!message.agentId) return;
      
      const agent = agents.find(a => a.id === message.agentId);
      if (!agent) return;
      
      const timestamp = new Date(message.createdAt);
      
      // Skip system messages or non-relevant messages
      if (message.role === 'system') return;
      
      if (message.role === 'thinking') {
        events.push({
          agent,
          timestamp,
          status: 'thinking',
          message: message.content
        });
        activeAgents.add(agent.id);
      } else if (message.role === 'assistant' && message.metadata && typeof message.metadata === 'object') {
        // Check for metadata on status changes
        const metadata = message.metadata as Record<string, any>;
        
        if (metadata.status === 'completed') {
          events.push({
            agent,
            timestamp,
            status: 'completed',
            message: message.content
          });
          activeAgents.delete(agent.id);
        } else if (metadata.status === 'error') {
          events.push({
            agent,
            timestamp,
            status: 'error',
            message: message.content
          });
          activeAgents.delete(agent.id);
        } else if (metadata.status === 'waiting') {
          events.push({
            agent,
            timestamp,
            status: 'waiting',
            message: message.content
          });
        }
      } else if (message.role === 'assistant') {
        // Regular assistant message
        events.push({
          agent,
          timestamp,
          status: activeAgents.has(agent.id) ? 'active' : 'completed',
          message: message.content
        });
      }
    });
    
    // Sort events by timestamp
    return events.sort((a, b) => a.timestamp.getTime() - b.timestamp.getTime());
  }, [agents, messages]);
  
  // Format time in a human-friendly way
  const formatTime = (date: Date): string => {
    return format(date, 'HH:mm:ss');
  };
  
  // Get status icon
  const getStatusIcon = (status: TimelineEvent['status']) => {
    switch (status) {
      case 'waiting':
        return <Clock className="h-3.5 w-3.5 text-neutral-500" />;
      case 'thinking':
        return <Loader2 className="h-3.5 w-3.5 text-blue-500 animate-spin" />;
      case 'completed':
        return <Check className="h-3.5 w-3.5 text-green-500" />;
      case 'error':
        return <AlertCircle className="h-3.5 w-3.5 text-red-500" />;
      case 'active':
        return <ArrowRight className="h-3.5 w-3.5 text-purple-500" />;
      default:
        return <AlignJustify className="h-3.5 w-3.5 text-neutral-500" />;
    }
  };
  
  // Get agent dot color
  const getAgentColor = (type: string = ''): string => {
    const colorMap: Record<string, string> = {
      research: 'bg-purple-400',
      code: 'bg-blue-400',
      writer: 'bg-green-400',
      reasoning: 'bg-yellow-400',
      planner: 'bg-orange-400',
      orchestrator: 'bg-red-400'
    };
    
    // Find matching color based on type substring
    const matchedType = Object.keys(colorMap).find(key => 
      type.toLowerCase().includes(key)
    );
    
    return matchedType ? colorMap[matchedType] : 'bg-gray-400';
  };
  
  // Get agent initials
  const getAgentInitials = (name: string): string => {
    return name
      .split(' ')
      .map(part => part[0])
      .join('')
      .slice(0, 2)
      .toUpperCase();
  };
  
  // Group events by agent
  const agentGroupedEvents = React.useMemo(() => {
    const groups: Record<number, TimelineEvent[]> = {};
    
    timelineEvents.forEach(event => {
      if (!groups[event.agent.id]) {
        groups[event.agent.id] = [];
      }
      groups[event.agent.id].push(event);
    });
    
    return groups;
  }, [timelineEvents]);
  
  if (timelineEvents.length === 0) {
    return (
      <div className={cn("text-center py-4 text-sm text-neutral-500", className)}>
        No activity yet
      </div>
    );
  }
  
  return (
    <div className={cn("space-y-1 relative pb-4", className)}>
      {/* Timeline container */}
      <div className="space-y-2">
        {Object.entries(agentGroupedEvents).map(([agentId, events]) => {
          const agent = agents.find(a => a.id === Number(agentId));
          if (!agent) return null;
          
          return (
            <div key={agentId} className="relative pl-6 pb-2">
              {/* Agent color dot */}
              <div 
                className={cn(
                  "absolute left-0 top-1.5 w-4 h-4 rounded-full flex items-center justify-center font-medium text-[9px] border-2 border-white dark:border-gray-900",
                  getAgentColor(agent.type)
                )}
              >
                {getAgentInitials(agent.name)}
              </div>
              
              {/* Agent timeline events */}
              <div className="space-y-1.5">
                {events.map((event, idx) => (
                  <div 
                    key={`${agentId}-${idx}`} 
                    className="text-xs flex items-start gap-1.5"
                  >
                    <div className="text-neutral-500 min-w-[60px] pt-0.5">
                      {formatTime(event.timestamp)}
                    </div>
                    
                    <Tooltip>
                      <TooltipTrigger asChild>
                        <div className="flex items-center pt-0.5">
                          {getStatusIcon(event.status)}
                        </div>
                      </TooltipTrigger>
                      <TooltipContent side="right">
                        <p className="text-xs capitalize">{event.status}</p>
                      </TooltipContent>
                    </Tooltip>
                    
                    {event.message && (
                      <div className="flex-1 truncate">
                        {event.message.length > 60 
                          ? `${event.message.substring(0, 60)}...` 
                          : event.message}
                      </div>
                    )}
                  </div>
                ))}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}