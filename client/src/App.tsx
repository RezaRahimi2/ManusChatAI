import { Switch, Route } from "wouter";
import { queryClient } from "./lib/queryClient";
import { QueryClientProvider } from "@tanstack/react-query";
import { Toaster } from "@/components/ui/toaster";
import NotFound from "@/pages/not-found";
import Home from "@/pages/home";
import { AgentProvider } from "./context/AgentContext";
import { WorkspaceProvider } from "./context/WorkspaceContext";

function Router() {
  return (
    <Switch>
      <Route path="/" component={Home} />
      <Route component={NotFound} />
    </Switch>
  );
}

function App() {
  return (
    <QueryClientProvider client={queryClient}>
      <AgentProvider>
        <WorkspaceProvider>
          <Router />
        </WorkspaceProvider>
      </AgentProvider>
    </QueryClientProvider>
  );
}

export default App;
