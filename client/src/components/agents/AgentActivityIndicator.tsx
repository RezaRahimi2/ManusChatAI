import React from 'react';
import { Agent } from '@shared/schema';
import { Loader2, CheckCircle, Wrench, Archive, Database, ChevronsRight } from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { Tooltip, TooltipContent, TooltipTrigger } from '@/components/ui/tooltip';
import { cn } from '@/lib/utils';

export enum AgentStatus {
  WAITING = 'waiting',
  PROCESSING = 'processing',
  COMPLETED = 'completed',
  ERROR = 'error'
}

interface AgentActivityIndicatorProps {
  agent: Agent;
  isActive: boolean;
  currentTools?: string[];
  className?: string;
}

type ToolIconMap = Record<string, React.ReactNode>;

/**
 * Visual indicator for agent status and current tools in use
 */
export default function AgentActivityIndicator({
  agent,
  isActive,
  currentTools = [],
  className = ''
}: AgentActivityIndicatorProps) {
  // Function to generate agent avatar/icon with status indicator
  const renderAgentAvatar = () => {
    const avatarStyles: Record<string, string> = {
      research: 'bg-purple-100 text-purple-700 dark:bg-purple-900 dark:text-purple-300',
      code: 'bg-blue-100 text-blue-700 dark:bg-blue-900 dark:text-blue-300',
      writer: 'bg-green-100 text-green-700 dark:bg-green-900 dark:text-green-300',
      reasoning: 'bg-yellow-100 text-yellow-700 dark:bg-yellow-900 dark:text-yellow-300',
      planner: 'bg-orange-100 text-orange-700 dark:bg-orange-900 dark:text-orange-300',
      orchestrator: 'bg-red-100 text-red-700 dark:bg-red-900 dark:text-red-300',
      default: 'bg-gray-100 text-gray-700 dark:bg-gray-800 dark:text-gray-300'
    };
    
    // Determine style based on agent type
    const typeKey = Object.keys(avatarStyles).find(key => 
      agent.type?.toLowerCase().includes(key)
    ) || 'default';
    
    // Get the avatar style
    const avatarStyle = avatarStyles[typeKey];
    
    // Create initials from agent name
    const initials = agent.name
      .split(' ')
      .map(part => part[0])
      .join('')
      .slice(0, 2)
      .toUpperCase();
    
    return (
      <div className={cn(
        "relative w-8 h-8 rounded-full flex items-center justify-center font-medium text-sm",
        avatarStyle,
        className
      )}>
        {initials}
        
        {/* Status indicator */}
        {isActive && (
          <div className="absolute -right-1 -bottom-1 w-3 h-3 rounded-full bg-green-500 border-2 border-white dark:border-gray-900" />
        )}
      </div>
    );
  };
  
  // Map of tool names to icons
  const toolIcons: ToolIconMap = {
    search: <Archive className="h-3 w-3" />,
    database: <Database className="h-3 w-3" />,
    transform: <ChevronsRight className="h-3 w-3" />,
    default: <Wrench className="h-3 w-3" />
  };
  
  // Get icon for a tool
  const getToolIcon = (toolName: string) => {
    // Check if the tool name includes any key from toolIcons
    const matchedKey = Object.keys(toolIcons).find(key => 
      toolName.toLowerCase().includes(key)
    );
    
    return matchedKey ? toolIcons[matchedKey] : toolIcons.default;
  };
  
  return (
    <div className="flex items-center gap-1.5">
      {/* Agent avatar with status indicator */}
      <Tooltip>
        <TooltipTrigger asChild>
          <div>
            {renderAgentAvatar()}
          </div>
        </TooltipTrigger>
        <TooltipContent>
          <p className="text-xs">{agent.name} - {agent.type}</p>
          {isActive && <p className="text-xs font-medium text-green-500">Active</p>}
        </TooltipContent>
      </Tooltip>
      
      {/* Tool badges (only when active) */}
      {isActive && currentTools && currentTools.length > 0 && (
        <div className="flex gap-1">
          {currentTools.slice(0, 2).map((tool, index) => (
            <Tooltip key={`${tool}-${index}`}>
              <TooltipTrigger asChild>
                <Badge 
                  variant="outline" 
                  className="h-5 px-1 bg-neutral-50 dark:bg-neutral-900 flex items-center gap-0.5 text-[10px]"
                >
                  {getToolIcon(tool)}
                  <span className="truncate max-w-16">{tool}</span>
                </Badge>
              </TooltipTrigger>
              <TooltipContent>
                <p className="text-xs">Using {tool}</p>
              </TooltipContent>
            </Tooltip>
          ))}
          
          {/* "More" indicator if there are additional tools */}
          {currentTools.length > 2 && (
            <Tooltip>
              <TooltipTrigger asChild>
                <Badge 
                  variant="outline" 
                  className="h-5 px-1.5 bg-neutral-50 dark:bg-neutral-900 text-[10px]"
                >
                  +{currentTools.length - 2}
                </Badge>
              </TooltipTrigger>
              <TooltipContent>
                <div className="text-xs space-y-1">
                  <p>Additional tools:</p>
                  <ul className="list-disc pl-3">
                    {currentTools.slice(2).map((tool, index) => (
                      <li key={`more-${tool}-${index}`}>{tool}</li>
                    ))}
                  </ul>
                </div>
              </TooltipContent>
            </Tooltip>
          )}
        </div>
      )}
      
      {/* Loader animation when active */}
      {isActive && currentTools.length === 0 && (
        <Loader2 className="h-3 w-3 animate-spin text-neutral-500" />
      )}
    </div>
  );
}