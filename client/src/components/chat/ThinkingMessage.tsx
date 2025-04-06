import React, { useState } from 'react';
import { Agent } from '@shared/schema';
import { cn } from '@/lib/utils';
import { Loader2, ChevronDown, ChevronUp, BrainCircuit } from 'lucide-react';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Markdown } from '@/components/ui/markdown';
import AgentActivityIndicator from '@/components/agents/AgentActivityIndicator';

interface ThinkingMessageProps {
  agent?: Agent;
  content?: string;
  showTechnicalView?: boolean;
  className?: string;
}

/**
 * Animated "thinking" indicator shown while agents are processing
 */
export default function ThinkingMessage({
  agent,
  content,
  showTechnicalView = false,
  className = ''
}: ThinkingMessageProps) {
  const [expanded, setExpanded] = useState(false);
  
  return (
    <Card 
      className={cn(
        "w-full p-3 flex flex-col gap-2 bg-muted/30 border-dashed",
        className
      )}
    >
      <div className="flex items-center justify-between gap-2">
        <div className="flex items-center gap-2">
          {agent ? (
            <AgentActivityIndicator agent={agent} isActive={true} />
          ) : (
            <div className="flex items-center gap-1.5 text-muted-foreground">
              <Loader2 className="h-3.5 w-3.5 animate-spin" />
              <span className="text-sm font-medium">Thinking</span>
            </div>
          )}
        </div>
        
        {content && (
          <Button 
            variant="ghost" 
            size="sm" 
            className="h-7 px-2 text-xs gap-1"
            onClick={() => setExpanded(!expanded)}
          >
            <BrainCircuit className="h-3.5 w-3.5" />
            <span>{expanded ? 'Hide' : 'Show'} Reasoning</span>
            {expanded ? (
              <ChevronUp className="h-3.5 w-3.5" />
            ) : (
              <ChevronDown className="h-3.5 w-3.5" />
            )}
          </Button>
        )}
      </div>
      
      {content && expanded && (
        <div className="flex flex-col mt-1">
          <div className="prose prose-sm dark:prose-invert max-w-none text-muted-foreground">
            <Markdown>{content}</Markdown>
          </div>
        </div>
      )}
    </Card>
  );
}