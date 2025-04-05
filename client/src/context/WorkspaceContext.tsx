import React, { createContext, useContext, useState, useEffect } from 'react';
import { Workspace, InsertWorkspace } from '@shared/schema';
import { useToast } from '@/hooks/use-toast';

interface WorkspaceContextType {
  workspaces: Workspace[];
  activeWorkspace: Workspace | null;
  createWorkspace: (data: InsertWorkspace) => Promise<void>;
  setActiveWorkspace: (workspace: Workspace) => void;
  deleteWorkspace: (id: number) => Promise<void>;
  loading: boolean;
  error: string | null;
}

const WorkspaceContext = createContext<WorkspaceContextType | undefined>(undefined);

export const WorkspaceProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [workspaces, setWorkspaces] = useState<Workspace[]>([]);
  const [activeWorkspace, setActiveWorkspace] = useState<Workspace | null>(null);
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);
  const { toast } = useToast();

  // Fetch workspaces on initial load
  useEffect(() => {
    const fetchWorkspaces = async () => {
      try {
        const response = await fetch('/api/workspaces');
        if (!response.ok) {
          throw new Error('Failed to fetch workspaces');
        }
        const data = await response.json();
        setWorkspaces(data);
        
        // Set the first workspace as active if exists
        if (data.length > 0) {
          setActiveWorkspace(data[0]);
        }
      } catch (err) {
        setError(err instanceof Error ? err.message : 'An unknown error occurred');
        toast({
          title: "Error",
          description: "Failed to load workspaces",
          variant: "destructive"
        });
      } finally {
        setLoading(false);
      }
    };

    fetchWorkspaces();
  }, [toast]);

  const createWorkspace = async (data: InsertWorkspace) => {
    setLoading(true);
    try {
      const response = await fetch('/api/workspaces', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify(data)
      });

      if (!response.ok) {
        throw new Error('Failed to create workspace');
      }

      const newWorkspace = await response.json();
      setWorkspaces(prev => [...prev, newWorkspace]);
      setActiveWorkspace(newWorkspace);
      
      toast({
        title: "Success",
        description: "Workspace created successfully"
      });
    } catch (err) {
      setError(err instanceof Error ? err.message : 'An unknown error occurred');
      toast({
        title: "Error",
        description: "Failed to create workspace",
        variant: "destructive"
      });
    } finally {
      setLoading(false);
    }
  };

  const deleteWorkspace = async (id: number) => {
    setLoading(true);
    try {
      const response = await fetch(`/api/workspaces/${id}`, {
        method: 'DELETE'
      });

      if (!response.ok) {
        throw new Error('Failed to delete workspace');
      }

      setWorkspaces(prev => prev.filter(workspace => workspace.id !== id));
      
      // If active workspace was deleted, set a new active workspace
      if (activeWorkspace && activeWorkspace.id === id) {
        const remaining = workspaces.filter(workspace => workspace.id !== id);
        setActiveWorkspace(remaining.length > 0 ? remaining[0] : null);
      }
      
      toast({
        title: "Success",
        description: "Workspace deleted successfully"
      });
    } catch (err) {
      setError(err instanceof Error ? err.message : 'An unknown error occurred');
      toast({
        title: "Error",
        description: "Failed to delete workspace",
        variant: "destructive"
      });
    } finally {
      setLoading(false);
    }
  };

  return (
    <WorkspaceContext.Provider
      value={{
        workspaces,
        activeWorkspace,
        createWorkspace,
        setActiveWorkspace,
        deleteWorkspace,
        loading,
        error
      }}
    >
      {children}
    </WorkspaceContext.Provider>
  );
};

export const useWorkspaceContext = () => {
  const context = useContext(WorkspaceContext);
  if (context === undefined) {
    throw new Error('useWorkspaceContext must be used within a WorkspaceProvider');
  }
  return context;
};
