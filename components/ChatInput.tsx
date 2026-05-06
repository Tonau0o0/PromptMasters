"use client";

import { useState } from "react";
import { Send, Cpu } from "lucide-react";
import { useStore } from "@/store/useStore";

export default function ChatInput() {
  const [value, setValue] = useState("");
  const getActiveNodes = useStore((s) => s.getActiveNodes);

  const handleSend = () => {
    const text = value.trim();
    if (!text) return;

    const activeNodes = getActiveNodes();
    const payload = {
      prompt: text,
      activeNodes: activeNodes.map((n) => ({
        id: n.id,
        kind: n.data.kind,
        label: n.data.label,
      })),
    };

    // eslint-disable-next-line no-console
    console.log("[Neuro-Agent] Gönderilecek bağlam:", payload);
    setValue("");
  };

  return (
    <div className="absolute bottom-6 left-1/2 z-10 w-[min(720px,90vw)] -translate-x-1/2">
      <div className="rounded-2xl border border-zinc-800 bg-[#0b0b0f]/90 p-2 backdrop-blur-md shadow-2xl">
        <div className="flex items-center gap-2">
          <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-purple-500/15 ring-1 ring-purple-400/40">
            <Cpu className="h-4 w-4 text-purple-300" />
          </div>
          <input
            value={value}
            onChange={(e) => setValue(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === "Enter" && !e.shiftKey) {
                e.preventDefault();
                handleSend();
              }
            }}
            placeholder="Beyninize bir soru sorun…"
            className="flex-1 bg-transparent px-2 py-2 text-sm text-white placeholder:text-zinc-600 focus:outline-none"
          />
          <button
            onClick={handleSend}
            disabled={!value.trim()}
            className="flex items-center gap-1.5 rounded-lg bg-purple-500 px-3 py-2 text-sm font-medium text-white shadow-glow transition hover:bg-purple-400 disabled:cursor-not-allowed disabled:bg-zinc-800 disabled:text-zinc-600 disabled:shadow-none"
          >
            <Send className="h-3.5 w-3.5" />
            Gönder
          </button>
        </div>
      </div>
      <p className="mt-2 text-center text-[11px] text-zinc-600">
        Aktif düğümler konsola yazılır — token optimizasyonu için yalnızca
        seçili olanlar gönderilir.
      </p>
    </div>
  );
}
