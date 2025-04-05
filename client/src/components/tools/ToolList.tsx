import { Checkbox } from "@/components/ui/checkbox";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { useState } from "react";

export default function ToolList() {
  const [tools, setTools] = useState([
    { id: "web_browser", name: "Web Browser", icon: "public", enabled: true },
    { id: "file_system", name: "File System", icon: "description", enabled: true },
    { id: "code_execution", name: "Code Execution", icon: "terminal", enabled: false },
    { id: "api_connector", name: "API Connector", icon: "api", enabled: false },
  ]);

  const toggleTool = (id: string) => {
    setTools(prev => 
      prev.map(tool => 
        tool.id === id 
          ? { ...tool, enabled: !tool.enabled } 
          : tool
      )
    );
  };

  return (
    <div className="pt-2 border-t border-neutral-200 dark:border-neutral-700 p-2">
      <h2 className="px-2 mb-2 font-medium text-sm uppercase text-neutral-500 dark:text-neutral-400">Tools</h2>
      
      <div className="space-y-1">
        {tools.map(tool => (
          <div 
            key={tool.id}
            className="flex items-center p-2 rounded-lg cursor-pointer hover:bg-neutral-100 dark:hover:bg-neutral-700"
            onClick={() => toggleTool(tool.id)}
          >
            <span className="material-icons mr-3 text-neutral-500">{tool.icon}</span>
            <span className="text-sm flex-1">{tool.name}</span>
            <Checkbox 
              checked={tool.enabled}
              onCheckedChange={() => toggleTool(tool.id)}
              onClick={(e) => e.stopPropagation()}
            />
          </div>
        ))}
      </div>
      
      <Button
        variant="ghost"
        className="w-full mt-3 flex items-center justify-center p-2 rounded-lg border-2 border-dashed border-neutral-300 dark:border-neutral-600 text-neutral-500 dark:text-neutral-400 hover:bg-neutral-100 dark:hover:bg-neutral-700"
      >
        <span className="material-icons mr-2 text-sm">add</span>
        <span className="text-sm font-medium">Add New Tool</span>
      </Button>
    </div>
  );
}
