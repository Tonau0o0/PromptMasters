"use client";

import { create } from "zustand";
import {
  addEdge,
  applyEdgeChanges,
  applyNodeChanges,
  type Connection,
  type Edge,
  type EdgeChange,
  type Node,
  type NodeChange,
} from "reactflow";
import { uid } from "@/lib/utils";

export type NodeKind = "core" | "data" | "feature";

export interface TabularMeta {
  toplam_satir: number;
  toplam_sutun: number;
  sutun_adlari: string[];
  sutunlar: { ad: string; tur: string; bos_deger: number }[];
  on_izleme: Record<string, unknown>[];
}

export interface BrainNodeData {
  label: string;
  kind: NodeKind;
  isActive: boolean;
  description?: string;
  fileName?: string;
  fileType?: string;
  // Set after a successful upload:
  uploadStatus?: "idle" | "uploading" | "done" | "error";
  uploadError?: string;
  // For tabular files (CSV / XLSX)
  tabularMeta?: TabularMeta;
  // For document files (PDF / DOCX)
  documentFileId?: string;
  documentChunks?: number;
}

export type BrainNode = Node<BrainNodeData>;

interface StoreState {
  nodes: BrainNode[];
  edges: Edge[];
  onNodesChange: (changes: NodeChange[]) => void;
  onEdgesChange: (changes: EdgeChange[]) => void;
  onConnect: (connection: Connection) => void;
  addDataNode: (payload?: Partial<BrainNodeData>) => void;
  addFeatureNode: (payload?: Partial<BrainNodeData>) => void;
  toggleActive: (id: string) => void;
  removeNode: (id: string) => void;
  getActiveNodes: () => BrainNode[];
  patchNodeData: (id: string, patch: Partial<BrainNodeData>) => void;
}

const CORE_ID = "core_llm";

const initialNodes: BrainNode[] = [
  {
    id: CORE_ID,
    type: "core",
    position: { x: 0, y: 0 },
    data: {
      label: "Çekirdek LLM",
      kind: "core",
      isActive: true,
      description: "Tüm aktif veriler ve özellikler buraya akıyor.",
    },
  },
];

export const useStore = create<StoreState>((set, get) => ({
  nodes: initialNodes,
  edges: [],

  onNodesChange: (changes) =>
    set({ nodes: applyNodeChanges(changes, get().nodes) as BrainNode[] }),

  onEdgesChange: (changes) =>
    set({ edges: applyEdgeChanges(changes, get().edges) }),

  onConnect: (connection) =>
    set({
      edges: addEdge(
        { ...connection, animated: true, style: { strokeWidth: 2 } },
        get().edges,
      ),
    }),

  addDataNode: (payload = {}) => {
    const id = uid("data");
    const newNode: BrainNode = {
      id,
      type: "data",
      position: {
        x: -260 - Math.random() * 120,
        y: -160 + Math.random() * 320,
      },
      data: {
        label: payload.label ?? "Yeni Veri",
        kind: "data",
        isActive: false,
        description: payload.description ?? "PDF, CSV veya metin dosyası",
        fileName: payload.fileName,
        fileType: payload.fileType ?? "PDF",
      },
    };
    set({ nodes: [...get().nodes, newNode] });
  },

  addFeatureNode: (payload = {}) => {
    const id = uid("feat");
    const newNode: BrainNode = {
      id,
      type: "feature",
      position: {
        x: 260 + Math.random() * 120,
        y: -160 + Math.random() * 320,
      },
      data: {
        label: payload.label ?? "Yeni Özellik",
        kind: "feature",
        isActive: false,
        description: payload.description ?? "Araç / fonksiyon",
      },
    };
    set({ nodes: [...get().nodes, newNode] });
  },

  toggleActive: (id) =>
    set({
      nodes: get().nodes.map((n) =>
        n.id === id ? { ...n, data: { ...n.data, isActive: !n.data.isActive } } : n,
      ),
    }),

  removeNode: (id) => {
    if (id === CORE_ID) return;
    set({
      nodes: get().nodes.filter((n) => n.id !== id),
      edges: get().edges.filter((e) => e.source !== id && e.target !== id),
    });
  },

  getActiveNodes: () =>
    get().nodes.filter((n) => n.data.kind !== "core" && n.data.isActive),

  patchNodeData: (id, patch) =>
    set({
      nodes: get().nodes.map((n) =>
        n.id === id ? { ...n, data: { ...n.data, ...patch } } : n,
      ),
    }),
}));

export const CORE_NODE_ID = CORE_ID;
