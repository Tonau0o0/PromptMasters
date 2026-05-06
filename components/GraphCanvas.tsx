"use client";

import { useMemo } from "react";
import ReactFlow, {
  Background,
  BackgroundVariant,
  Controls,
  MiniMap,
  type NodeTypes,
} from "reactflow";

import CoreNode from "@/components/nodes/CoreNode";
import DataNode from "@/components/nodes/DataNode";
import FeatureNode from "@/components/nodes/FeatureNode";
import { useStore } from "@/store/useStore";

export default function GraphCanvas() {
  const nodes = useStore((s) => s.nodes);
  const edges = useStore((s) => s.edges);
  const onNodesChange = useStore((s) => s.onNodesChange);
  const onEdgesChange = useStore((s) => s.onEdgesChange);
  const onConnect = useStore((s) => s.onConnect);

  const nodeTypes = useMemo<NodeTypes>(
    () => ({
      core: CoreNode,
      data: DataNode,
      feature: FeatureNode,
    }),
    [],
  );

  return (
    <ReactFlow
      nodes={nodes}
      edges={edges}
      nodeTypes={nodeTypes}
      onNodesChange={onNodesChange}
      onEdgesChange={onEdgesChange}
      onConnect={onConnect}
      fitView
      fitViewOptions={{ padding: 0.6 }}
      proOptions={{ hideAttribution: true }}
      defaultEdgeOptions={{
        animated: true,
        style: { stroke: "#a855f7", strokeWidth: 2 },
      }}
    >
      <Background
        variant={BackgroundVariant.Dots}
        gap={28}
        size={1.4}
        color="#1f1f29"
      />
      <Controls position="bottom-right" showInteractive={false} />
      <MiniMap
        pannable
        zoomable
        nodeColor={(n) => {
          if (n.type === "core") return "#a855f7";
          if (n.type === "data") return "#22d3ee";
          return "#f59e0b";
        }}
        maskColor="rgba(7,7,9,0.8)"
        style={{
          background: "#0b0b0f",
          border: "1px solid #1f1f29",
          borderRadius: 8,
        }}
      />
    </ReactFlow>
  );
}
