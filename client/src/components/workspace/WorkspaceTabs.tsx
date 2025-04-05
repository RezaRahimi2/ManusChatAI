import { 
  Tabs, 
  TabsContent, 
  TabsList, 
  TabsTrigger 
} from "@/components/ui/tabs";
import { Button } from "@/components/ui/button";
import { useWorkspaceContext } from "@/context/WorkspaceContext";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useState } from "react";

export default function WorkspaceTabs() {
  const { workspaces, activeWorkspace, setActiveWorkspace, createWorkspace } = useWorkspaceContext();
  const [showCreateWorkspaceDialog, setShowCreateWorkspaceDialog] = useState(false);
  const [newWorkspaceName, setNewWorkspaceName] = useState("");

  const handleCreateWorkspace = () => {
    if (newWorkspaceName.trim()) {
      createWorkspace({ name: newWorkspaceName });
      setNewWorkspaceName("");
      setShowCreateWorkspaceDialog(false);
    }
  };

  if (!workspaces.length) {
    return null;
  }

  return (
    <>
      <div className="flex bg-white dark:bg-neutral-800 border-b border-neutral-200 dark:border-neutral-700">
        <Tabs 
          value={activeWorkspace?.id.toString() || ""} 
          onValueChange={(value) => {
            const workspace = workspaces.find(w => w.id.toString() === value);
            if (workspace) {
              setActiveWorkspace(workspace);
            }
          }}
          className="w-full"
        >
          <TabsList className="ml-0 bg-transparent h-auto">
            {workspaces.map(workspace => (
              <TabsTrigger 
                key={workspace.id} 
                value={workspace.id.toString()}
                className="px-4 py-2 font-medium text-sm data-[state=active]:border-b-2 data-[state=active]:border-primary-500 data-[state=active]:text-primary-500 data-[state=inactive]:text-neutral-500 data-[state=inactive]:dark:text-neutral-400 data-[state=inactive]:hover:bg-neutral-100 data-[state=inactive]:dark:hover:bg-neutral-700 rounded-none"
              >
                {workspace.name}
              </TabsTrigger>
            ))}
            <Button
              variant="ghost"
              size="sm"
              className="ml-2 p-1 text-neutral-500"
              onClick={() => setShowCreateWorkspaceDialog(true)}
            >
              <span className="material-icons text-sm">add</span>
            </Button>
          </TabsList>
        </Tabs>
      </div>

      {/* Create workspace dialog */}
      <Dialog open={showCreateWorkspaceDialog} onOpenChange={setShowCreateWorkspaceDialog}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Create New Workspace</DialogTitle>
          </DialogHeader>
          
          <div className="grid gap-4 py-4">
            <div className="grid gap-2">
              <Label htmlFor="workspace-name">Workspace Name</Label>
              <Input 
                id="workspace-name" 
                placeholder="e.g. Research Project" 
                value={newWorkspaceName}
                onChange={(e) => setNewWorkspaceName(e.target.value)}
              />
            </div>
          </div>
          
          <DialogFooter>
            <Button type="button" variant="outline" onClick={() => setShowCreateWorkspaceDialog(false)}>
              Cancel
            </Button>
            <Button type="button" onClick={handleCreateWorkspace}>
              Create
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}
