import React from 'react';
import { Skeleton } from '@/components/ui/skeleton';
import { Agent } from '@shared/schema';
import { Braces, LightbulbIcon, LoaderCircle } from 'lucide-react';

interface ThinkingSkeletonMessageProps {
  agent?: Agent;
  className?: string;
  showTechnicalView?: boolean;
}

export function ThinkingSkeletonMessage({ 
  agent, 
  className,
  showTechnicalView = false 
}: ThinkingSkeletonMessageProps) {
  return (
    <div 
      className={`bg-neutral-100 dark:bg-neutral-800 overflow-hidden
                  border border-neutral-200 dark:border-neutral-700
                  rounded-xl p-4 my-2 transition-all duration-300 ${className}`}
    >
      <div className="flex items-start">
        {/* Agent avatar or animated loader */}
        <div className="flex-shrink-0 mr-3">
          {agent ? (
            <div className="w-10 h-10 rounded-full bg-primary-500 flex items-center justify-center relative">
              <span className="text-white font-semibold">
                {agent.name.substring(0, 1).toUpperCase()}
              </span>
              <div className="absolute -right-1 -bottom-1 bg-blue-500 rounded-full p-1">
                <LoaderCircle className="w-3 h-3 text-white animate-spin" />
              </div>
            </div>
          ) : (
            <div className="w-10 h-10 rounded-full bg-neutral-300 dark:bg-neutral-600 animate-pulse flex items-center justify-center">
              <LightbulbIcon className="w-5 h-5 text-neutral-500 dark:text-neutral-400" />
            </div>
          )}
        </div>
        
        <div className="flex-1 overflow-hidden">
          {/* Agent name and thinking indicator */}
          <div className="flex items-center">
            {agent ? (
              <h4 className="font-medium text-primary-500">{agent.name}</h4>
            ) : (
              <Skeleton className="h-5 w-32" />
            )}
            <div className="ml-2 px-2 py-0.5 rounded-full bg-blue-100 dark:bg-blue-900 text-blue-700 dark:text-blue-300 text-xs flex items-center">
              <LoaderCircle className="w-3 h-3 mr-1 animate-spin" />
              Thinking...
            </div>
          </div>
          
          {/* Thinking content with skeleton */}
          <div className="mt-3 space-y-2">
            {showTechnicalView ? (
              <div className="bg-neutral-200 dark:bg-neutral-900 rounded-md p-3 font-mono text-sm overflow-hidden">
                <div className="flex items-center text-neutral-500 dark:text-neutral-400 mb-2">
                  <Braces className="w-4 h-4 mr-2" />
                  <span>Processing logic</span>
                </div>
                <div className="space-y-1.5">
                  <Skeleton className="h-3.5 w-full" />
                  <Skeleton className="h-3.5 w-11/12" />
                  <Skeleton className="h-3.5 w-full" />
                  <Skeleton className="h-3.5 w-10/12" />
                  <Skeleton className="h-3.5 w-9/12" />
                </div>
              </div>
            ) : (
              <>
                <div className="flex items-center mb-1">
                  <div className="w-2 h-2 rounded-full bg-blue-500 mr-2" />
                  <Skeleton className="h-4 w-4/5" />
                </div>
                <div className="flex items-center mb-1">
                  <div className="w-2 h-2 rounded-full bg-blue-500 mr-2" />
                  <Skeleton className="h-4 w-3/4" />
                </div>
                <div className="flex items-center">
                  <div className="w-2 h-2 rounded-full bg-blue-500 mr-2" />
                  <Skeleton className="h-4 w-5/6" />
                </div>
              </>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}