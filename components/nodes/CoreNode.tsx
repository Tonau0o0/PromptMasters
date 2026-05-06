"use client";

import { Handle, Position, type NodeProps } from "reactflow";
import { Brain } from "lucide-react";
import { cn } from "@/lib/utils";
import type { BrainNodeData } from "@/store/useStore";

export default function CoreNode({ data }: NodeProps<BrainNodeData>) {
  return (
    <div
      className={cn(
        "relative w-56 rounded-2xl border border-purple-500/40 bg-gradient-to-b from-[#1a1030] to-[#0b0b0f] p-4 shadow-glow",
      )}
    >
      <div className="absolute inset-0 -z-10 rounded-2xl bg-purple-500/10 blur-2xl animate-pulseGlow" />

      <Handle
        type="target"
        position={Position.Left}
        className="!bg-neural-core"
        id="in"
      />
      <Handle
        type="target"
        position={Position.Right}
        className="!bg-neural-core"
        id="in-r"
      />

      <div className="flex items-center gap-3">
        <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-purple-500/20 ring-1 ring-purple-400/40">
          <Brain className="h-5 w-5 text-purple-300" />
        </div>
        <div>
          <div className="text-xs uppercase tracking-widest text-purple-300/80">
            Çekirdek
          </div>
          <div className="text-sm font-semibold text-white">{data.label}</div>
        </div>
      </div>

      <p className="mt-3 text-xs text-zinc-400 leading-relaxed">
        {data.description ?? "Bağlanan aktif düğümlerden gelen bağlam ile yanıt üretir."}
      </p>

      <div className="mt-3 flex items-center gap-2 text-[11px] text-emerald-400">
        <span className="inline-block h-2 w-2 rounded-full bg-emerald-400 shadow-[0_0_8px_rgba(52,211,153,0.8)]" />
        Çevrimiçi
      </div>
    </div>
  );
}
