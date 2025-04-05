import React, { useState } from 'react';
import { Agent } from '@shared/schema';
import Markdown from 'react-markdown';
import { Prism as SyntaxHighlighter } from 'react-syntax-highlighter';
import { vscDarkPlus } from 'react-syntax-highlighter/dist/esm/styles/prism';
import remarkGfm from 'remark-gfm';

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

  // Agent avatar/icon to display
  const getAgentIcon = (agent?: Agent): string => {
    if (!agent) return 'smart_toy';
    
    // Mapping of agent types to Material Icons
    switch (agent.type) {
      case 'research': return 'search';
      case 'code': return 'code';
      case 'writer': return 'edit_note';
      case 'orchestrator': return 'psychology';
      case 'planner': return 'task_alt';
      default: return 'smart_toy';
    }
  };
  
  // Handler for expanding/collapsing thinking view
  const toggleExpanded = () => {
    setExpanded(!expanded);
  };

  return (
    <div className={`${className}`}>
      <div className="bg-white dark:bg-neutral-800 p-4 rounded-xl shadow-sm border border-neutral-200 dark:border-neutral-700 mb-6">
        <div className="flex items-start mb-3">
          {/* Agent avatar */}
          <div className="w-10 h-10 rounded-full bg-primary-400 dark:bg-primary-600 flex items-center justify-center flex-shrink-0 mr-4 animate-pulse">
            <span className="material-icons text-white">
              {agent ? getAgentIcon(agent) : 'psychology'}
            </span>
          </div>
          
          {/* Agent info */}
          <div>
            <h3 className="font-medium text-primary-500">
              {agent ? agent.name : 'AI System'} 
              <span className="ml-2 text-neutral-400 dark:text-neutral-500 font-normal">thinking...</span>
            </h3>
            
            {agent && (
              <p className="text-xs text-neutral-500 dark:text-neutral-400">
                {agent.type.charAt(0).toUpperCase() + agent.type.slice(1)}
                {agent.model && ` · ${agent.model}`}
              </p>
            )}
          </div>
        </div>
        
        {/* Animated thinking dots */}
        <div className="flex items-center ml-14">
          <div className="flex space-x-2">
            <div className="w-2 h-2 rounded-full bg-primary-400 dark:bg-primary-600 animate-pulse"></div>
            <div className="w-2 h-2 rounded-full bg-primary-400 dark:bg-primary-600 animate-pulse" style={{ animationDelay: '300ms' }}></div>
            <div className="w-2 h-2 rounded-full bg-primary-400 dark:bg-primary-600 animate-pulse" style={{ animationDelay: '600ms' }}></div>
          </div>
          
          {/* If we have content and technical view is enabled, show the toggle */}
          {content && showTechnicalView && (
            <button
              onClick={toggleExpanded}
              className="ml-4 text-xs text-neutral-500 hover:text-neutral-700 dark:text-neutral-400 dark:hover:text-neutral-300 flex items-center"
            >
              <span className="material-icons-outlined text-sm mr-1">
                {expanded ? 'expand_less' : 'expand_more'}
              </span>
              {expanded ? 'Hide' : 'Show'} real-time thinking
            </button>
          )}
        </div>
        
        {/* Live thinking content - only visible when expanded */}
        {expanded && content && (
          <div className="mt-3 ml-14 p-3 bg-neutral-50 dark:bg-neutral-900 rounded border border-neutral-200 dark:border-neutral-700 text-sm">
            <h4 className="text-xs font-medium mb-2 text-neutral-500 dark:text-neutral-400 uppercase">
              Live agent thinking
            </h4>
            <Markdown
              remarkPlugins={[remarkGfm]}
              components={{
                code({node, inline, className, children, ...props}: {
                  node?: any;
                  inline?: boolean;
                  className?: string;
                  children: React.ReactNode;
                  [key: string]: any;
                }) {
                  const match = /language-(\w+)/.exec(className || '');
                  return !inline && match ? (
                    <SyntaxHighlighter
                      language={match[1]}
                      style={vscDarkPlus}
                      PreTag="div"
                      customStyle={{fontSize: '0.85em'}}
                    >
                      {String(children).replace(/\n$/, '')}
                    </SyntaxHighlighter>
                  ) : (
                    <code className={className} {...props}>
                      {children}
                    </code>
                  );
                }
              }}
            >
              {content}
            </Markdown>
          </div>
        )}
      </div>
    </div>
  );
}