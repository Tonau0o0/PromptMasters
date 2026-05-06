"use client";

import { create } from "zustand";
import { uid } from "@/lib/utils";

export interface GeneratedFile {
  file_id: string;
  filename: string;
  mime: string;
}

export interface ChatTurn {
  id: string;
  role: "user" | "assistant" | "error";
  content: string;
  /** Hangi view'da soruldu (Şirket/Departman) */
  scope?: string;
  /** Üretildiği kaynak: departman id'si veya "core" (Patron). Departmanlar arası transferde kullanılır. */
  sourceId?: string;
  /** Token bilgisi (yalnızca assistant için) */
  inputTokens?: number;
  outputTokens?: number;
  model?: string;
  /** LLM tarafından üretilen indirilebilir dosyalar */
  generatedFiles?: GeneratedFile[];
  createdAt: string;
}

interface ChatStoreState {
  turns: ChatTurn[];
  isSending: boolean;
  panelOpen: boolean;

  appendUser: (content: string, scope?: string, sourceId?: string) => string;
  appendAssistant: (
    content: string,
    extras?: {
      inputTokens?: number;
      outputTokens?: number;
      model?: string;
      scope?: string;
      sourceId?: string;
      generatedFiles?: GeneratedFile[];
    },
  ) => void;
  appendError: (content: string, scope?: string, sourceId?: string) => void;
  setSending: (b: boolean) => void;
  setPanelOpen: (b: boolean) => void;
  clear: () => void;
}

export const useChatStore = create<ChatStoreState>((set) => ({
  turns: [],
  isSending: false,
  panelOpen: false,

  appendUser: (content, scope, sourceId) => {
    const id = uid("u");
    set((s) => ({
      turns: [
        ...s.turns,
        { id, role: "user", content, scope, sourceId, createdAt: new Date().toISOString() },
      ],
      panelOpen: true,
    }));
    return id;
  },

  appendAssistant: (content, extras) =>
    set((s) => ({
      turns: [
        ...s.turns,
        {
          id: uid("a"),
          role: "assistant",
          content,
          createdAt: new Date().toISOString(),
          ...extras,
        },
      ],
    })),

  appendError: (content, scope, sourceId) =>
    set((s) => ({
      turns: [
        ...s.turns,
        {
          id: uid("e"),
          role: "error",
          content,
          scope,
          sourceId,
          createdAt: new Date().toISOString(),
        },
      ],
    })),

  setSending: (b) => set({ isSending: b }),
  setPanelOpen: (b) => set({ panelOpen: b }),
  clear: () => set({ turns: [], panelOpen: false }),
}));
