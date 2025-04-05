import React from 'react';
import { useAgentContext } from '@/context/AgentContext';

interface AgentTeamSelectorProps {
  selectedAgents: number[];
  onSelectAgents: (agentIds: number[]) => void;
  className?: string;
}

/**
 * UI for selecting a team of agents to collaborate
 */
export default function AgentTeamSelector({ 
  selectedAgents, 
  onSelectAgents, 
  className = '' 
}: AgentTeamSelectorProps) {
  const { getAllAgents } = useAgentContext();
  const agents = getAllAgents();
  
  // Toggle agent selection
  const toggleAgent = (agentId: number) => {
    const newSelection = selectedAgents.includes(agentId)
      ? selectedAgents.filter(id => id !== agentId)
      : [...selectedAgents, agentId];
    
    onSelectAgents(newSelection);
  };

  // Calculate compatibility rating between agents
  const getCompatibilityRating = (agent1Id: number, agent2Id: number): number => {
    const agent1 = agents.find(a => a.id === agent1Id);
    const agent2 = agents.find(a => a.id === agent2Id);
    
    if (!agent1 || !agent2) return 0;
    
    // High compatibility when different agent types are paired
    // This is a simplified example - in a real app, this would be more sophisticated
    if (agent1.type !== agent2.type) {
      // Research + Code is highest compatibility
      if (
        (agent1.type === 'research' && agent2.type === 'code') ||
        (agent1.type === 'code' && agent2.type === 'research')
      ) {
        return 5;
      }
      
      // Orchestrator + any other type has good compatibility
      if (agent1.type === 'orchestrator' || agent2.type === 'orchestrator') {
        return 4;
      }
      
      return 3; // Different types have decent compatibility
    }
    
    // Same types have lower compatibility
    return 2;
  };
  
  // Calculate average compatibility score for selected agents
  const getTeamCompatibility = (): number => {
    if (selectedAgents.length < 2) return 0;
    
    let totalScore = 0;
    let pairCount = 0;
    
    // Compare each agent with every other agent
    for (let i = 0; i < selectedAgents.length; i++) {
      for (let j = i + 1; j < selectedAgents.length; j++) {
        totalScore += getCompatibilityRating(selectedAgents[i], selectedAgents[j]);
        pairCount++;
      }
    }
    
    return pairCount > 0 ? Math.round((totalScore / pairCount) * 10) / 10 : 0;
  };
  
  // Team compatibility metrics
  const teamCompatibility = getTeamCompatibility();

  return (
    <div className={`${className}`}>
      {/* Agent selection grid */}
      <div className="grid grid-cols-2 gap-2 md:grid-cols-3 lg:grid-cols-4">
        {agents.map(agent => (
          <div
            key={agent.id}
            onClick={() => toggleAgent(agent.id)}
            className={`
              p-3 rounded-lg border cursor-pointer transition-all
              ${selectedAgents.includes(agent.id)
                ? 'border-primary-500 bg-primary-50 dark:bg-primary-900/30 shadow-sm'
                : 'border-neutral-200 dark:border-neutral-700 bg-white dark:bg-neutral-800 hover:border-primary-300 dark:hover:border-primary-600'
              }
            `}
          >
            <div className="flex items-start">
              <div 
                className={`
                  w-8 h-8 rounded-full flex items-center justify-center flex-shrink-0 mr-2
                  ${selectedAgents.includes(agent.id)
                    ? 'bg-primary-500 text-white'
                    : 'bg-neutral-100 dark:bg-neutral-700 text-neutral-500 dark:text-neutral-400'
                  }
                `}
              >
                <span className="material-icons text-lg">
                  {agent.type === 'research' && 'search'}
                  {agent.type === 'code' && 'code'}
                  {agent.type === 'writer' && 'edit_note'}
                  {agent.type === 'orchestrator' && 'psychology'}
                  {agent.type === 'planner' && 'task_alt'}
                  {!['research', 'code', 'writer', 'orchestrator', 'planner'].includes(agent.type) && 'smart_toy'}
                </span>
              </div>
              <div>
                <h4 className="text-sm font-medium truncate">{agent.name}</h4>
                <p className="text-xs text-neutral-500 dark:text-neutral-400 capitalize">{agent.type}</p>
              </div>
            </div>
          </div>
        ))}
      </div>
      
      {/* Team compatibility display */}
      {selectedAgents.length >= 2 && (
        <div className="mt-4 p-3 bg-neutral-50 dark:bg-neutral-800 rounded-lg border border-neutral-200 dark:border-neutral-700">
          <div className="flex justify-between items-center">
            <span className="text-sm font-medium">Team Compatibility</span>
            <div className="flex items-center">
              <div className="flex">
                {[1, 2, 3, 4, 5].map(star => (
                  <span 
                    key={star}
                    className={`material-icons text-sm ${
                      star <= Math.round(teamCompatibility)
                        ? 'text-amber-500'
                        : 'text-neutral-300 dark:text-neutral-600'
                    }`}
                  >
                    {star <= Math.round(teamCompatibility) ? 'star' : 'star_outline'}
                  </span>
                ))}
              </div>
              <span className="ml-1 text-sm font-medium">{teamCompatibility}</span>
            </div>
          </div>
          
          {/* Compatibility hints */}
          <p className="text-xs text-neutral-500 dark:text-neutral-400 mt-1">
            {teamCompatibility >= 4 
              ? 'Excellent team composition with complementary skills.'
              : teamCompatibility >= 3
              ? 'Good team balance. Consider adding specialized agents for complex tasks.'
              : 'This team may have overlapping capabilities. Consider adding diverse agent types.'}
          </p>
        </div>
      )}
    </div>
  );
}