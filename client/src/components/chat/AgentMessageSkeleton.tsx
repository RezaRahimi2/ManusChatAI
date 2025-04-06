import React from 'react';
import { Skeleton } from '@/components/ui/skeleton';
import { Agent } from '@shared/schema';

interface AgentMessageSkeletonProps {
  agent?: Agent;
  className?: string;
}

export function AgentMessageSkeleton({ agent, className }: AgentMessageSkeletonProps) {
  return (
    <div className={`bg-neutral-100 dark:bg-neutral-800 rounded-xl p-4 my-2 ${className}`}>
      <div className="flex items-start">
        {/* Agent avatar with skeleton if agent not provided */}
        <div className="flex-shrink-0 mr-3">
          {agent ? (
            <div className="w-10 h-10 rounded-full bg-primary-500 flex items-center justify-center">
              <span className="text-white font-semibold">
                {agent.name.substring(0, 1).toUpperCase()}
              </span>
            </div>
          ) : (
            <Skeleton className="w-10 h-10 rounded-full" />
          )}
        </div>
        
        <div className="flex-1 overflow-hidden">
          {/* Agent name skeleton */}
          {agent ? (
            <h4 className="font-medium text-primary-500">{agent.name}</h4>
          ) : (
            <Skeleton className="h-5 w-36 mb-2" />
          )}
          
          {/* Content skeletons with varying widths */}
          <div className="space-y-2 mt-2">
            <Skeleton className="h-4 w-full" />
            <Skeleton className="h-4 w-11/12" />
            <Skeleton className="h-4 w-4/5" />
            <Skeleton className="h-4 w-full" />
            <Skeleton className="h-4 w-9/12" />
          </div>
          
          {/* Code block skeleton (occasionally) */}
          <div className="mt-4">
            <Skeleton className="h-20 w-full rounded" />
          </div>
          
          {/* Bullet points skeleton */}
          <div className="mt-4 space-y-2">
            <div className="flex items-start">
              <Skeleton className="h-3 w-3 mt-1 mr-2 rounded-full" />
              <Skeleton className="h-4 w-3/4" />
            </div>
            <div className="flex items-start">
              <Skeleton className="h-3 w-3 mt-1 mr-2 rounded-full" />
              <Skeleton className="h-4 w-4/5" />
            </div>
            <div className="flex items-start">
              <Skeleton className="h-3 w-3 mt-1 mr-2 rounded-full" />
              <Skeleton className="h-4 w-2/3" />
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}