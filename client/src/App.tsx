import { Switch, Route } from "wouter";
import { queryClient } from "./lib/queryClient";
import { QueryClientProvider } from "@tanstack/react-query";
import { Toaster } from "@/components/ui/toaster";
import NotFound from "@/pages/not-found";
import Home from "@/pages/home";
import Settings from "@/pages/settings";
import FlowDiagram from "@/pages/flow-diagram";
import { AgentProvider } from "./context/AgentContext";
import { WorkspaceProvider } from "./context/WorkspaceContext";

function Router() {
  return (
    <Switch>
      <Route path="/" component={Home} />
      <Route path="/settings" component={Settings} />
      <Route path="/flow-diagram" component={FlowDiagram} />
      <Route component={NotFound} />
    </Switch>
  );
}

function App() {
  return (
    <div className="dark">
      <QueryClientProvider client={queryClient}>
        <AgentProvider>
          <WorkspaceProvider>
            <div className="min-h-screen bg-background text-foreground">
              <Router />
              <Toaster />
            </div>
          </WorkspaceProvider>
        </AgentProvider>
      </QueryClientProvider>
    </div>
  );
}

export default App;
