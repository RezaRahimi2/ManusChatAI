import React from 'react';
import { cn } from '@/lib/utils';
import { Button } from '@/components/ui/button';
import { Switch } from '@/components/ui/switch';
import { Label } from '@/components/ui/label';
import { Tabs, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Tooltip, TooltipContent, TooltipTrigger } from '@/components/ui/tooltip';
import { 
  RefreshCw, 
  Layers, 
  GitMerge, 
  ChevronsRight, 
  Sparkles,
  InfoIcon
} from 'lucide-react';

export type CollaborationMode = 'sequential' | 'parallel' | 'adaptive' | 'expert_driven';

interface CollaborationControlsProps {
  onConfigChange: (config: any) => void;
  availableAgents: any[];
  className?: string;
  mode?: CollaborationMode;
  isAuto?: boolean;
  enableChainOfThought?: boolean;
  onModeChange?: (mode: CollaborationMode) => void;
  onAutoChange?: (isAuto: boolean) => void;
  onChainOfThoughtChange?: (enable: boolean) => void;
  onRestart?: () => void;
}

/**
 * Controls for configuring agent collaboration settings
 */
export default function CollaborationControls({
  onConfigChange,
  availableAgents,
  className = '',
  mode = 'adaptive',
  isAuto = true,
  enableChainOfThought = true,
  onModeChange = (mode) => { if (onConfigChange) onConfigChange({ mode }); },
  onAutoChange = (isAuto) => { if (onConfigChange) onConfigChange({ isAuto }); },
  onChainOfThoughtChange = (enable) => { if (onConfigChange) onConfigChange({ enableChainOfThought: enable }); },
  onRestart = () => { if (onConfigChange) onConfigChange({ restart: true }); }
}: CollaborationControlsProps) {
  // Descriptions for different collaboration modes
  const modeDescriptions: Record<CollaborationMode, { description: string, icon: React.ReactNode }> = {
    sequential: {
      description: 'Agents work one after another in a chain, passing outputs between them.',
      icon: <ChevronsRight className="h-4 w-4" />
    },
    parallel: {
      description: 'Agents work simultaneously on the task, then results are combined.',
      icon: <Layers className="h-4 w-4" />
    },
    adaptive: {
      description: 'Collaboration strategy adapts based on the task complexity and requirements.',
      icon: <Sparkles className="h-4 w-4" />
    },
    expert_driven: {
      description: 'A lead agent coordinates work and delegates to specialized agents.',
      icon: <GitMerge className="h-4 w-4" />
    }
  };
  
  return (
    <div className={cn('space-y-4', className)}>
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h3 className="text-sm font-semibold mb-1">Collaboration Mode</h3>
          <Tabs 
            value={mode} 
            onValueChange={(value) => onModeChange(value as CollaborationMode)}
            className="w-full"
          >
            <TabsList className="grid grid-cols-2 sm:grid-cols-4 w-full">
              <Tooltip>
                <TooltipTrigger asChild>
                  <TabsTrigger value="sequential" className="flex items-center gap-1.5">
                    <ChevronsRight className="h-3.5 w-3.5" />
                    <span>Sequential</span>
                  </TabsTrigger>
                </TooltipTrigger>
                <TooltipContent side="bottom">
                  <p className="text-xs max-w-[250px]">{modeDescriptions.sequential.description}</p>
                </TooltipContent>
              </Tooltip>
              
              <Tooltip>
                <TooltipTrigger asChild>
                  <TabsTrigger value="parallel" className="flex items-center gap-1.5">
                    <Layers className="h-3.5 w-3.5" />
                    <span>Parallel</span>
                  </TabsTrigger>
                </TooltipTrigger>
                <TooltipContent side="bottom">
                  <p className="text-xs max-w-[250px]">{modeDescriptions.parallel.description}</p>
                </TooltipContent>
              </Tooltip>
              
              <Tooltip>
                <TooltipTrigger asChild>
                  <TabsTrigger value="adaptive" className="flex items-center gap-1.5">
                    <Sparkles className="h-3.5 w-3.5" />
                    <span>Adaptive</span>
                  </TabsTrigger>
                </TooltipTrigger>
                <TooltipContent side="bottom">
                  <p className="text-xs max-w-[250px]">{modeDescriptions.adaptive.description}</p>
                </TooltipContent>
              </Tooltip>
              
              <Tooltip>
                <TooltipTrigger asChild>
                  <TabsTrigger value="expert_driven" className="flex items-center gap-1.5">
                    <GitMerge className="h-3.5 w-3.5" />
                    <span>Expert</span>
                  </TabsTrigger>
                </TooltipTrigger>
                <TooltipContent side="bottom">
                  <p className="text-xs max-w-[250px]">{modeDescriptions.expert_driven.description}</p>
                </TooltipContent>
              </Tooltip>
            </TabsList>
          </Tabs>
        </div>
        
        <Button 
          variant="outline" 
          size="sm"
          className="h-8 text-xs flex items-center gap-1.5"
          onClick={onRestart}
        >
          <RefreshCw className="h-3.5 w-3.5" />
          Restart Collaboration
        </Button>
      </div>
      
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div className="flex items-center space-x-2">
          <Switch 
            id="auto-mode" 
            checked={isAuto}
            onCheckedChange={onAutoChange}
          />
          <Label htmlFor="auto-mode" className="flex items-center gap-1.5">
            <span>Auto Mode</span>
            <Tooltip>
              <TooltipTrigger asChild>
                <InfoIcon className="h-3.5 w-3.5 opacity-70" />
              </TooltipTrigger>
              <TooltipContent side="bottom">
                <p className="text-xs max-w-[250px]">
                  When enabled, agents will automatically process the task without requiring manual confirmation between steps.
                </p>
              </TooltipContent>
            </Tooltip>
          </Label>
        </div>
        
        <div className="flex items-center space-x-2">
          <Switch 
            id="chain-of-thought" 
            checked={enableChainOfThought}
            onCheckedChange={onChainOfThoughtChange}
          />
          <Label htmlFor="chain-of-thought" className="flex items-center gap-1.5">
            <span>Show Reasoning</span>
            <Tooltip>
              <TooltipTrigger asChild>
                <InfoIcon className="h-3.5 w-3.5 opacity-70" />
              </TooltipTrigger>
              <TooltipContent side="bottom">
                <p className="text-xs max-w-[250px]">
                  Shows the chain-of-thought reasoning process for each agent during collaboration.
                </p>
              </TooltipContent>
            </Tooltip>
          </Label>
        </div>
      </div>
    </div>
  );
}