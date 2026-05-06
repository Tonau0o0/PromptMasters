"use client";

import { useMemo } from "react";
import ReactFlow, {
  Background,
  BackgroundVariant,
  Controls,
  MiniMap,
  type NodeTypes,
  type Node,
  type Edge,
} from "reactflow";

import CoreNode from "@/components/nodes/CoreNode";
import DataNode from "@/components/nodes/DataNode";
import FeatureNode from "@/components/nodes/FeatureNode";
import DepartmentNode from "@/components/nodes/DepartmentNode";
import { useStore, CORE_NODE_ID, type BrainNode, type ViewState } from "@/store/useStore";
import { NODE_COLORS } from "@/lib/theme";

/**
 * View'a göre node + edge listesini filtrele.
 *  - company: Patron + tüm departmanlar; ilgili edge'ler
 *  - department(X): X + altındaki leaf'ler; ilgili edge'ler
 */
function filterByView(
  view: ViewState,
  nodes: BrainNode[],
  edges: Edge[],
): { nodes: Node[]; edges: Edge[] } {
  if (view.kind === "company") {
    const visibleNodes = nodes.filter(
      (n) => n.data.kind === "core" || n.data.kind === "department",
    );
    const visibleIds = new Set(visibleNodes.map((n) => n.id));
    return {
      nodes: visibleNodes,
      edges: edges.filter((e) => visibleIds.has(e.source) && visibleIds.has(e.target)),
    };
  }

  const dept = nodes.find((n) => n.id === view.id);
  const leaves = nodes.filter((n) => n.data.departmentId === view.id);
  const visibleNodes = dept ? [dept, ...leaves] : leaves;
  const visibleIds = new Set(visibleNodes.map((n) => n.id));
  return {
    nodes: visibleNodes,
    edges: edges.filter((e) => visibleIds.has(e.source) && visibleIds.has(e.target)),
  };
}

export default function GraphCanvas() {
  const allNodes = useStore((s) => s.nodes);
  const allEdges = useStore((s) => s.edges);
  const view = useStore((s) => s.view);
  const onNodesChange = useStore((s) => s.onNodesChange);
  const onEdgesChange = useStore((s) => s.onEdgesChange);
  const onConnect = useStore((s) => s.onConnect);
  const selectNode = useStore((s) => s.selectNode);

  const { nodes, edges } = useMemo(
    () => filterByView(view, allNodes, allEdges),
    [view, allNodes, allEdges],
  );

  const nodeTypes = useMemo<NodeTypes>(
    () => ({
      core: CoreNode,
      department: DepartmentNode,
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
      onNodeClick={(_, node) => selectNode(node.id)}
      onPaneClick={() => selectNode(null)}
      fitView
      fitViewOptions={{ padding: 0.6 }}
      proOptions={{ hideAttribution: true }}
      defaultEdgeOptions={{
        animated: true,
        style: { stroke: NODE_COLORS.core, strokeWidth: 2 },
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
          if (n.id === CORE_NODE_ID) return NODE_COLORS.core;
          if (n.type === "department") return "#71717a";
          return (
            NODE_COLORS[(n.type as keyof typeof NODE_COLORS) ?? "feature"] ??
            NODE_COLORS.feature
          );
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
