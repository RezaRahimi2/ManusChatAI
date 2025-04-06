import { type Agent } from "@shared/schema";
import { useState } from "react";
import { 
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger
} from "@/components/ui/dropdown-menu";

interface AgentItemProps {
  agent: Agent;
  isSelected: boolean;
  onClick: () => void;
}

export default function AgentItem({ agent, isSelected, onClick }: AgentItemProps) {
  const [showOptions, setShowOptions] = useState(false);

  // Agent icon color based on type
  const getAgentColor = (type: string) => {
    switch (type) {
      case "orchestrator": return "bg-primary-500";
      case "enhanced_orchestrator": return "bg-primary-600";
      case "research": return "bg-secondary-400";
      case "code": return "bg-accent-500";
      case "writer": return "bg-success-500";
      case "planner": return "bg-amber-500";
      case "thinker": return "bg-indigo-500";
      case "agno": return "bg-emerald-500";
      default: return "bg-neutral-500";
    }
  };

  // Agent icon based on type
  const getAgentIcon = (type: string) => {
    switch (type) {
      case "orchestrator": return "smart_toy";
      case "enhanced_orchestrator": return "precision_manufacturing";
      case "research": return "search";
      case "code": return "code";
      case "writer": return "edit";
      case "planner": return "view_timeline";
      case "thinker": return "psychology";
      case "agno": return "memory";
      default: return "engineering";
    }
  };

  return (
    <div 
      className={`agent-icon flex items-center p-2 mb-1 rounded-lg cursor-pointer hover:bg-neutral-100 dark:hover:bg-neutral-700 transition-colors ${isSelected ? 'bg-primary-50 dark:bg-primary-900/30' : ''}`}
      onClick={onClick}
    >
      <div className={`w-8 h-8 rounded-full ${getAgentColor(agent.type)} flex items-center justify-center mr-3`}>
        <span className="material-icons text-white text-sm">{getAgentIcon(agent.type)}</span>
      </div>
      <div className="flex-1">
        <div className="font-medium text-sm">{agent.name}</div>
        <div className="text-xs text-neutral-500 dark:text-neutral-400">{agent.model}</div>
      </div>
      
      <DropdownMenu>
        <DropdownMenuTrigger asChild>
          <button
            className="p-1 rounded-full hover:bg-neutral-200 dark:hover:bg-neutral-600"
            onClick={(e) => {
              e.stopPropagation();
              setShowOptions(!showOptions);
            }}
          >
            <span className="material-icons text-neutral-400">more_vert</span>
          </button>
        </DropdownMenuTrigger>
        <DropdownMenuContent>
          <DropdownMenuLabel>Agent Options</DropdownMenuLabel>
          <DropdownMenuSeparator />
          <DropdownMenuItem>Edit</DropdownMenuItem>
          <DropdownMenuItem>Duplicate</DropdownMenuItem>
          <DropdownMenuItem className="text-red-500">Delete</DropdownMenuItem>
        </DropdownMenuContent>
      </DropdownMenu>
    </div>
  );
}
