import { useState, useRef, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Switch } from "@/components/ui/switch";
import { Label } from "@/components/ui/label";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";

interface ChatInputProps {
  onSendMessage: (message: string) => void;
}

export default function ChatInput({ onSendMessage }: ChatInputProps) {
  const [message, setMessage] = useState("");
  const [memoryEnabled, setMemoryEnabled] = useState(true);
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      handleSend();
    }
  };

  const handleSend = () => {
    if (message.trim()) {
      onSendMessage(message);
      setMessage("");
      
      // Reset textarea height
      if (textareaRef.current) {
        textareaRef.current.style.height = "auto";
      }
    }
  };

  // Auto-resize textarea
  useEffect(() => {
    if (!textareaRef.current) return;
    
    textareaRef.current.style.height = "auto";
    const scrollHeight = textareaRef.current.scrollHeight;
    textareaRef.current.style.height = `${Math.min(scrollHeight, 150)}px`;
  }, [message]);

  return (
    <div className="border-t border-neutral-200 dark:border-neutral-700 bg-white dark:bg-neutral-800 p-4">
      <div className="flex items-start">
        <div className="flex-1">
          <div className="relative">
            <Textarea 
              ref={textareaRef}
              value={message}
              onChange={(e) => setMessage(e.target.value)}
              onKeyDown={handleKeyDown}
              placeholder="Message Manus AI system..."
              className="w-full border border-neutral-300 dark:border-neutral-600 rounded-lg px-4 py-3 pr-12 resize-none focus:outline-none focus:ring-2 focus:ring-primary-500 focus:border-primary-500 dark:bg-neutral-700 min-h-[60px]"
              rows={1}
            />
            <div className="absolute right-2 bottom-1.5 flex items-center">
              <TooltipProvider>
                <Tooltip>
                  <TooltipTrigger asChild>
                    <Button 
                      variant="ghost" 
                      size="icon" 
                      className="h-8 w-8 text-neutral-500 hover:bg-neutral-100 dark:hover:bg-neutral-600 hover:text-neutral-700 dark:hover:text-neutral-300"
                    >
                      <span className="material-icons">attach_file</span>
                    </Button>
                  </TooltipTrigger>
                  <TooltipContent>
                    <p>Attach file</p>
                  </TooltipContent>
                </Tooltip>
              </TooltipProvider>
            </div>
          </div>
          <div className="flex justify-between items-center text-xs text-neutral-500 dark:text-neutral-400 mt-2 px-1">
            <div>Markdown supported</div>
            <div className="flex items-center space-x-2">
              <span className="material-icons text-sm">memory</span>
              <Label htmlFor="memory-toggle" className="cursor-pointer">Memory:</Label>
              <Switch 
                id="memory-toggle" 
                checked={memoryEnabled} 
                onCheckedChange={setMemoryEnabled}
                aria-label="Toggle memory"
              />
            </div>
          </div>
        </div>
        <Button 
          onClick={handleSend}
          size="icon" 
          className="ml-3 rounded-full w-10 h-10 flex-shrink-0"
        >
          <span className="material-icons">send</span>
        </Button>
      </div>
    </div>
  );
}
