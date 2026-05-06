"use client";

import { useRef } from "react";
import { Handle, Position, type NodeProps } from "reactflow";
import {
  FileText,
  Trash2,
  FolderOpen,
  UploadCloud,
  Loader2,
  AlertTriangle,
  CheckCircle2,
  Table2,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { useStore, type BrainNodeData } from "@/store/useStore";
import { useFileUpload } from "@/hooks/useFileUpload";

export default function DataNode({ id, data }: NodeProps<BrainNodeData>) {
  const toggleActive = useStore((s) => s.toggleActive);
  const removeNode   = useStore((s) => s.removeNode);
  const { openNativeDialog, uploadFile, isElectron } = useFileUpload(id);
  const inputRef = useRef<HTMLInputElement>(null);

  const isUploading = data.uploadStatus === "uploading";
  const isDone      = data.uploadStatus === "done";
  const isError     = data.uploadStatus === "error";
  const isActive    = isDone && data.isActive;

  return (
    <div
      className={cn(
        "group relative w-64 rounded-2xl border bg-[#0b0b0f] p-3 transition-all",
        isActive
          ? "border-cyan-400/70 shadow-glow-data"
          : "border-zinc-800 hover:border-zinc-700",
      )}
    >
      <Handle type="source" position={Position.Right} className="!bg-neural-data" id="out" />

      {/* ── Header ── */}
      <div className="flex items-start gap-2">
        <div
          className={cn(
            "flex h-9 w-9 shrink-0 items-center justify-center rounded-lg ring-1 transition-colors",
            isActive ? "bg-cyan-500/15 ring-cyan-400/50" : "bg-zinc-900 ring-zinc-800",
          )}
        >
          {isUploading ? (
            <Loader2 className="h-4 w-4 animate-spin text-cyan-300" />
          ) : isDone ? (
            <FileText className={cn("h-4 w-4", isActive ? "text-cyan-300" : "text-zinc-400")} />
          ) : (
            <UploadCloud className="h-4 w-4 text-zinc-500" />
          )}
        </div>

        <div className="min-w-0 flex-1">
          <div className="text-[10px] uppercase tracking-widest text-cyan-300/70">
            Veri · {data.fileType ?? "Dosya"}
          </div>
          <div className="truncate text-sm font-medium text-white">{data.label}</div>
          {data.fileName && (
            <div className="truncate text-[11px] text-zinc-500">{data.fileName}</div>
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

      {/* ── Upload zone (shown until done) ── */}
      {!isDone && (
        <>
          {/* Hidden browser file input (non-Electron fallback) */}
          {!isElectron && (
            <input
              ref={inputRef}
              type="file"
              accept=".csv,.xlsx,.xls,.pdf,.docx,.doc"
              className="hidden"
              onChange={(e) => {
                const file = e.target.files?.[0];
                if (file) uploadFile(file);
                e.target.value = "";
              }}
            />
          )}

          <button
            onClick={isElectron ? openNativeDialog : () => inputRef.current?.click()}
            disabled={isUploading}
            className={cn(
              "mt-3 flex w-full items-center justify-center gap-1.5 rounded-lg border border-dashed py-2 text-[11px] transition",
              isUploading
                ? "cursor-not-allowed border-zinc-700 text-zinc-600"
                : "border-zinc-700 text-zinc-400 hover:border-cyan-500/50 hover:text-cyan-300",
            )}
          >
            {isUploading ? (
              <><Loader2 className="h-3 w-3 animate-spin" /> Yükleniyor…</>
            ) : isElectron ? (
              <><FolderOpen className="h-3 w-3" /> Dosya Seç…</>
            ) : (
              <><UploadCloud className="h-3 w-3" /> Dosya Seç (CSV / XLSX / PDF)</>
            )}
          </button>

          {isElectron && !isUploading && (
            <p className="mt-1 text-center text-[10px] text-zinc-600">
              Yerel disk — dosya kopyalanmaz
            </p>
          )}
        </>
      )}

      {/* ── Error ── */}
      {isError && (
        <div className="mt-2 flex items-start gap-1.5 rounded-lg bg-red-500/10 px-2 py-1.5 text-[11px] text-red-400 ring-1 ring-red-500/30">
          <AlertTriangle className="mt-px h-3 w-3 shrink-0" />
          <span>{data.uploadError}</span>
        </div>
      )}

      {/* ── Tabular metadata preview ── */}
      {isDone && data.tabularMeta && (
        <div className="mt-3 space-y-1.5 rounded-lg border border-zinc-800 bg-black/40 px-2.5 py-2">
          <div className="flex items-center gap-1.5 text-[10px] uppercase tracking-widest text-cyan-300/70">
            <Table2 className="h-3 w-3" />
            <span>Şema Önizleme</span>
            <CheckCircle2 className="ml-auto h-3 w-3 text-emerald-400" />
          </div>
          <p className="text-[11px] text-zinc-400">
            <span className="text-white">{data.tabularMeta.toplam_satir}</span> satır ·{" "}
            <span className="text-white">{data.tabularMeta.toplam_sutun}</span> sütun
          </p>
          <p className="text-[11px] leading-relaxed text-zinc-500">
            <span className="text-zinc-300">Sütunlar: </span>
            {data.tabularMeta.sutun_adlari.slice(0, 5).join(", ")}
            {data.tabularMeta.sutun_adlari.length > 5 && (
              <span className="text-zinc-600">
                {" "}+{data.tabularMeta.sutun_adlari.length - 5} daha
              </span>
            )}
          </p>
        </div>
      )}

      {/* ── Document / vector-store preview ── */}
      {isDone && data.documentFileId && (
        <div className="mt-3 space-y-1.5 rounded-lg border border-zinc-800 bg-black/40 px-2.5 py-2">
          <div className="flex items-center gap-1.5 text-[10px] uppercase tracking-widest text-cyan-300/70">
            <FileText className="h-3 w-3" />
            <span>Vektör Deposu</span>
            <CheckCircle2 className="ml-auto h-3 w-3 text-emerald-400" />
          </div>
          <p className="text-[11px] text-zinc-400">
            <span className="text-white">{data.documentChunks}</span> parçaya bölündü ·
            Semantik arama hazır
          </p>
          <p className="truncate text-[10px] text-zinc-600">
            ID: {data.documentFileId.slice(0, 20)}…
          </p>
        </div>
      )}

      {/* ── Active toggle ── */}
      <label
        className={cn(
          "mt-3 flex cursor-pointer items-center justify-between rounded-lg border border-zinc-800 bg-black/40 px-2.5 py-1.5",
          !isDone && "opacity-40 cursor-not-allowed",
        )}
      >
        <span className="text-[11px] text-zinc-400">
          {isDone ? "Aktif" : "Önce dosya yükleyin"}
        </span>
        <span
          onClick={() => isDone && toggleActive(id)}
          className={cn(
            "relative h-4 w-7 rounded-full transition-colors",
            isActive ? "bg-cyan-400" : "bg-zinc-700",
          )}
        >
          <span
            className={cn(
              "absolute top-0.5 h-3 w-3 rounded-full bg-white transition-all",
              isActive ? "left-3.5" : "left-0.5",
            )}
          />
        </span>
      </label>
    </div>
  );
}
