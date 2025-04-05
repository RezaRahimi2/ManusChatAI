import React, { useState } from 'react';
import { Agent } from '@shared/schema';
import { 
  Tabs, 
  TabsContent, 
  TabsList, 
  TabsTrigger 
} from "@/components/ui/tabs";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Slider } from "@/components/ui/slider";
import { Switch } from "@/components/ui/switch";
import { Label } from "@/components/ui/label";
import { AgentTeamSelector } from "@/components/agents";

export enum CollaborationMode {
  SEQUENTIAL = 'sequential',
  PARALLEL = 'parallel',
  EXPERT = 'expert',
  DEBATE = 'debate'
}

export interface CollaborationConfig {
  mode: CollaborationMode;
  selectedAgents: number[];
  deepAnalysis: boolean;
  timeLimit: number; // in seconds
}

interface CollaborationControlsProps {
  onConfigChange: (config: CollaborationConfig) => void;
  availableAgents: Agent[];
  className?: string;
}

/**
 * Controls for configuring agent collaboration behavior
 */
export default function CollaborationControls({ 
  onConfigChange, 
  availableAgents,
  className = ''
}: CollaborationControlsProps) {
  // Default configuration
  const [mode, setMode] = useState<CollaborationMode>(CollaborationMode.SEQUENTIAL);
  const [selectedAgents, setSelectedAgents] = useState<number[]>([]);
  const [deepAnalysis, setDeepAnalysis] = useState(false);
  const [timeLimit, setTimeLimit] = useState(60); // Default 60 seconds
  
  // Update the parent component when configuration changes
  const updateConfig = () => {
    onConfigChange({
      mode,
      selectedAgents,
      deepAnalysis,
      timeLimit
    });
  };
  
  // Handle mode change
  const handleModeChange = (value: string) => {
    setMode(value as CollaborationMode);
    setTimeout(updateConfig, 0);
  };
  
  // Handle agents selection
  const handleAgentSelection = (agents: number[]) => {
    setSelectedAgents(agents);
    setTimeout(updateConfig, 0);
  };
  
  // Handle deep analysis toggle
  const handleDeepAnalysisChange = (checked: boolean) => {
    setDeepAnalysis(checked);
    setTimeout(updateConfig, 0);
  };
  
  // Handle time limit change
  const handleTimeLimitChange = (value: number[]) => {
    setTimeLimit(value[0]);
    setTimeout(updateConfig, 0);
  };

  return (
    <div className={`bg-white dark:bg-neutral-900 rounded-lg p-4 ${className}`}>
      <h3 className="text-lg font-medium mb-4">Collaboration Settings</h3>
      
      <Tabs defaultValue={mode} onValueChange={handleModeChange}>
        <TabsList className="grid grid-cols-4 mb-4">
          <TabsTrigger value="sequential" className="text-xs">Sequential</TabsTrigger>
          <TabsTrigger value="parallel" className="text-xs">Parallel</TabsTrigger>
          <TabsTrigger value="expert" className="text-xs">Expert Panel</TabsTrigger>
          <TabsTrigger value="debate" className="text-xs">Debate</TabsTrigger>
        </TabsList>
        
        <TabsContent value="sequential">
          <p className="text-sm text-neutral-600 dark:text-neutral-400 mb-4">
            Agents work one after another in sequence, with each agent building on the previous agent's output.
          </p>
        </TabsContent>
        
        <TabsContent value="parallel">
          <p className="text-sm text-neutral-600 dark:text-neutral-400 mb-4">
            Agents work simultaneously on different aspects of the problem and combine their results.
          </p>
        </TabsContent>
        
        <TabsContent value="expert">
          <p className="text-sm text-neutral-600 dark:text-neutral-400 mb-4">
            Specialists weigh in with their domain expertise and then a coordinator synthesizes a final response.
          </p>
        </TabsContent>
        
        <TabsContent value="debate">
          <p className="text-sm text-neutral-600 dark:text-neutral-400 mb-4">
            Agents debate different perspectives on a topic, critically examining assumptions and evidence.
          </p>
        </TabsContent>
      </Tabs>
      
      <div className="mb-4">
        <div className="flex items-center justify-between mb-2">
          <Label className="text-sm font-medium">Select Agents</Label>
          
          <Select 
            onValueChange={(value) => {
              // Handle selection of preset teams
              if (value === 'research') {
                const researchAgents = availableAgents
                  .filter(agent => ['Research Agent', 'Planner Agent'].includes(agent.name))
                  .map(agent => agent.id);
                setSelectedAgents(researchAgents);
                setTimeout(updateConfig, 0);
              } else if (value === 'coding') {
                const codingAgents = availableAgents
                  .filter(agent => ['Code Agent', 'Planner Agent'].includes(agent.name))
                  .map(agent => agent.id);
                setSelectedAgents(codingAgents);
                setTimeout(updateConfig, 0);
              } else if (value === 'full') {
                const allAgents = availableAgents.map(agent => agent.id);
                setSelectedAgents(allAgents);
                setTimeout(updateConfig, 0);
              }
            }} 
          >
            <SelectTrigger className="w-[180px] h-8 text-xs">
              <SelectValue placeholder="Team Presets" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="research" className="text-xs">Research Team</SelectItem>
              <SelectItem value="coding" className="text-xs">Coding Team</SelectItem>
              <SelectItem value="full" className="text-xs">All Agents</SelectItem>
            </SelectContent>
          </Select>
        </div>
        
        <AgentTeamSelector 
          selectedAgents={selectedAgents}
          onSelectAgents={handleAgentSelection}
          className="mt-2"
        />
      </div>
      
      <div className="space-y-4">
        <div className="flex items-center justify-between">
          <div className="space-y-0.5">
            <Label htmlFor="deep-analysis">Deep Analysis</Label>
            <div className="text-xs text-neutral-500 dark:text-neutral-400">
              Produces more thorough but slower results
            </div>
          </div>
          <Switch 
            id="deep-analysis" 
            checked={deepAnalysis}
            onCheckedChange={handleDeepAnalysisChange}
          />
        </div>
        
        <div className="space-y-2">
          <div className="flex items-center justify-between">
            <Label htmlFor="time-limit">Time Limit: {timeLimit} seconds</Label>
          </div>
          <Slider
            id="time-limit"
            defaultValue={[timeLimit]}
            max={180}
            min={30}
            step={15}
            onValueChange={handleTimeLimitChange}
          />
          <div className="flex justify-between text-xs text-neutral-500">
            <span>30s</span>
            <span>180s</span>
          </div>
        </div>
      </div>
    </div>
  );
}