"use client";

import { Handle, Position, type NodeProps } from "reactflow";
import { Sparkles, Trash2 } from "lucide-react";
import { cn } from "@/lib/utils";
import { useStore, type BrainNodeData } from "@/store/useStore";

export default function FeatureNode({ id, data }: NodeProps<BrainNodeData>) {
  const toggleActive = useStore((s) => s.toggleActive);
  const removeNode = useStore((s) => s.removeNode);

  return (
    <div
      className={cn(
        "group relative w-52 rounded-2xl border bg-[#0b0b0f] p-3 transition-all",
        data.isActive
          ? "border-amber-400/70 shadow-glow-feature"
          : "border-zinc-800 hover:border-zinc-700",
      )}
    >
      <Handle
        type="source"
        position={Position.Left}
        className="!bg-neural-feature"
        id="out"
      />

      <div className="flex items-start gap-2">
        <div
          className={cn(
            "flex h-9 w-9 items-center justify-center rounded-lg ring-1 transition-colors",
            data.isActive
              ? "bg-amber-500/15 ring-amber-400/50"
              : "bg-zinc-900 ring-zinc-800",
          )}
        >
          <Sparkles
            className={cn(
              "h-4 w-4",
              data.isActive ? "text-amber-300" : "text-zinc-400",
            )}
          />
        </div>

        <div className="min-w-0 flex-1">
          <div className="text-[10px] uppercase tracking-widest text-amber-300/70">
            Özellik
          </div>
          <div className="truncate text-sm font-medium text-white">
            {data.label}
          </div>
          {data.description && (
            <div className="truncate text-[11px] text-zinc-500">
              {data.description}
            </div>
          )}
        </div>

        <button
          onClick={() => removeNode(id)}
          className="opacity-0 group-hover:opacity-100 transition rounded p-1 text-zinc-500 hover:bg-zinc-900 hover:text-red-400"
          title="Düğümü sil"
        >
          <Trash2 className="h-3.5 w-3.5" />
        </button>
      </div>

      <label className="mt-3 flex cursor-pointer items-center justify-between rounded-lg border border-zinc-800 bg-black/40 px-2.5 py-1.5">
        <span className="text-[11px] text-zinc-400">Aktif</span>
        <span
          onClick={() => toggleActive(id)}
          className={cn(
            "relative h-4 w-7 rounded-full transition-colors",
            data.isActive ? "bg-amber-400" : "bg-zinc-700",
          )}
        >
          <span
            className={cn(
              "absolute top-0.5 h-3 w-3 rounded-full bg-white transition-all",
              data.isActive ? "left-3.5" : "left-0.5",
            )}
          />
        </span>
      </label>
    </div>
  );
}
