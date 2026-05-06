"use client";

import { Handle, Position, type NodeProps } from "reactflow";
import { Building2, Trash2 } from "lucide-react";
import { cn } from "@/lib/utils";
import { useStore, type BrainNodeData } from "@/store/useStore";

export default function DepartmentNode({ id, data }: NodeProps<BrainNodeData>) {
  const enterDepartment = useStore((s) => s.enterDepartment);
  const removeNode = useStore((s) => s.removeNode);
  const toggleActive = useStore((s) => s.toggleActive);

  const handleOpen = () => enterDepartment(id);

  return (
    <div
      onDoubleClick={handleOpen}
      className={cn(
        "group relative flex h-32 w-32 cursor-pointer flex-col items-center justify-center rounded-full border-2 transition-all",
        "bg-gradient-to-b from-zinc-900 to-black",
        data.isActive
          ? "border-purple-400/70 shadow-glow"
          : "border-zinc-800 hover:border-zinc-700",
      )}
      title="Departmana girmek için çift tıklayın"
    >
      {/* Patron'a giden bağlantı (üst) */}
      <Handle
        type="source"
        position={Position.Top}
        className="!bg-neural-core"
        id="to-core"
      />
      {/* Departmanlar arası iletişim için yan portlar */}
      <Handle
        type="source"
        position={Position.Left}
        className="!bg-amber-400"
        id="dept-l"
      />
      <Handle
        type="target"
        position={Position.Right}
        className="!bg-amber-400"
        id="dept-r"
      />
      {/* Leaf node'ların geleceği alt port */}
      <Handle
        type="target"
        position={Position.Bottom}
        className="!bg-cyan-400"
        id="from-leaf"
      />

      <Building2 className={cn("h-7 w-7", data.isActive ? "text-purple-300" : "text-zinc-500")} />
      <div className="mt-1 max-w-[6rem] truncate text-center text-[11px] font-medium text-white">
        {data.label}
      </div>

      {/* Aktif/pasif nokta */}
      <span
        className={cn(
          "absolute right-3 top-3 h-2 w-2 rounded-full transition-colors",
          data.isActive ? "bg-emerald-400 shadow-[0_0_8px_rgba(52,211,153,0.8)]" : "bg-zinc-600",
        )}
        onClick={(e) => {
          e.stopPropagation();
          toggleActive(id);
        }}
        title={data.isActive ? "Aktif (kapatmak için tıklayın)" : "Pasif (açmak için tıklayın)"}
      />

      {/* Yorum sayısı rozeti */}
      {(data.comments?.length ?? 0) > 0 && (
        <span className="absolute left-3 top-3 rounded-full bg-amber-500/20 px-1.5 py-px text-[9px] font-medium text-amber-300 ring-1 ring-amber-400/40">
          {data.comments!.length}
        </span>
      )}

      {/* Sil butonu */}
      <button
        onClick={(e) => {
          e.stopPropagation();
          if (confirm("Bu departman ve içindeki tüm görev/veriler silinecek. Emin misiniz?")) {
            removeNode(id);
          }
        }}
        className="absolute -bottom-2 right-1 rounded-full bg-zinc-900 p-1 text-zinc-500 opacity-0 ring-1 ring-zinc-800 transition group-hover:opacity-100 hover:text-red-400"
        title="Departmanı sil"
      >
        <Trash2 className="h-3 w-3" />
      </button>
    </div>
  );
}
