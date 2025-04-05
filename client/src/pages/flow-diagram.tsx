import React, { useEffect } from 'react';
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { Separator } from "@/components/ui/separator";
import agentFlowDiagram from '../assets/agent_flow_diagram.svg';

export default function FlowDiagramPage() {
  useEffect(() => {
    document.title = 'Agent Flow Diagram - Multi-Agent System';
  }, []);
  
  return (
    <div className="container mx-auto py-6 px-4">
      <div className="flex flex-col space-y-6">
        <div className="flex flex-col space-y-2">
          <h1 className="text-3xl font-bold tracking-tight">Agent Flow Visualization</h1>
          <p className="text-muted-foreground">
            Visualizing how agents collaborate to answer: "What's the best place for visiting in Ankara tomorrow?"
          </p>
        </div>
        
        <Separator />
        
        <Card className="w-full">
          <CardHeader>
            <CardTitle>Agent Collaboration Flow</CardTitle>
            <CardDescription>
              This diagram shows the sequence of agent interactions when processing your query
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="flex justify-center">
              <img 
                src={agentFlowDiagram} 
                alt="Agent Flow Diagram" 
                className="w-full max-w-4xl h-auto" 
              />
            </div>
          </CardContent>
          <CardFooter className="flex flex-col items-start gap-2">
            <h3 className="font-medium">Process Explanation:</h3>
            <ol className="list-decimal list-inside space-y-2 text-sm">
              <li><span className="font-medium">User Query Intake:</span> The Enhanced Orchestrator receives your question about Ankara visit recommendations.</li>
              <li><span className="font-medium">Task Analysis:</span> The query is analyzed and a plan is created by the Planner Agent.</li>
              <li><span className="font-medium">Information Gathering:</span> The Research Agent gathers up-to-date information about Ankara attractions.</li>
              <li><span className="font-medium">Response Creation:</span> The Writer Agent crafts a clear, informative response based on the research.</li>
              <li><span className="font-medium">Response Analysis:</span> The Thinker Agent reviews the response for accuracy and completeness.</li>
              <li><span className="font-medium">Final Synthesis:</span> The Enhanced Orchestrator compiles the final response and delivers it to you.</li>
            </ol>
          </CardFooter>
        </Card>
      </div>
    </div>
  );
}