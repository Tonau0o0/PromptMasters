"use client";

import dynamic from "next/dynamic";
import { ReactFlowProvider } from "reactflow";
import Sidebar from "@/components/Sidebar";
import ChatInput from "@/components/ChatInput";

// SSR disabled — ReactFlow requires browser APIs
const GraphCanvas = dynamic(() => import("@/components/GraphCanvas"), {
  ssr: false,
});

export default function HomePage() {
  return (
    <div className="relative h-full w-full overflow-hidden">
      <ReactFlowProvider>
        <GraphCanvas />
        <Sidebar />
        <ChatInput />
      </ReactFlowProvider>
    </div>
  );
}
