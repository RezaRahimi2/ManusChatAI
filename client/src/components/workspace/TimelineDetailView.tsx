import React from 'react';
import { cn } from '@/lib/utils';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { X, ArrowLeft, Clock, CheckCircle, AlertCircle } from 'lucide-react';
import { Agent, Message } from '@shared/schema';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import Markdown from '@/components/ui/markdown';

interface TimelineDetailViewProps {
  events: Array<{
    agent: Agent;
    timestamp: Date;
    status: 'waiting' | 'thinking' | 'completed' | 'error' | 'active';
    message?: string;
  }>;
  agents: Agent[];
  messages: Message[];
  onClose: () => void;
  className?: string;
}

/**
 * Detailed timeline view showing agent activities and messages
 */
export default function TimelineDetailView({
  events,
  agents,
  messages,
  onClose,
  className
}: TimelineDetailViewProps) {
  // Format time display
  const formatTime = (date: Date): string => {
    return date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' });
  };

  return (
    <Card className={cn('w-full max-w-4xl mx-auto', className)}>
      <CardHeader className="flex flex-row items-center justify-between p-4 border-b">
        <div className="flex items-center gap-2">
          <Button variant="ghost" size="icon" onClick={onClose}>
            <ArrowLeft className="h-4 w-4" />
          </Button>
          <CardTitle className="text-lg font-semibold">Agent Activity Timeline</CardTitle>
        </div>
        <Button variant="ghost" size="icon" onClick={onClose}>
          <X className="h-4 w-4" />
        </Button>
      </CardHeader>
      
      <CardContent className="p-0">
        <Tabs defaultValue="timeline" className="w-full">
          <TabsList className="w-full justify-start border-b rounded-none p-0 h-auto">
            <TabsTrigger 
              value="timeline" 
              className="px-6 py-3 rounded-none data-[state=active]:border-b-2 data-[state=active]:border-primary"
            >
              Timeline
            </TabsTrigger>
            <TabsTrigger 
              value="agents" 
              className="px-6 py-3 rounded-none data-[state=active]:border-b-2 data-[state=active]:border-primary"
            >
              By Agent
            </TabsTrigger>
          </TabsList>
          
          <TabsContent value="timeline" className="mt-0 p-0">
            <ScrollArea className="h-[70vh]">
              <div className="p-4">
                {events.map((event, index) => (
                  <div 
                    key={`${event.agent.id}-${event.timestamp.getTime()}-${index}`} 
                    className="mb-4 ml-4 pl-4 py-2 border-l relative"
                  >
                    {/* Timeline dot */}
                    <div 
                      className={cn(
                        "absolute left-[-8px] top-3 w-4 h-4 rounded-full border-2 border-background flex items-center justify-center",
                        event.status === 'thinking' || event.status === 'active' ? 'bg-blue-500' :
                        event.status === 'completed' ? 'bg-green-500' :
                        event.status === 'error' ? 'bg-red-500' : 'bg-muted'
                      )} 
                    >
                      {event.status === 'completed' && <CheckCircle className="h-2 w-2 text-white" />}
                      {event.status === 'error' && <AlertCircle className="h-2 w-2 text-white" />}
                      {(event.status === 'thinking' || event.status === 'active') && <Clock className="h-2 w-2 text-white" />}
                    </div>
                    
                    {/* Event content */}
                    <div className="flex flex-col">
                      <div className="flex items-center gap-2">
                        <span className="text-sm text-muted-foreground">{formatTime(event.timestamp)}</span>
                        <span className="text-base font-medium">{event.agent.name}</span>
                        
                        {/* Status indicator */}
                        {event.status === 'thinking' && (
                          <span className="inline-flex items-center px-2 py-1 rounded-full text-xs bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-300">
                            Thinking...
                          </span>
                        )}
                        {event.status === 'active' && (
                          <span className="inline-flex items-center px-2 py-1 rounded-full text-xs bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-300">
                            Processing...
                          </span>
                        )}
                        {event.status === 'completed' && (
                          <span className="inline-flex items-center gap-1 px-2 py-1 rounded-full text-xs bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-300">
                            <CheckCircle className="h-3 w-3" />
                            Completed
                          </span>
                        )}
                        {event.status === 'error' && (
                          <span className="inline-flex items-center gap-1 px-2 py-1 rounded-full text-xs bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-300">
                            <AlertCircle className="h-3 w-3" />
                            Error
                          </span>
                        )}
                        {event.status === 'waiting' && (
                          <span className="inline-flex items-center px-2 py-1 rounded-full text-xs bg-neutral-100 text-neutral-800 dark:bg-neutral-800 dark:text-neutral-300">
                            Waiting
                          </span>
                        )}
                      </div>
                      
                      {/* Message display */}
                      {event.message && (
                        <div className="mt-2 p-3 text-sm border rounded bg-card">
                          <Markdown>{event.message}</Markdown>
                        </div>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            </ScrollArea>
          </TabsContent>
          
          <TabsContent value="agents" className="mt-0 p-0">
            <ScrollArea className="h-[70vh]">
              <div className="p-4">
                {agents.map(agent => {
                  // Filter events for this agent
                  const agentEvents = events.filter(event => event.agent.id === agent.id);
                  
                  if (agentEvents.length === 0) return null;
                  
                  return (
                    <div key={agent.id} className="mb-6">
                      <div className="flex items-center gap-2 mb-2">
                        <div className="w-8 h-8 rounded-full bg-primary flex items-center justify-center">
                          <span className="text-white font-medium">{agent.name.charAt(0)}</span>
                        </div>
                        <h3 className="text-base font-medium">{agent.name}</h3>
                      </div>
                      
                      <div className="ml-10 space-y-3">
                        {agentEvents.map((event, index) => (
                          <div 
                            key={`${event.agent.id}-${event.timestamp.getTime()}-${index}`}
                            className="border rounded p-3 bg-card"
                          >
                            <div className="flex items-center justify-between mb-2">
                              <span className="text-sm text-muted-foreground">{formatTime(event.timestamp)}</span>
                              
                              {/* Status badge */}
                              {event.status === 'thinking' && (
                                <span className="inline-flex items-center px-2 py-0.5 rounded-full text-xs bg-blue-100 text-blue-800">
                                  Thinking
                                </span>
                              )}
                              {event.status === 'active' && (
                                <span className="inline-flex items-center px-2 py-0.5 rounded-full text-xs bg-blue-100 text-blue-800">
                                  Active
                                </span>
                              )}
                              {event.status === 'completed' && (
                                <span className="inline-flex items-center px-2 py-0.5 rounded-full text-xs bg-green-100 text-green-800">
                                  Completed
                                </span>
                              )}
                              {event.status === 'error' && (
                                <span className="inline-flex items-center px-2 py-0.5 rounded-full text-xs bg-red-100 text-red-800">
                                  Error
                                </span>
                              )}
                              {event.status === 'waiting' && (
                                <span className="inline-flex items-center px-2 py-0.5 rounded-full text-xs bg-neutral-100 text-neutral-800">
                                  Waiting
                                </span>
                              )}
                            </div>
                            
                            {/* Message content */}
                            {event.message && (
                              <div className="text-sm">
                                <Markdown>{event.message}</Markdown>
                              </div>
                            )}
                          </div>
                        ))}
                      </div>
                    </div>
                  );
                })}
              </div>
            </ScrollArea>
          </TabsContent>
        </Tabs>
      </CardContent>
    </Card>
  );
}