import React from 'react';
import { Agent } from '@shared/schema';
import AgentActivityIndicator, { AgentStatus } from '@/components/agents/AgentActivityIndicator';

interface ActiveAgent {
  agent: Agent;
  status: AgentStatus;
}

interface AgentTimelineProps {
  activeAgents: ActiveAgent[];
  onShowDetails?: () => void;
  className?: string;
}

/**
 * Timeline view of currently active agents and their status
 */
export default function AgentTimeline({ 
  activeAgents, 
  onShowDetails,
  className = '' 
}: AgentTimelineProps) {
  // Count agents by status
  const statusCounts = activeAgents.reduce((counts, { status }) => {
    counts[status] = (counts[status] || 0) + 1;
    return counts;
  }, {} as Record<AgentStatus, number>);
  
  const processingCount = statusCounts[AgentStatus.PROCESSING] || 0;
  const waitingCount = statusCounts[AgentStatus.WAITING] || 0;
  const completedCount = statusCounts[AgentStatus.COMPLETED] || 0;
  
  return (
    <div className={`p-2 ${className}`}>
      <div className="flex items-center justify-between">
        <div className="flex items-center space-x-1">
          {/* Summary of active agents */}
          <span className="text-xs font-medium text-neutral-500 dark:text-neutral-400 mr-2">
            Active Agents:
          </span>
          
          {/* Agents currently working */}
          {processingCount > 0 && (
            <span className="flex items-center text-xs text-primary-600 dark:text-primary-400 bg-primary-50 dark:bg-primary-900/30 rounded-full px-2 py-0.5">
              <span className="animate-pulse w-2 h-2 rounded-full bg-primary-500 mr-1.5"></span>
              {processingCount} {processingCount === 1 ? 'agent' : 'agents'} processing
            </span>
          )}
          
          {/* Waiting agents */}
          {waitingCount > 0 && (
            <span className="flex items-center text-xs text-neutral-600 dark:text-neutral-400 bg-neutral-50 dark:bg-neutral-800 rounded-full px-2 py-0.5">
              <span className="w-2 h-2 rounded-full bg-neutral-400 mr-1.5"></span>
              {waitingCount} waiting
            </span>
          )}
          
          {/* Completed agents */}
          {completedCount > 0 && (
            <span className="flex items-center text-xs text-green-600 dark:text-green-400 bg-green-50 dark:bg-green-900/30 rounded-full px-2 py-0.5">
              <span className="w-2 h-2 rounded-full bg-green-500 mr-1.5"></span>
              {completedCount} completed
            </span>
          )}
        </div>
        
        {/* Controls button */}
        <button
          onClick={onShowDetails}
          className="text-xs bg-neutral-100 hover:bg-neutral-200 dark:bg-neutral-800 dark:hover:bg-neutral-700 text-neutral-700 dark:text-neutral-300 rounded px-2 py-1 transition-colors flex items-center"
        >
          <span className="material-icons-outlined text-sm mr-1">tune</span>
          <span>Controls</span>
        </button>
      </div>
      
      {/* Agent pills */}
      <div className="flex flex-wrap mt-2 gap-1.5">
        {activeAgents.map(({ agent, status }) => (
          <div
            key={agent.id}
            className={`
              flex items-center rounded-full px-2 py-1 text-xs font-medium
              ${status === AgentStatus.PROCESSING ? 
                'bg-primary-100 dark:bg-primary-900/40 text-primary-800 dark:text-primary-300' : 
                status === AgentStatus.COMPLETED ?
                'bg-green-100 dark:bg-green-900/40 text-green-800 dark:text-green-300' :
                'bg-neutral-100 dark:bg-neutral-800 text-neutral-800 dark:text-neutral-300'
              }
            `}
          >
            <AgentActivityIndicator agent={agent} status={status} size="sm" />
            <span className="ml-1.5">{agent.name}</span>
          </div>
        ))}
      </div>
    </div>
  );
}