import React, { createContext, useContext, useState, useEffect } from 'react';
import { Agent, InsertAgent } from '@shared/schema';
import { useToast } from '@/hooks/use-toast';

interface AgentContextType {
  agents: Agent[];
  selectedAgent: Agent | null;
  selectAgent: (agent: Agent) => void;
  createAgent: (agentData: InsertAgent) => Promise<void>;
  updateAgent: (agentData: Agent) => Promise<void>;
  deleteAgent: (agentId: number) => Promise<void>;
  getAgentById: (agentId: number) => Agent | undefined;
  loading: boolean;
  error: string | null;
}

const AgentContext = createContext<AgentContextType | undefined>(undefined);

export const AgentProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [agents, setAgents] = useState<Agent[]>([]);
  const [selectedAgent, setSelectedAgent] = useState<Agent | null>(null);
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);
  const { toast } = useToast();

  // Fetch agents on initial load
  useEffect(() => {
    const fetchAgents = async () => {
      try {
        const response = await fetch('/api/agents');
        if (!response.ok) {
          throw new Error('Failed to fetch agents');
        }
        const data = await response.json();
        setAgents(data);
        
        // Select the orchestrator as default if it exists
        const orchestrator = data.find((agent: Agent) => agent.type === 'orchestrator');
        if (orchestrator) {
          setSelectedAgent(orchestrator);
        } else if (data.length > 0) {
          setSelectedAgent(data[0]);
        }
      } catch (err) {
        setError(err instanceof Error ? err.message : 'An unknown error occurred');
        toast({
          title: "Error",
          description: "Failed to load agents",
          variant: "destructive"
        });
      } finally {
        setLoading(false);
      }
    };

    fetchAgents();
  }, [toast]);

  const selectAgent = (agent: Agent) => {
    setSelectedAgent(agent);
  };

  const createAgent = async (agentData: InsertAgent) => {
    setLoading(true);
    try {
      const response = await fetch('/api/agents', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify(agentData)
      });

      if (!response.ok) {
        throw new Error('Failed to create agent');
      }

      const newAgent = await response.json();
      setAgents(prev => [...prev, newAgent]);
      toast({
        title: "Success",
        description: "Agent created successfully"
      });
    } catch (err) {
      setError(err instanceof Error ? err.message : 'An unknown error occurred');
      toast({
        title: "Error",
        description: "Failed to create agent",
        variant: "destructive"
      });
    } finally {
      setLoading(false);
    }
  };

  const updateAgent = async (agentData: Agent) => {
    setLoading(true);
    try {
      console.log(`Updating agent ${agentData.id} with data:`, agentData);
      
      const response = await fetch(`/api/agents/${agentData.id}`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify(agentData)
      });

      const responseText = await response.text();
      console.log(`Server response (${response.status}):`, responseText);
      
      if (!response.ok) {
        throw new Error(`Failed to update agent: ${response.status} ${response.statusText}`);
      }

      const updatedAgent = JSON.parse(responseText);
      console.log('Successfully parsed updated agent:', updatedAgent);
      
      setAgents(prev => prev.map(agent => 
        agent.id === updatedAgent.id ? updatedAgent : agent
      ));
      
      if (selectedAgent && selectedAgent.id === updatedAgent.id) {
        setSelectedAgent(updatedAgent);
      }
      
      toast({
        title: "Success",
        description: `Agent "${updatedAgent.name}" updated successfully`
      });
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'An unknown error occurred';
      console.error('Error updating agent:', errorMessage);
      setError(errorMessage);
      toast({
        title: "Error",
        description: `Failed to update agent: ${errorMessage}`,
        variant: "destructive"
      });
    } finally {
      setLoading(false);
    }
  };

  const deleteAgent = async (agentId: number) => {
    setLoading(true);
    try {
      const response = await fetch(`/api/agents/${agentId}`, {
        method: 'DELETE'
      });

      if (!response.ok) {
        throw new Error('Failed to delete agent');
      }

      setAgents(prev => prev.filter(agent => agent.id !== agentId));
      
      if (selectedAgent && selectedAgent.id === agentId) {
        setSelectedAgent(agents.length > 0 ? agents[0] : null);
      }
      
      toast({
        title: "Success",
        description: "Agent deleted successfully"
      });
    } catch (err) {
      setError(err instanceof Error ? err.message : 'An unknown error occurred');
      toast({
        title: "Error",
        description: "Failed to delete agent",
        variant: "destructive"
      });
    } finally {
      setLoading(false);
    }
  };

  const getAgentById = (agentId: number) => {
    return agents.find(agent => agent.id === agentId);
  };

  return (
    <AgentContext.Provider
      value={{
        agents,
        selectedAgent,
        selectAgent,
        createAgent,
        updateAgent,
        deleteAgent,
        getAgentById,
        loading,
        error
      }}
    >
      {children}
    </AgentContext.Provider>
  );
};

export const useAgentContext = () => {
  const context = useContext(AgentContext);
  if (context === undefined) {
    throw new Error('useAgentContext must be used within an AgentProvider');
  }
  return context;
};
