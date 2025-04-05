import { Progress } from "@/components/ui/progress";

export default function MemoryStats() {
  // Mock memory usage - in a real app, fetch this from the API
  const memoryUsed = 8;
  const memoryTotal = 25;
  const memoryPercentage = (memoryUsed / memoryTotal) * 100;

  return (
    <div className="p-3 border-t border-neutral-200 dark:border-neutral-700 mt-auto">
      <div className="flex justify-between items-center mb-1">
        <span className="text-sm font-medium">Memory</span>
        <div className="flex items-center text-xs text-neutral-500">
          <span className="material-icons text-xs mr-1">storage</span>
          <span>{memoryUsed} MB</span>
        </div>
      </div>
      <Progress value={memoryPercentage} className="h-1.5" />
    </div>
  );
}
