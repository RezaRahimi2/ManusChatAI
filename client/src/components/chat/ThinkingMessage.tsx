export default function ThinkingMessage() {
  return (
    <div className="bg-white dark:bg-neutral-800 p-3 rounded-xl shadow-sm mb-4 max-w-3xl mx-auto border border-neutral-200 dark:border-neutral-700">
      <div className="flex items-center mb-2">
        <div className="w-6 h-6 rounded-full animated-gradient flex items-center justify-center mr-2">
          <span className="material-icons text-white text-xs">psychology</span>
        </div>
        <span className="text-xs text-neutral-500 dark:text-neutral-400 italic">Orchestrator is analyzing your request...</span>
      </div>
      <div className="border border-neutral-200 dark:border-neutral-700 rounded-lg p-2 bg-neutral-50 dark:bg-neutral-850 text-xs font-mono overflow-x-auto">
        <p>1. Analyzing request...</p>
        <p>2. Determining best approach...</p>
        <p>3. Delegating to specialized agents...</p>
      </div>
    </div>
  );
}
