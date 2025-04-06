import React from 'react';
import { Agent } from '@shared/schema';
import { X, Plus, Search } from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Separator } from '@/components/ui/separator';
import { cn } from '@/lib/utils';
import AgentActivityIndicator, { AgentStatus } from './AgentActivityIndicator';

interface AgentTeamSelectorProps {
  agents: Agent[];
  selectedAgents: Agent[];
  onSelectAgent: (agent: Agent) => void;
  onRemoveAgent: (agent: Agent) => void;
  className?: string;
}

/**
 * Component for selecting agents to form a team for collaborative tasks
 */
export default function AgentTeamSelector({
  agents,
  selectedAgents,
  onSelectAgent,
  onRemoveAgent,
  className = ''
}: AgentTeamSelectorProps) {
  const [search, setSearch] = React.useState('');
  const [open, setOpen] = React.useState(false);
  
  // Filter available agents based on search and already selected
  const filteredAgents = React.useMemo(() => {
    const searchLower = search.toLowerCase();
    
    return agents
      .filter(agent => 
        // Filter out already selected agents
        !selectedAgents.some(selected => selected.id === agent.id) &&
        // Match against name or type
        (agent.name.toLowerCase().includes(searchLower) || 
         (agent.type && agent.type.toLowerCase().includes(searchLower)))
      )
      .sort((a, b) => a.name.localeCompare(b.name));
  }, [agents, selectedAgents, search]);
  
  // Group selected agents by type for better organization
  const groupedSelectedAgents = React.useMemo(() => {
    const groups: Record<string, Agent[]> = {};
    
    selectedAgents.forEach(agent => {
      const type = agent.type || 'Other';
      if (!groups[type]) {
        groups[type] = [];
      }
      groups[type].push(agent);
    });
    
    return groups;
  }, [selectedAgents]);
  
  // Get agent initials for avatar
  const getAgentInitials = (name: string): string => {
    return name
      .split(' ')
      .map(part => part[0])
      .join('')
      .slice(0, 2)
      .toUpperCase();
  };
  
  // Get background color based on agent type
  const getAgentColor = (type: string = ''): string => {
    const colorMap: Record<string, string> = {
      research: 'bg-purple-100 text-purple-700 dark:bg-purple-900 dark:text-purple-300',
      code: 'bg-blue-100 text-blue-700 dark:bg-blue-900 dark:text-blue-300',
      writer: 'bg-green-100 text-green-700 dark:bg-green-900 dark:text-green-300',
      reasoning: 'bg-yellow-100 text-yellow-700 dark:bg-yellow-900 dark:text-yellow-300',
      planner: 'bg-orange-100 text-orange-700 dark:bg-orange-900 dark:text-orange-300',
      orchestrator: 'bg-red-100 text-red-700 dark:bg-red-900 dark:text-red-300'
    };
    
    // Find matching color based on type substring
    const matchedType = Object.keys(colorMap).find(key => 
      type.toLowerCase().includes(key)
    );
    
    return matchedType 
      ? colorMap[matchedType] 
      : 'bg-gray-100 text-gray-700 dark:bg-gray-800 dark:text-gray-300';
  };
  
  return (
    <div className={cn("space-y-2", className)}>
      <div className="flex flex-wrap items-center gap-2">
        {/* Selected agents display */}
        {Object.entries(groupedSelectedAgents).map(([type, agents]) => (
          <div key={type} className="flex flex-wrap items-center gap-1">
            {agents.map(agent => (
              <Badge 
                key={agent.id} 
                variant="secondary"
                className={cn(
                  "flex items-center gap-1 pl-1 h-7",
                  getAgentColor(agent.type)
                )}
              >
                <span className="font-medium">{getAgentInitials(agent.name)}</span>
                <span className="text-xs">{agent.name}</span>
                <Button
                  variant="ghost" 
                  size="icon" 
                  className="h-5 w-5 ml-1 rounded-full hover:bg-red-100 hover:text-red-500"
                  onClick={() => onRemoveAgent(agent)}
                >
                  <X className="h-3 w-3" />
                </Button>
              </Badge>
            ))}
          </div>
        ))}
        
        {/* Add agent button */}
        <Popover open={open} onOpenChange={setOpen}>
          <PopoverTrigger asChild>
            <Button 
              variant="outline" 
              size="sm" 
              className="h-7 gap-1"
            >
              <Plus className="h-3.5 w-3.5" />
              <span className="text-xs">Add Agent</span>
            </Button>
          </PopoverTrigger>
          <PopoverContent className="w-64 p-0" align="start">
            <div className="p-2">
              <div className="flex items-center rounded-md border px-3" cmdk-input-wrapper="">
                <Search className="h-4 w-4 shrink-0 opacity-50" />
                <Input
                  placeholder="Search agents..."
                  className="h-8 w-full border-0 bg-transparent p-1 shadow-none focus-visible:ring-0 focus-visible:ring-offset-0"
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                />
              </div>
            </div>
            <Separator />
            <ScrollArea className="h-[300px]">
              {filteredAgents.length === 0 ? (
                <div className="p-4 text-center text-sm text-gray-500">
                  {search ? 'No agents found' : 'All agents already selected'}
                </div>
              ) : (
                <div className="p-2">
                  {filteredAgents.map(agent => (
                    <div 
                      key={agent.id}
                      className="flex items-center justify-between rounded-md p-1 hover:bg-neutral-100 dark:hover:bg-neutral-800 cursor-pointer"
                      onClick={() => {
                        onSelectAgent(agent);
                        setSearch('');
                        setOpen(false);
                      }}
                    >
                      <div className="flex items-center gap-2">
                        <AgentActivityIndicator status="waiting" />
                        <div>
                          <div className="text-sm font-medium">{agent.name}</div>
                          <div className="text-xs text-gray-500">{agent.type}</div>
                        </div>
                      </div>
                      <Button 
                        variant="ghost" 
                        size="icon" 
                        className="h-6 w-6 rounded-full hover:bg-neutral-200 dark:hover:bg-neutral-700"
                      >
                        <Plus className="h-3 w-3" />
                      </Button>
                    </div>
                  ))}
                </div>
              )}
            </ScrollArea>
          </PopoverContent>
        </Popover>
      </div>
    </div>
  );
}