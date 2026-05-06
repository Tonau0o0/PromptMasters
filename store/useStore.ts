"use client";

import { create } from "zustand";
import { persist, createJSONStorage } from "zustand/middleware";
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

// ─── Domain Types ─────────────────────────────────────────────────────────────

export type NodeKind = "core" | "department" | "data" | "feature";
export type TaskType = "prompt" | "tool" | "agent";

/**
 * Yorumlar — Patron veya departman tarafından bir node'a bırakılan notlar.
 * Auth sistemi gelene kadar `author` salt-etiket; kullanıcı hangi rolde
 * çalışıyorsa o yazılır (şimdilik hep "Patron").
 */
export interface NodeComment {
  id: string;
  author: string;
  text: string;
  createdAt: string;
}

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
  /** 'data' / 'feature' düğümleri hangi departmana ait. */
  departmentId?: string;
  description?: string;

  // — Feature/Department alanları —
  taskType?: TaskType;
  instruction?: string;

  // — Yorumlar (her tipte mümkün) —
  comments?: NodeComment[];

  // — Data node alanları —
  fileName?: string;
  fileType?: string;
  uploadStatus?: "idle" | "uploading" | "done" | "error";
  uploadError?: string;
  tabularMeta?: TabularMeta;
  documentFileId?: string;
  documentChunks?: number;
}

export type BrainNode = Node<BrainNodeData>;

type AddableKind = Exclude<NodeKind, "core">;

// View — kullanıcı şu anda hangi seviyede gezdiriliyor?
export type ViewState =
  | { kind: "company" }
  | { kind: "department"; id: string };

/** Backend'e gönderilen aktif düğüm payload'ı — backend `ActiveNodePayload` ile şema-uyumlu olmalı. */
export interface ActiveNodePayload {
  id: string;
  kind: NodeKind;
  label: string;
  description?: string;
  instruction?: string;
  taskType?: TaskType;
  fileName?: string;
  fileType?: string;
  tabularMeta?: TabularMeta;
  documentFileId?: string;
}

export const CORE_NODE_ID = "core_llm";
export const BRAIN_FILE_VERSION = 2 as const;

interface BrainFileV1 {
  version: 1;
  name: string;
  exportedAt: string;
  nodes: BrainNode[];
  edges: Edge[];
}

interface BrainFileV2 {
  version: 2;
  name: string;
  exportedAt: string;
  nodes: BrainNode[];
  edges: Edge[];
  view?: ViewState;
}

type BrainFile = BrainFileV1 | BrainFileV2;

// ─── Store interface ──────────────────────────────────────────────────────────

interface StoreState {
  nodes: BrainNode[];
  edges: Edge[];
  view: ViewState;
  selectedNodeId: string | null;

  // ReactFlow event'leri
  onNodesChange: (changes: NodeChange[]) => void;
  onEdgesChange: (changes: EdgeChange[]) => void;
  onConnect: (connection: Connection) => void;

  // Selection (Inspector için)
  selectNode: (id: string | null) => void;

  // View navigation
  enterDepartment: (id: string) => void;
  exitToCompany: () => void;

  // Node CRUD
  addDepartment: (payload?: Partial<BrainNodeData>) => string;
  addNode: (kind: AddableKind, payload?: Partial<BrainNodeData>) => string;
  toggleActive: (id: string) => void;
  removeNode: (id: string) => void;
  updateNodeData: (id: string, patch: Partial<BrainNodeData>) => void;
  patchNodeData: (id: string, patch: Partial<BrainNodeData>) => void;

  // Comments
  addComment: (nodeId: string, author: string, text: string) => void;
  removeComment: (nodeId: string, commentId: string) => void;

  // Selectors
  getActiveContextForView: () => {
    view: ViewState;
    departmentInstruction?: string;
    departmentLabel?: string;
    activeNodes: ActiveNodePayload[];
    comments: NodeComment[];
  };

  // Persistence
  serializeBrain: (name: string) => string;
  loadBrain: (json: string) => void;
  resetBrain: () => void;

  /** LLM-üretilmiş bir dosyayı bir departmana DataNode olarak ekler. */
  attachGeneratedFileToDepartment: (params: {
    departmentId: string;
    fileId: string;
    filename: string;
    mime: string;
    sourceLabel?: string;
  }) => string;

  /** Mevcut bir veri/görev düğümünü başka bir departmana KOPYALAR (yeni id ile). */
  copyNodeToDepartment: (nodeId: string, targetDepartmentId: string) => string | null;

  /**
   * Bir departmanın (veya Patron'un) edge ile bağlı olduğu departmanların id'lerini döndür.
   * Departmanlar arası dosya/veri transferi için edge zorunluluğunu uygulamak amacıyla kullanılır.
   * `from` "core" ID'si veya bir departman ID'si olabilir.
   */
  getConnectedDepartmentIds: (fromId: string) => string[];
}

// ─── Defaults ─────────────────────────────────────────────────────────────────

const NODE_PRESETS: Record<AddableKind, {
  prefix: string;
  defaultLabel: string;
  defaultDescription: string;
  position: () => { x: number; y: number };
}> = {
  department: {
    prefix: "dept",
    defaultLabel: "Yeni Departman",
    defaultDescription: "Patrona bağlı bir departman.",
    position: () => ({
      x: -260 + Math.random() * 520,
      y: -180 + Math.random() * 360,
    }),
  },
  data: {
    prefix: "data",
    defaultLabel: "Yeni Veri",
    defaultDescription: "PDF, CSV veya metin dosyası",
    position: () => ({
      x: -260 - Math.random() * 120,
      y: -160 + Math.random() * 320,
    }),
  },
  feature: {
    prefix: "feat",
    defaultLabel: "Yeni Görev",
    defaultDescription: "Araç / fonksiyon / sistem promptu",
    position: () => ({
      x: 260 + Math.random() * 120,
      y: -160 + Math.random() * 320,
    }),
  },
};

const initialNodes: BrainNode[] = [
  {
    id: CORE_NODE_ID,
    type: "core",
    position: { x: 0, y: 0 },
    data: {
      label: "Patron LLM",
      kind: "core",
      isActive: true,
      description: "Tüm departmanları gözlemler, müdahale etmeden yorum bırakır.",
      instruction: "",
      comments: [],
    },
  },
];

const safeStorage = createJSONStorage(() =>
  typeof window !== "undefined" ? window.localStorage : (undefined as unknown as Storage),
);

// ─── Helpers ──────────────────────────────────────────────────────────────────

function findNode(nodes: BrainNode[], id: string): BrainNode | undefined {
  return nodes.find((n) => n.id === id);
}

function isLeafKind(kind: NodeKind): kind is "data" | "feature" {
  return kind === "data" || kind === "feature";
}

/**
 * Edge validasyon kuralları (yeni mimari):
 *   - data | feature  →  department          (bir departmanın altına bağlanır)
 *   - department      →  core (Patron)        (departman patrona bağlanır)
 *   - department      ↔  department          (departmanlar arası iletişim)
 *   - leaf → core, leaf → leaf, vs.            (yasak)
 */
function isConnectionAllowed(
  source: BrainNode | undefined,
  target: BrainNode | undefined,
): boolean {
  if (!source || !target) return false;
  if (source.id === target.id) return false;

  const s = source.data.kind;
  const t = target.data.kind;

  // Leaf → kendi departmanı
  if (isLeafKind(s) && t === "department") {
    return source.data.departmentId === target.id;
  }
  // Department → Patron
  if (s === "department" && t === "core") return true;
  // Departmanlar arası
  if (s === "department" && t === "department") return true;
  return false;
}

// ─── Store ────────────────────────────────────────────────────────────────────

export const useStore = create<StoreState>()(
  persist(
    (set, get) => ({
      nodes: initialNodes,
      edges: [],
      view: { kind: "company" },
      selectedNodeId: null,

      onNodesChange: (changes) =>
        set({ nodes: applyNodeChanges(changes, get().nodes) as BrainNode[] }),

      onEdgesChange: (changes) =>
        set({ edges: applyEdgeChanges(changes, get().edges) }),

      onConnect: (connection) => {
        const nodes = get().nodes;
        const source = findNode(nodes, connection.source ?? "");
        const target = findNode(nodes, connection.target ?? "");
        if (!isConnectionAllowed(source, target)) return;

        const exists = get().edges.some(
          (e) => e.source === connection.source && e.target === connection.target,
        );
        if (exists) return;

        set({
          edges: addEdge(
            { ...connection, animated: true, style: { strokeWidth: 2 } },
            get().edges,
          ),
        });
      },

      selectNode: (id) => set({ selectedNodeId: id }),

      enterDepartment: (id) => {
        const dept = findNode(get().nodes, id);
        if (!dept || dept.data.kind !== "department") return;
        set({ view: { kind: "department", id }, selectedNodeId: null });
      },

      exitToCompany: () =>
        set({ view: { kind: "company" }, selectedNodeId: null }),

      addDepartment: (payload = {}) => {
        const preset = NODE_PRESETS.department;
        const id = uid(preset.prefix);
        const newNode: BrainNode = {
          id,
          type: "department",
          position: preset.position(),
          data: {
            label: payload.label ?? preset.defaultLabel,
            kind: "department",
            isActive: true,
            description: payload.description ?? preset.defaultDescription,
            instruction: payload.instruction ?? "",
            comments: payload.comments ?? [],
          },
        };
        set({ nodes: [...get().nodes, newNode] });
        return id;
      },

      addNode: (kind, payload = {}) => {
        if (kind === "department") return get().addDepartment(payload);

        const view = get().view;
        // Veri/Görev sadece bir departmanın altına eklenebilir
        const departmentId =
          payload.departmentId ?? (view.kind === "department" ? view.id : undefined);
        if (!departmentId) {
          console.warn("[Store] data/feature node bir departmana atanmadan eklenemez.");
          return "";
        }

        const preset = NODE_PRESETS[kind];
        const id = uid(preset.prefix);
        const newNode: BrainNode = {
          id,
          type: kind,
          position: preset.position(),
          data: {
            label: payload.label ?? preset.defaultLabel,
            kind,
            isActive: false,
            departmentId,
            description: payload.description ?? preset.defaultDescription,
            taskType: kind === "feature" ? payload.taskType ?? "prompt" : undefined,
            instruction: payload.instruction ?? "",
            comments: payload.comments ?? [],
            fileName: payload.fileName,
            fileType: payload.fileType,
          },
        };
        set({ nodes: [...get().nodes, newNode] });
        return id;
      },

      toggleActive: (id) =>
        set({
          nodes: get().nodes.map((n) =>
            n.id === id ? { ...n, data: { ...n.data, isActive: !n.data.isActive } } : n,
          ),
        }),

      removeNode: (id) => {
        if (id === CORE_NODE_ID) return;
        const node = findNode(get().nodes, id);
        if (!node) return;

        // Departman silinince altındaki tüm leaf'ler de silinir
        const idsToRemove = new Set<string>([id]);
        if (node.data.kind === "department") {
          for (const n of get().nodes) {
            if (n.data.departmentId === id) idsToRemove.add(n.id);
          }
        }

        set({
          nodes: get().nodes.filter((n) => !idsToRemove.has(n.id)),
          edges: get().edges.filter(
            (e) => !idsToRemove.has(e.source) && !idsToRemove.has(e.target),
          ),
          selectedNodeId:
            get().selectedNodeId && idsToRemove.has(get().selectedNodeId!)
              ? null
              : get().selectedNodeId,
          view: (() => {
            const v = get().view;
            return v.kind === "department" && idsToRemove.has(v.id)
              ? { kind: "company" as const }
              : v;
          })(),
        });
      },

      updateNodeData: (id, patch) =>
        set({
          nodes: get().nodes.map((n) =>
            n.id === id ? { ...n, data: { ...n.data, ...patch } } : n,
          ),
        }),

      patchNodeData: (id, patch) => get().updateNodeData(id, patch),

      addComment: (nodeId, author, text) => {
        const trimmed = text.trim();
        if (!trimmed) return;
        const comment: NodeComment = {
          id: uid("c"),
          author,
          text: trimmed,
          createdAt: new Date().toISOString(),
        };
        set({
          nodes: get().nodes.map((n) =>
            n.id === nodeId
              ? { ...n, data: { ...n.data, comments: [...(n.data.comments ?? []), comment] } }
              : n,
          ),
        });
      },

      removeComment: (nodeId, commentId) =>
        set({
          nodes: get().nodes.map((n) =>
            n.id === nodeId
              ? {
                  ...n,
                  data: {
                    ...n.data,
                    comments: (n.data.comments ?? []).filter((c) => c.id !== commentId),
                  },
                }
              : n,
          ),
        }),

      /**
       * Chat'e gönderilecek bağlamı topla.
       * Patron departmana MÜDAHALE ETMEZ — yalnızca yorumları gözlem olarak iletilir.
       */
      getActiveContextForView: () => {
        const { nodes, view } = get();
        if (view.kind === "company") {
          const patron = findNode(nodes, CORE_NODE_ID);
          const departments = nodes.filter(
            (n) => n.data.kind === "department" && n.data.isActive,
          );
          return {
            view,
            departmentInstruction: patron?.data.instruction,
            departmentLabel: patron?.data.label,
            activeNodes: departments.map((d) => ({
              id: d.id,
              kind: d.data.kind,
              label: d.data.label,
              description: d.data.description,
              instruction: d.data.instruction,
            })),
            comments: patron?.data.comments ?? [],
          };
        }

        const dept = findNode(nodes, view.id);
        const leaves = nodes.filter(
          (n) => n.data.departmentId === view.id && n.data.isActive,
        );
        return {
          view,
          departmentInstruction: dept?.data.instruction,
          departmentLabel: dept?.data.label,
          activeNodes: leaves.map<ActiveNodePayload>((n) => ({
            id: n.id,
            kind: n.data.kind,
            label: n.data.label,
            description: n.data.description,
            instruction: n.data.instruction,
            taskType: n.data.taskType,
            fileName: n.data.fileName,
            fileType: n.data.fileType,
            tabularMeta: n.data.tabularMeta,
            documentFileId: n.data.documentFileId,
          })),
          comments: dept?.data.comments ?? [],
        };
      },

      serializeBrain: (name) => {
        const file: BrainFileV2 = {
          version: BRAIN_FILE_VERSION,
          name: name.trim() || "yeni-beyin",
          exportedAt: new Date().toISOString(),
          nodes: get().nodes,
          edges: get().edges,
          view: get().view,
        };
        return JSON.stringify(file, null, 2);
      },

      loadBrain: (json) => {
        let parsed: unknown;
        try {
          parsed = JSON.parse(json);
        } catch {
          throw new Error("Dosya geçerli bir JSON değil.");
        }
        if (!parsed || typeof parsed !== "object") {
          throw new Error("Beyin dosyası boş veya bozuk.");
        }
        const candidate = parsed as Partial<BrainFile>;

        if (candidate.version === 2) {
          if (!Array.isArray(candidate.nodes) || !Array.isArray(candidate.edges)) {
            throw new Error("Beyin dosyası eksik alan içeriyor.");
          }
          const hasCore = candidate.nodes.some((n) => n.id === CORE_NODE_ID);
          const nodes = hasCore
            ? candidate.nodes
            : ([...initialNodes, ...candidate.nodes] as BrainNode[]);
          set({
            nodes,
            edges: candidate.edges,
            view: candidate.view ?? { kind: "company" },
            selectedNodeId: null,
          });
          return;
        }

        if (candidate.version === 1) {
          // v1 → v2 migration: tüm leaf node'ları "Genel" departmana ata
          if (!Array.isArray(candidate.nodes) || !Array.isArray(candidate.edges)) {
            throw new Error("Beyin dosyası eksik alan içeriyor.");
          }
          const generalDeptId = uid("dept");
          const generalDept: BrainNode = {
            id: generalDeptId,
            type: "department",
            position: { x: 220, y: 0 },
            data: {
              label: "Genel",
              kind: "department",
              isActive: true,
              description: "Eski sürüm beyin dosyasından otomatik oluşturuldu.",
              instruction: "",
              comments: [],
            },
          };
          const migratedLeaves = candidate.nodes
            .filter((n) => n.id !== CORE_NODE_ID && (n.data.kind === "data" || n.data.kind === "feature"))
            .map((n) => ({
              ...n,
              data: { ...n.data, departmentId: generalDeptId },
            })) as BrainNode[];
          const core =
            candidate.nodes.find((n) => n.id === CORE_NODE_ID) ?? initialNodes[0];

          // Leaf↔Core eski edge'lerini Department↔Core'a çevir, leaf↔leaf'leri yeni dept'e bağla
          const newEdges: Edge[] = [
            {
              id: uid("e"),
              source: generalDeptId,
              target: CORE_NODE_ID,
              animated: true,
              style: { strokeWidth: 2 },
            },
            ...migratedLeaves.map<Edge>((n) => ({
              id: uid("e"),
              source: n.id,
              target: generalDeptId,
              animated: true,
              style: { strokeWidth: 2 },
            })),
          ];

          set({
            nodes: [core, generalDept, ...migratedLeaves] as BrainNode[],
            edges: newEdges,
            view: { kind: "company" },
            selectedNodeId: null,
          });
          return;
        }

        throw new Error(
          `Desteklenmeyen beyin sürümü: ${candidate.version ?? "bilinmiyor"} (beklenen: ${BRAIN_FILE_VERSION}).`,
        );
      },

      resetBrain: () =>
        set({
          nodes: initialNodes,
          edges: [],
          view: { kind: "company" },
          selectedNodeId: null,
        }),

      attachGeneratedFileToDepartment: ({ departmentId, fileId, filename, mime, sourceLabel }) => {
        const ext = filename.split(".").pop()?.toLowerCase() ?? "dosya";
        const id = uid("data");
        const newNode: BrainNode = {
          id,
          type: "data",
          position: {
            x: -240 + Math.random() * 480,
            y: 80 + Math.random() * 200,
          },
          data: {
            label: filename,
            kind: "data",
            isActive: true,
            departmentId,
            description: sourceLabel
              ? `Üretildi: ${sourceLabel}`
              : "LLM tarafından üretildi.",
            fileName: filename,
            fileType: ext.toUpperCase(),
            uploadStatus: "done",
            // documentFileId ChromaDB chunk'ını ifade ediyor — bu farklı bir dosya tipi.
            // LLM-üretilmiş dosya için `documentFileId` kullanmıyoruz; doğrudan indirilebilir.
            // Fakat aynı alana backend file_id'sini koyup ConversationPanel-tarzı download için
            // tip ayrımı yapmak şu an karmaşık olur — basit tutuyoruz: dosya adı görünür,
            // download'lar ConversationPanel üzerinden yapılır.
            documentChunks: undefined,
            documentFileId: fileId, // download için kullanırız (semantik araması yok)
            tabularMeta: undefined,
            comments: [],
          },
        };
        set({ nodes: [...get().nodes, newNode] });
        return id;
      },

      getConnectedDepartmentIds: (fromId) => {
        const { nodes, edges } = get();
        const result = new Set<string>();
        for (const e of edges) {
          let otherId: string | null = null;
          if (e.source === fromId) otherId = e.target;
          else if (e.target === fromId) otherId = e.source;
          if (!otherId) continue;
          const other = nodes.find((n) => n.id === otherId);
          if (other && other.data.kind === "department") {
            result.add(other.id);
          }
        }
        return [...result];
      },

      copyNodeToDepartment: (nodeId, targetDepartmentId) => {
        const src = findNode(get().nodes, nodeId);
        if (!src) return null;
        const target = findNode(get().nodes, targetDepartmentId);
        if (!target || target.data.kind !== "department") return null;
        const newId = uid(src.data.kind === "data" ? "data" : "feat");
        const newNode: BrainNode = {
          ...src,
          id: newId,
          position: {
            x: src.position.x + 80 + Math.random() * 60,
            y: src.position.y + 60 + Math.random() * 60,
          },
          data: {
            ...src.data,
            departmentId: targetDepartmentId,
            // Yorumlar kaynak düğümde kalsın; kopyada temiz başla
            comments: [],
            description: src.data.description
              ? `${src.data.description}\n(Kaynak: ${src.data.label})`
              : `Kaynak: ${src.data.label}`,
          },
        };
        set({ nodes: [...get().nodes, newNode] });
        return newId;
      },
    }),
    {
      name: "neuro-graph",
      version: 2,
      storage: safeStorage,
      // SSR + persist klasik problemi: server'da default state, client ilk render'da
      // localStorage'tan oku → hydration mismatch. skipHydration ile manuel kontrol;
      // app içinde `useStore.persist.rehydrate()` client mount sonrası çağrılır.
      skipHydration: true,
      partialize: (state) => ({
        nodes: state.nodes,
        edges: state.edges,
        view: state.view,
      }),
      onRehydrateStorage: () => (state) => {
        if (!state) return;
        // Yarım kalan upload'ları error'a çevir
        state.nodes = state.nodes.map((n) =>
          n.data.uploadStatus === "uploading"
            ? {
                ...n,
                data: {
                  ...n.data,
                  uploadStatus: "error",
                  uploadError: "Yarım kalan yükleme — lütfen tekrar deneyin.",
                },
              }
            : n,
        );
      },
    },
  ),
);
