"use client";

import dynamic from "next/dynamic";
import { ReactFlowProvider } from "reactflow";
import Sidebar from "@/components/Sidebar";
import ChatInput from "@/components/ChatInput";
import Breadcrumb from "@/components/Breadcrumb";
import Inspector from "@/components/Inspector";
import ConversationPanel from "@/components/ConversationPanel";
import StoreHydrator from "@/components/StoreHydrator";

// SSR disabled — ReactFlow requires browser APIs
const GraphCanvas = dynamic(() => import("@/components/GraphCanvas"), {
  ssr: false,
});

export default function HomePage() {
  return (
    <div className="relative h-full w-full overflow-hidden">
      <StoreHydrator>
        <ReactFlowProvider>
          <GraphCanvas />
          <Sidebar />
          <Breadcrumb />
          <ConversationPanel />
          <ChatInput />
          <Inspector />
        </ReactFlowProvider>
      </StoreHydrator>
    </div>
  );
}
