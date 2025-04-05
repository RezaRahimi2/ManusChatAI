import { useAgentContext } from "@/context/AgentContext";
import AgentItem from "./AgentItem";

interface AgentListProps {
  onCreateAgent: () => void;
}

export default function AgentList({ onCreateAgent }: AgentListProps) {
  const { agents, selectedAgent, selectAgent, loading } = useAgentContext();

  return (
    <div className="flex-none">
      <div className="p-4 border-b border-neutral-200 dark:border-neutral-700">
        <h2 className="font-medium text-sm uppercase text-neutral-500 dark:text-neutral-400">Agents</h2>
      </div>
      
      <div className="overflow-y-auto scrollbar-thin p-2 max-h-[50vh]">
        {loading ? (
          <div className="flex items-center justify-center p-4">
            <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-primary-500"></div>
          </div>
        ) : (
          <div className="mb-6">
            {agents.map(agent => (
              <AgentItem 
                key={agent.id} 
                agent={agent} 
                isSelected={selectedAgent?.id === agent.id}
                onClick={() => selectAgent(agent)}
              />
            ))}
            
            <button 
              onClick={onCreateAgent}
              className="w-full mt-3 flex items-center justify-center p-2 rounded-lg border-2 border-dashed border-neutral-300 dark:border-neutral-600 text-neutral-500 dark:text-neutral-400 hover:bg-neutral-100 dark:hover:bg-neutral-700"
            >
              <span className="material-icons mr-2 text-sm">add</span>
              <span className="text-sm font-medium">Add New Agent</span>
            </button>
          </div>
        )}
      </div>
    </div>
  );
}
