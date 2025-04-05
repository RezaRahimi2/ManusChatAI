import { useState } from "react";
import Header from "@/components/Header";
import AgentList from "@/components/agents/AgentList";
import ToolList from "@/components/tools/ToolList";
import MemoryStats from "@/components/memory/MemoryStats";
import WorkspaceTabs from "@/components/workspace/WorkspaceTabs";
import Workspace from "@/components/workspace/Workspace";
import AgentDetails from "@/components/agents/AgentDetails";
import CreateAgentModal from "@/components/agents/CreateAgentModal";
import { useAgentContext } from "@/context/AgentContext";
import { useWorkspaceContext } from "@/context/WorkspaceContext";

export default function Home() {
  const { selectedAgent } = useAgentContext();
  const { activeWorkspace } = useWorkspaceContext();
  const [showDetailsPanel, setShowDetailsPanel] = useState(true);
  const [showCreateAgentModal, setShowCreateAgentModal] = useState(false);
  const [showSidebar, setShowSidebar] = useState(true);

  // Handle responsive layout
  const toggleSidebar = () => {
    setShowSidebar(!showSidebar);
  };

  const toggleDetailsPanel = () => {
    setShowDetailsPanel(!showDetailsPanel);
  };

  return (
    <div className="font-sans bg-neutral-50 text-neutral-900 dark:bg-neutral-900 dark:text-neutral-50 h-screen flex flex-col">
      <Header 
        onToggleSidebar={toggleSidebar} 
        onToggleDetails={toggleDetailsPanel}
      />

      <div className="flex flex-1 overflow-hidden">
        {/* Sidebar */}
        {showSidebar && (
          <aside className="w-64 border-r border-neutral-200 dark:border-neutral-700 bg-white dark:bg-neutral-800 flex flex-col">
            <div className="flex-1 overflow-hidden flex flex-col">
              <AgentList onCreateAgent={() => setShowCreateAgentModal(true)} />
              <ToolList />
              <MemoryStats />
            </div>
          </aside>
        )}

        {/* Main Content */}
        <div className="flex-1 flex flex-col bg-neutral-100 dark:bg-neutral-900">
          <WorkspaceTabs />

          {activeWorkspace && (
            <Workspace workspaceId={activeWorkspace.id} />
          )}
        </div>

        {/* Details Panel */}
        {showDetailsPanel && selectedAgent && (
          <AgentDetails onClose={() => setShowDetailsPanel(false)} />
        )}
      </div>

      {/* Modals */}
      {showCreateAgentModal && (
        <CreateAgentModal onClose={() => setShowCreateAgentModal(false)} />
      )}
    </div>
  );
}
