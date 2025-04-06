import React, { useEffect, useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { cn } from '@/lib/utils';
import { Agent } from '@shared/schema';
import { AgentStatus } from '@/components/agents/AgentActivityIndicator';

interface AgentNode {
  id: number;
  agent: Agent;
  status: AgentStatus;
  position: { x: number, y: number };
}

interface AgentConnection {
  from: number;
  to: number;
  status: 'active' | 'completed' | 'pending';
}

interface AgentInteractionFlowProps {
  activeAgents: [number, AgentStatus][];
  getAgent: (id: number) => Agent | undefined;
  collaborationId?: string;
  className?: string;
}

/**
 * Visualizes the flow of information between agents during collaboration
 */
export default function AgentInteractionFlow({
  activeAgents,
  getAgent,
  collaborationId,
  className
}: AgentInteractionFlowProps) {
  const [nodes, setNodes] = useState<AgentNode[]>([]);
  const [connections, setConnections] = useState<AgentConnection[]>([]);
  const [focusedNode, setFocusedNode] = useState<number | null>(null);
  
  // Calculate node positions in a circle or grid layout
  useEffect(() => {
    if (!activeAgents.length) return;
    
    // Create nodes from active agents
    const newNodes: AgentNode[] = [];
    const centerX = 400;
    const centerY = 100;
    const radius = Math.min(200, Math.max(80, activeAgents.length * 20));
    
    // Determine layout based on agent count
    if (activeAgents.length > 1) {
      // Circle layout for multiple agents
      activeAgents.forEach(([agentId, status], index) => {
        const agent = getAgent(agentId);
        if (!agent) return;
        
        const angle = (index / activeAgents.length) * Math.PI * 2;
        const x = centerX + radius * Math.cos(angle);
        const y = centerY + radius * Math.sin(angle);
        
        newNodes.push({
          id: agentId,
          agent,
          status,
          position: { x, y }
        });
      });
    } else if (activeAgents.length === 1) {
      // Single agent centered
      const [agentId, status] = activeAgents[0];
      const agent = getAgent(agentId);
      if (!agent) return;
      
      newNodes.push({
        id: agentId,
        agent,
        status,
        position: { x: centerX, y: centerY }
      });
    }
    
    setNodes(newNodes);
    
    // Create connections based on agent types and statuses
    // For this example, we'll connect the orchestrator to each agent
    // and create connections between agents based on their roles
    if (newNodes.length > 1) {
      const newConnections: AgentConnection[] = [];
      
      // Find orchestrator or coordinator
      const orchestrator = newNodes.find(node => 
        node.agent.type.toLowerCase().includes('orchestrator') || 
        node.agent.type.toLowerCase().includes('coordinator')
      );
      
      if (orchestrator) {
        // Connect orchestrator to all other agents
        newNodes.forEach(node => {
          if (node.id !== orchestrator.id) {
            // Determine connection status
            let status: AgentConnection['status'] = 'pending';
            if (node.status === AgentStatus.PROCESSING) {
              status = 'active';
            } else if (node.status === AgentStatus.COMPLETED) {
              status = 'completed';
            }
            
            newConnections.push({
              from: orchestrator.id,
              to: node.id,
              status
            });
          }
        });
      } else {
        // If no orchestrator, connect nodes sequentially
        for (let i = 0; i < newNodes.length - 1; i++) {
          let status: AgentConnection['status'] = 'pending';
          if (newNodes[i + 1].status === AgentStatus.PROCESSING) {
            status = 'active';
          } else if (newNodes[i + 1].status === AgentStatus.COMPLETED) {
            status = 'completed';
          }
          
          newConnections.push({
            from: newNodes[i].id,
            to: newNodes[i + 1].id,
            status
          });
        }
      }
      
      setConnections(newConnections);
    } else {
      setConnections([]);
    }
  }, [activeAgents, getAgent]);
  
  // No visualization if there are no agents
  if (nodes.length === 0) {
    return null;
  }
  
  // Get status color for nodes and connections
  const getStatusColor = (status: AgentStatus | AgentConnection['status']): string => {
    switch (status) {
      case AgentStatus.WAITING:
      case 'pending':
        return 'bg-neutral-300 dark:bg-neutral-700';
      case AgentStatus.PROCESSING:
      case 'active':
        return 'bg-blue-500';
      case AgentStatus.COMPLETED:
      case 'completed':
        return 'bg-green-500';
      case AgentStatus.ERROR:
        return 'bg-red-500';
      default:
        return 'bg-neutral-300 dark:bg-neutral-700';
    }
  };
  
  // Get agent type color
  const getAgentTypeColor = (type: string): string => {
    if (type.toLowerCase().includes('orchestrator') || type.toLowerCase().includes('coordinator')) {
      return 'bg-purple-500';
    } else if (type.toLowerCase().includes('research')) {
      return 'bg-blue-500';
    } else if (type.toLowerCase().includes('code')) {
      return 'bg-green-500';
    } else if (type.toLowerCase().includes('writer')) {
      return 'bg-yellow-500';
    } else if (type.toLowerCase().includes('reasoning')) {
      return 'bg-orange-500';
    } else {
      return 'bg-neutral-500';
    }
  };
  
  // Get agent initials
  const getAgentInitials = (name: string): string => {
    return name
      .split(' ')
      .map(part => part[0])
      .join('')
      .slice(0, 2)
      .toUpperCase();
  };
  
  return (
    <div className={cn("relative w-full h-[200px] overflow-hidden", className)}>
      <svg className="w-full h-full absolute" style={{ pointerEvents: 'none' }}>
        {/* Connection lines */}
        {connections.map(conn => {
          const fromNode = nodes.find(n => n.id === conn.from);
          const toNode = nodes.find(n => n.id === conn.to);
          
          if (!fromNode || !toNode) return null;
          
          const startX = fromNode.position.x;
          const startY = fromNode.position.y;
          const endX = toNode.position.x;
          const endY = toNode.position.y;
          
          // Add a slight curve to connections
          const controlX = (startX + endX) / 2;
          const controlY = (startY + endY) / 2 - 30;
          
          // Determine if the connection should be highlighted
          const isHighlighted = 
            focusedNode === conn.from || 
            focusedNode === conn.to || 
            focusedNode === null;
          
          return (
            <g key={`${conn.from}-${conn.to}`}>
              {/* Line path */}
              <path
                d={`M ${startX} ${startY} Q ${controlX} ${controlY}, ${endX} ${endY}`}
                fill="none"
                stroke={conn.status === 'active' ? '#3b82f6' : 
                       conn.status === 'completed' ? '#22c55e' : 
                       '#d1d5db'}
                strokeWidth={conn.status === 'active' ? 3 : 2}
                strokeDasharray={conn.status === 'pending' ? '5,5' : 'none'}
                opacity={isHighlighted ? 1 : 0.3}
                className="transition-opacity duration-300"
              />
              
              {/* Animated particle for active connections */}
              {conn.status === 'active' && (
                <motion.circle
                  r={4}
                  fill="#3b82f6"
                  filter="url(#glow)"
                  initial={{ offsetDistance: "0%" }}
                  animate={{ offsetDistance: "100%" }}
                  transition={{ 
                    repeat: Infinity, 
                    duration: 1.5,
                    ease: "linear"
                  }}
                  style={{
                    offsetPath: `path('M ${startX} ${startY} Q ${controlX} ${controlY}, ${endX} ${endY}')`,
                  }}
                />
              )}
            </g>
          );
        })}
        
        {/* SVG filter for glow effect */}
        <defs>
          <filter id="glow" x="-50%" y="-50%" width="200%" height="200%">
            <feGaussianBlur stdDeviation="2" result="blur" />
            <feComposite in="SourceGraphic" in2="blur" operator="over" />
          </filter>
        </defs>
      </svg>
      
      {/* Agent nodes */}
      <AnimatePresence>
        {nodes.map(node => (
          <motion.div
            key={node.id}
            className={cn(
              "absolute rounded-full flex items-center gap-2 transition-all",
              focusedNode === node.id || focusedNode === null ? 'opacity-100 scale-100' : 'opacity-50 scale-95'
            )}
            style={{
              left: node.position.x,
              top: node.position.y,
              transform: 'translate(-50%, -50%)'
            }}
            initial={{ scale: 0, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            exit={{ scale: 0, opacity: 0 }}
            transition={{ type: 'spring', stiffness: 300, damping: 20 }}
            onMouseEnter={() => setFocusedNode(node.id)}
            onMouseLeave={() => setFocusedNode(null)}
          >
            {/* Agent Avatar */}
            <div 
              className={cn(
                "w-10 h-10 rounded-full flex items-center justify-center shadow-md border-2 border-white dark:border-neutral-800",
                getAgentTypeColor(node.agent.type)
              )}
            >
              <span className="text-white font-bold text-sm">{getAgentInitials(node.agent.name)}</span>
            </div>
            
            {/* Status indicator */}
            <div className={cn(
              "w-3 h-3 rounded-full absolute -top-1 -right-1 border border-white dark:border-neutral-800",
              getStatusColor(node.status)
            )} />
            
            {/* Agent name tooltip */}
            <div className="absolute -bottom-8 left-1/2 transform -translate-x-1/2 bg-white dark:bg-neutral-800 text-xs py-1 px-2 rounded shadow whitespace-nowrap opacity-0 group-hover:opacity-100 transition-opacity">
              {node.agent.name}
            </div>
          </motion.div>
        ))}
      </AnimatePresence>
    </div>
  );
}