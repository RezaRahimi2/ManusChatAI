import React from 'react';
import { cn } from '@/lib/utils';
import { Loader2, CheckCircle, XCircle, Clock } from 'lucide-react';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip';

export enum AgentStatus {
  WAITING = 'waiting',
  PROCESSING = 'processing',
  COMPLETED = 'completed',
  ERROR = 'error'
}

interface AgentActivityIndicatorProps {
  status: AgentStatus | string;
  className?: string;
  showLabel?: boolean;
  size?: 'sm' | 'md' | 'lg';
}

/**
 * Visual indicator for agent activity states
 */
export default function AgentActivityIndicator({
  status,
  className,
  showLabel = false,
  size = 'md'
}: AgentActivityIndicatorProps) {
  const sizeClasses = {
    sm: 'h-3 w-3',
    md: 'h-4 w-4',
    lg: 'h-5 w-5',
  };
  
  const labelSizeClasses = {
    sm: 'text-xs',
    md: 'text-sm',
    lg: 'text-base',
  };
  
  // Determine status label & icon
  const statusConfig = {
    [AgentStatus.WAITING]: {
      label: 'Waiting',
      icon: <Clock className={cn(sizeClasses[size], 'text-neutral-400')} />,
      color: 'bg-neutral-100 dark:bg-neutral-800',
      textColor: 'text-neutral-700 dark:text-neutral-300'
    },
    [AgentStatus.PROCESSING]: {
      label: 'Processing',
      icon: <Loader2 className={cn(sizeClasses[size], 'text-blue-500 animate-spin')} />,
      color: 'bg-blue-100 dark:bg-blue-900/30',
      textColor: 'text-blue-700 dark:text-blue-300'
    },
    [AgentStatus.COMPLETED]: {
      label: 'Completed',
      icon: <CheckCircle className={cn(sizeClasses[size], 'text-green-500')} />,
      color: 'bg-green-100 dark:bg-green-900/30',
      textColor: 'text-green-700 dark:text-green-300'
    },
    [AgentStatus.ERROR]: {
      label: 'Error',
      icon: <XCircle className={cn(sizeClasses[size], 'text-red-500')} />,
      color: 'bg-red-100 dark:bg-red-900/30',
      textColor: 'text-red-700 dark:text-red-300'
    }
  };
  
  const getStatusConfig = (status: AgentStatus | string) => {
    if (typeof status === 'string') {
      // Check for string values
      if (status === 'waiting') return statusConfig[AgentStatus.WAITING];
      if (status === 'processing') return statusConfig[AgentStatus.PROCESSING];
      if (status === 'completed') return statusConfig[AgentStatus.COMPLETED];
      if (status === 'error') return statusConfig[AgentStatus.ERROR];
      return statusConfig[AgentStatus.WAITING]; // Default
    }
    return statusConfig[status] || statusConfig[AgentStatus.WAITING];
  };
  
  const config = getStatusConfig(status);
  
  if (showLabel) {
    return (
      <div className={cn('flex items-center gap-1.5', className)}>
        {config.icon}
        <span className={cn(labelSizeClasses[size], config.textColor)}>
          {config.label}
        </span>
      </div>
    );
  }
  
  return (
    <TooltipProvider>
      <Tooltip>
        <TooltipTrigger asChild>
          <div className={cn(className, 'cursor-help')}>
            {config.icon}
          </div>
        </TooltipTrigger>
        <TooltipContent side="right">
          <p className="text-xs">{config.label}</p>
        </TooltipContent>
      </Tooltip>
    </TooltipProvider>
  );
}