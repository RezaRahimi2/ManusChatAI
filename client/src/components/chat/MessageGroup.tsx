import React from 'react';
import { Message, Agent } from '@shared/schema';
import ChatMessage from './ChatMessage';

interface MessageGroupProps {
  messages: Message[];
  collaborationId?: string;
  getAgent: (id: number) => Agent | undefined;
  showTechnicalView?: boolean;
  className?: string;
}

/**
 * Component for displaying related messages as a visual group
 */
export default function MessageGroup({
  messages,
  collaborationId,
  getAgent,
  showTechnicalView = false,
  className = ''
}: MessageGroupProps) {
  if (messages.length === 0) return null;

  // Get the first message's agent for styling
  const mainAgent = messages[0].agentId ? getAgent(messages[0].agentId) : undefined;
  
  // Check if collaboration mode
  const isCollaboration = !!collaborationId;
  
  // Get the name of the first agent
  const agentName = mainAgent?.name || 'System';
  
  return (
    <div 
      className={`relative mb-6 ${className} ${
        isCollaboration ? 'pl-4 border-l-2 border-primary-200 dark:border-primary-900' : ''
      }`}
    >
      {/* Collaboration indicator */}
      {isCollaboration && (
        <div className="absolute -left-3 top-0 w-6 h-6 bg-primary-100 dark:bg-primary-900 rounded-full flex items-center justify-center">
          <span className="material-icons text-primary-600 dark:text-primary-400 text-sm">
            workspaces
          </span>
        </div>
      )}
      
      {/* Render each message in the group */}
      {messages.map((message, index) => (
        <ChatMessage
          key={message.id}
          message={message}
          agent={message.agentId ? getAgent(message.agentId) : undefined}
          isGrouped={index > 0}
          showTechnicalView={showTechnicalView}
          className={index === 0 ? '' : 'mt-1'}
        />
      ))}
    </div>
  );
}