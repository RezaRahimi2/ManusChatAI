import { type Message, type Agent } from "@shared/schema";
import { Markdown } from "../ui/markdown";

interface ChatMessageProps {
  message: Message;
  agent?: Agent;
}

export default function ChatMessage({ message, agent }: ChatMessageProps) {
  // If this is a user message
  if (message.role === "user") {
    return (
      <div className="flex justify-end mb-4">
        <div className="bg-primary-500 text-white p-3 rounded-lg rounded-tr-none shadow-sm max-w-xl">
          <p className="text-sm whitespace-pre-wrap">{message.content}</p>
        </div>
      </div>
    );
  }
  
  // Get agent display info
  const getAgentColor = (type?: string) => {
    if (!type) return "bg-primary-500";
    
    switch (type) {
      case "orchestrator": return "bg-primary-500";
      case "research": return "bg-secondary-400";
      case "code": return "bg-accent-500";
      case "writer": return "bg-success-500";
      default: return "bg-neutral-500";
    }
  };

  const getAgentIcon = (type?: string) => {
    if (!type) return "psychology";
    
    switch (type) {
      case "orchestrator": return "smart_toy";
      case "research": return "search";
      case "code": return "code";
      case "writer": return "edit";
      default: return "engineering";
    }
  };
  
  const agentName = agent?.name || "Manus AI System";
  const agentModel = agent?.model || "";
  const agentColor = getAgentColor(agent?.type);
  const agentIcon = getAgentIcon(agent?.type);

  return (
    <div className="bg-white dark:bg-neutral-800 p-4 rounded-xl shadow-sm mb-4 max-w-3xl mx-auto border border-neutral-200 dark:border-neutral-700">
      <div className="flex items-start">
        <div className={`w-10 h-10 rounded-full ${agentColor} flex items-center justify-center flex-shrink-0 mr-4`}>
          <span className="material-icons text-white text-sm">{agentIcon}</span>
        </div>
        <div className="flex-1">
          <div className="flex items-center">
            <h3 className={`font-medium text-${agentColor.replace('bg-', '')}`}>{agentName}</h3>
            {agentModel && (
              <span className="ml-2 px-2 py-0.5 bg-neutral-100 dark:bg-neutral-700 rounded text-xs">
                {agentModel}
              </span>
            )}
          </div>
          <div className="mt-2 text-sm">
            <Markdown content={message.content} />
          </div>
        </div>
      </div>
    </div>
  );
}
