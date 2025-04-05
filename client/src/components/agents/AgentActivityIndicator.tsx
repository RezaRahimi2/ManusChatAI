import React from 'react';
import { Agent } from '@shared/schema';

// Status states for agents
export enum AgentStatus {
  WAITING = 'waiting',
  PROCESSING = 'processing',
  COMPLETED = 'completed',
  ERROR = 'error'
}

interface AgentActivityIndicatorProps {
  agent: Agent;
  status: AgentStatus;
  size?: 'sm' | 'md' | 'lg';
  showLabel?: boolean;
  className?: string;
}

/**
 * Visual indicator showing an agent's current status
 */
export default function AgentActivityIndicator({ 
  agent, 
  status, 
  size = 'md',
  showLabel = false,
  className = ''
}: AgentActivityIndicatorProps) {
  // Size-based styling
  const sizeClasses = {
    sm: 'w-3 h-3',
    md: 'w-4 h-4',
    lg: 'w-5 h-5'
  };
  
  // Status-based styling
  const statusClasses = {
    [AgentStatus.WAITING]: {
      dot: 'bg-neutral-300 dark:bg-neutral-600',
      animation: '',
      label: 'text-neutral-500 dark:text-neutral-400',
      text: 'Waiting'
    },
    [AgentStatus.PROCESSING]: {
      dot: 'bg-primary-500 dark:bg-primary-400',
      animation: 'animate-pulse',
      label: 'text-primary-700 dark:text-primary-300',
      text: 'Processing'
    },
    [AgentStatus.COMPLETED]: {
      dot: 'bg-green-500 dark:bg-green-400',
      animation: '',
      label: 'text-green-700 dark:text-green-300',
      text: 'Completed'
    },
    [AgentStatus.ERROR]: {
      dot: 'bg-red-500 dark:bg-red-400',
      animation: '',
      label: 'text-red-700 dark:text-red-300',
      text: 'Error'
    }
  };

  return (
    <div className={`flex items-center ${className}`}>
      <div 
        className={`rounded-full ${sizeClasses[size]} ${statusClasses[status].dot} ${statusClasses[status].animation}`}
        title={statusClasses[status].text}
      />
      
      {showLabel && (
        <span className={`ml-1.5 text-xs ${statusClasses[status].label}`}>
          {statusClasses[status].text}
        </span>
      )}
    </div>
  );
}