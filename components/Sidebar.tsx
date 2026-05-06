"use client";

import { Database, Sparkles, Brain, Plus } from "lucide-react";
import { useStore } from "@/store/useStore";

export default function Sidebar() {
  const addDataNode = useStore((s) => s.addDataNode);
  const addFeatureNode = useStore((s) => s.addFeatureNode);
  const activeCount = useStore(
    (s) => s.nodes.filter((n) => n.data.kind !== "core" && n.data.isActive).length,
  );
  const totalCount = useStore(
    (s) => s.nodes.filter((n) => n.data.kind !== "core").length,
  );

  return (
    <aside className="absolute left-4 top-4 z-10 w-64 rounded-2xl border border-zinc-800 bg-[#0b0b0f]/90 p-4 backdrop-blur-md">
      <div className="flex items-center gap-2">
        <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-purple-500/15 ring-1 ring-purple-400/40">
          <Brain className="h-4 w-4 text-purple-300" />
        </div>
        <div>
          <div className="text-sm font-semibold text-white">Neuro-Agent</div>
          <div className="text-[11px] text-zinc-500">
            Dinamik Bilgi Grafiği
          </div>
        </div>
      </div>

      <div className="mt-4 grid grid-cols-2 gap-2 rounded-xl border border-zinc-800 bg-black/40 p-2 text-center">
        <div>
          <div className="text-[10px] uppercase tracking-widest text-zinc-500">
            Aktif
          </div>
          <div className="text-lg font-semibold text-emerald-400">
            {activeCount}
          </div>
        </div>
        <div>
          <div className="text-[10px] uppercase tracking-widest text-zinc-500">
            Toplam
          </div>
          <div className="text-lg font-semibold text-zinc-300">
            {totalCount}
          </div>
        </div>
      </div>

      <div className="mt-4 space-y-2">
        <button
          onClick={() => addDataNode()}
          className="group flex w-full items-center justify-between rounded-xl border border-zinc-800 bg-gradient-to-b from-cyan-500/10 to-transparent px-3 py-2.5 text-left transition hover:border-cyan-400/50 hover:from-cyan-500/20"
        >
          <span className="flex items-center gap-2">
            <Database className="h-4 w-4 text-cyan-300" />
            <span className="text-sm text-white">Veri Ekle</span>
          </span>
          <Plus className="h-4 w-4 text-zinc-500 group-hover:text-cyan-300" />
        </button>

        <button
          onClick={() => addFeatureNode()}
          className="group flex w-full items-center justify-between rounded-xl border border-zinc-800 bg-gradient-to-b from-amber-500/10 to-transparent px-3 py-2.5 text-left transition hover:border-amber-400/50 hover:from-amber-500/20"
        >
          <span className="flex items-center gap-2">
            <Sparkles className="h-4 w-4 text-amber-300" />
            <span className="text-sm text-white">Özellik Ekle</span>
          </span>
          <Plus className="h-4 w-4 text-zinc-500 group-hover:text-amber-300" />
        </button>
      </div>

      <p className="mt-4 text-[11px] leading-relaxed text-zinc-500">
        Düğümleri sürükleyip Çekirdek LLM&apos;e bağlayın. Yalnızca{" "}
        <span className="text-emerald-400">aktif</span> düğümler bağlama dahil
        edilir.
      </p>
    </aside>
  );
}
