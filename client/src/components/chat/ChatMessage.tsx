import React, { useState } from 'react';
import { Message, Agent } from '@shared/schema';
import Markdown from 'react-markdown';
import { Prism as SyntaxHighlighter } from 'react-syntax-highlighter';
import { vscDarkPlus } from 'react-syntax-highlighter/dist/esm/styles/prism';
import remarkGfm from 'remark-gfm';

interface ChatMessageProps {
  message: Message;
  agent?: Agent;
  isGrouped?: boolean;
  showTechnicalView?: boolean;
  className?: string;
}

/**
 * Displays a single chat message with support for markdown and code highlighting
 */
export default function ChatMessage({
  message,
  agent,
  isGrouped = false,
  showTechnicalView = false,
  className = ''
}: ChatMessageProps) {
  const [expanded, setExpanded] = useState(false);
  
  // Determine if this is a user or agent message
  const isUser = message.role === 'user';
  
  // Extract any technical thinking content from metadata for display in tech view
  const metadata = message.metadata as Record<string, any> || {};
  const hasTechnicalContent = metadata.thinking || metadata.reasoning;
  const technicalContent = metadata.thinking || metadata.reasoning || '';
  
  // Format message timestamp
  const timestamp = new Date(message.createdAt).toLocaleTimeString([], {
    hour: '2-digit',
    minute: '2-digit'
  });
  
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
  
  // Handler for expanding/collapsing technical view
  const toggleExpanded = () => {
    setExpanded(!expanded);
  };
  
  return (
    <div className={`${className} ${isUser ? 'pl-12' : ''}`}>
      {/* Main message container */}
      <div className={`
        bg-white dark:bg-neutral-800 
        p-4 rounded-xl shadow-sm 
        border border-neutral-200 dark:border-neutral-700
        ${isUser ? 'bg-blue-50 dark:bg-blue-900/20 border-blue-100 dark:border-blue-800/50' : ''}
        ${isGrouped ? 'rounded-t-md mt-1' : ''}
      `}>
        {/* Message header - Only show for first message in group */}
        {!isGrouped && (
          <div className="flex items-start mb-4">
            {/* Avatar/icon */}
            <div className={`
              w-10 h-10 rounded-full 
              flex items-center justify-center 
              flex-shrink-0 mr-4
              ${isUser ? 'bg-blue-500' : agent ? 'bg-primary-500' : 'bg-neutral-500'}
              text-white
            `}>
              <span className="material-icons">
                {isUser ? 'person' : getAgentIcon(agent)}
              </span>
            </div>
            
            {/* Sender info */}
            <div>
              <h3 className={`font-medium ${isUser ? 'text-blue-700 dark:text-blue-300' : agent ? 'text-primary-700 dark:text-primary-300' : 'text-neutral-700 dark:text-neutral-300'}`}>
                {isUser ? 'You' : agent ? agent.name : 'System'}
              </h3>
              <p className="text-xs text-neutral-500 dark:text-neutral-400">
                {timestamp}
                {agent && ` · ${agent.type.charAt(0).toUpperCase() + agent.type.slice(1)}`}
                {agent && agent.model && ` · ${agent.model}`}
              </p>
            </div>
          </div>
        )}
        
        {/* Message content */}
        <div className={`prose dark:prose-invert max-w-none ${isGrouped ? 'ml-14' : ''}`}>
          <Markdown
            remarkPlugins={[remarkGfm]}
            components={{
              code({ node, inline, className, children, ...props }: any) {
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
            {message.content}
          </Markdown>
        </div>
        
        {/* Technical view toggle button - only show for agent messages */}
        {!isUser && hasTechnicalContent && showTechnicalView && (
          <div className="mt-2 pt-2 border-t border-neutral-200 dark:border-neutral-700">
            <button
              onClick={toggleExpanded}
              className="text-xs text-neutral-500 hover:text-neutral-700 dark:text-neutral-400 dark:hover:text-neutral-300 flex items-center"
            >
              <span className="material-icons-outlined text-sm mr-1">
                {expanded ? 'expand_less' : 'expand_more'}
              </span>
              {expanded ? 'Hide' : 'Show'} agent thinking
            </button>
            
            {/* Technical content - visible when expanded */}
            {expanded && (
              <div className="mt-2 p-3 bg-neutral-50 dark:bg-neutral-900 rounded border border-neutral-200 dark:border-neutral-700 text-sm">
                <h4 className="text-xs font-medium mb-2 text-neutral-500 dark:text-neutral-400 uppercase">
                  Agent thinking process
                </h4>
                <Markdown
                  remarkPlugins={[remarkGfm]}
                  components={{
                    code({ node, inline, className, children, ...props }: any) {
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
                  {technicalContent}
                </Markdown>
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
}