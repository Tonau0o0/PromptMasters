"use client";

import { useState } from "react";
import {
  Database,
  Sparkles,
  Brain,
  Plus,
  Save,
  Upload,
  RotateCcw,
  Building2,
} from "lucide-react";
import { useStore } from "@/store/useStore";
import { useBrainPersistence } from "@/hooks/useBrainPersistence";

export default function Sidebar() {
  const view = useStore((s) => s.view);
  const addNode = useStore((s) => s.addNode);
  const addDepartment = useStore((s) => s.addDepartment);
  const resetBrain = useStore((s) => s.resetBrain);
  const totalNodes = useStore((s) => s.nodes.length);

  // Görünüme göre sayaçlar
  const nodes = useStore((s) => s.nodes);
  const inViewDept = view.kind === "department" ? view.id : null;
  const activeCount =
    view.kind === "company"
      ? nodes.filter((n) => n.data.kind === "department" && n.data.isActive).length
      : nodes.filter(
          (n) => n.data.departmentId === inViewDept && n.data.isActive,
        ).length;
  const totalCount =
    view.kind === "company"
      ? nodes.filter((n) => n.data.kind === "department").length
      : nodes.filter((n) => n.data.departmentId === inViewDept).length;

  const [toast, setToast] = useState<{ type: "ok" | "err"; msg: string } | null>(null);
  const showToast = (type: "ok" | "err", msg: string) => {
    setToast({ type, msg });
    setTimeout(() => setToast(null), 3500);
  };

  const {
    exportBrain,
    importBrain,
    isElectron,
    fileInputRef,
    onBrowserFileSelected,
  } = useBrainPersistence({
    onSuccess: (m) => showToast("ok", m),
    onError: (m) => showToast("err", m),
  });

  const handleReset = () => {
    if (totalNodes <= 1) return; // sadece patron
    const ok = window.confirm(
      "Mevcut beyin temizlenecek (tüm departmanlar dahil). Devam etmeden önce kaydetmek ister misiniz? (Tamam = Sil, İptal = Vazgeç)",
    );
    if (ok) resetBrain();
  };

  return (
    <aside className="absolute left-4 top-4 z-10 w-64 rounded-2xl border border-zinc-800 bg-[#0b0b0f]/90 p-4 backdrop-blur-md">
      {/* Brand */}
      <div className="flex items-center gap-2">
        <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-purple-500/15 ring-1 ring-purple-400/40">
          <Brain className="h-4 w-4 text-purple-300" />
        </div>
        <div>
          <div className="text-sm font-semibold text-white">Neuro-Agent</div>
          <div className="text-[11px] text-zinc-500">
            {view.kind === "company" ? "Şirket Beyni" : "Departman Beyni"}
          </div>
        </div>
      </div>

      {/* Stats */}
      <div className="mt-4 grid grid-cols-2 gap-2 rounded-xl border border-zinc-800 bg-black/40 p-2 text-center">
        <div>
          <div className="text-[10px] uppercase tracking-widest text-zinc-500">Aktif</div>
          <div className="text-lg font-semibold text-emerald-400">{activeCount}</div>
        </div>
        <div>
          <div className="text-[10px] uppercase tracking-widest text-zinc-500">Toplam</div>
          <div className="text-lg font-semibold text-zinc-300">{totalCount}</div>
        </div>
      </div>

      {/* Add buttons — view-aware */}
      <div className="mt-4 space-y-2">
        {view.kind === "company" ? (
          <button
            onClick={() => addDepartment()}
            className="group flex w-full items-center justify-between rounded-xl border border-zinc-800 bg-gradient-to-b from-purple-500/10 to-transparent px-3 py-2.5 text-left transition hover:border-purple-400/50 hover:from-purple-500/20"
          >
            <span className="flex items-center gap-2">
              <Building2 className="h-4 w-4 text-purple-300" />
              <span className="text-sm text-white">Departman Ekle</span>
            </span>
            <Plus className="h-4 w-4 text-zinc-500 group-hover:text-purple-300" />
          </button>
        ) : (
          <>
            <button
              onClick={() => addNode("data")}
              className="group flex w-full items-center justify-between rounded-xl border border-zinc-800 bg-gradient-to-b from-cyan-500/10 to-transparent px-3 py-2.5 text-left transition hover:border-cyan-400/50 hover:from-cyan-500/20"
            >
              <span className="flex items-center gap-2">
                <Database className="h-4 w-4 text-cyan-300" />
                <span className="text-sm text-white">Veri Ekle</span>
              </span>
              <Plus className="h-4 w-4 text-zinc-500 group-hover:text-cyan-300" />
            </button>

            <button
              onClick={() => addNode("feature")}
              className="group flex w-full items-center justify-between rounded-xl border border-zinc-800 bg-gradient-to-b from-amber-500/10 to-transparent px-3 py-2.5 text-left transition hover:border-amber-400/50 hover:from-amber-500/20"
            >
              <span className="flex items-center gap-2">
                <Sparkles className="h-4 w-4 text-amber-300" />
                <span className="text-sm text-white">Görev Ekle</span>
              </span>
              <Plus className="h-4 w-4 text-zinc-500 group-hover:text-amber-300" />
            </button>
          </>
        )}
      </div>

      {/* Brain persistence */}
      <div className="mt-4 rounded-xl border border-zinc-800 bg-black/40 p-2">
        <div className="px-1 pb-1.5 text-[10px] uppercase tracking-widest text-zinc-500">
          Beyin Mimarisi
        </div>

        <div className="grid grid-cols-2 gap-1.5">
          <button
            onClick={() => exportBrain("yeni-beyin")}
            className="flex items-center justify-center gap-1.5 rounded-lg border border-zinc-800 bg-purple-500/5 px-2 py-2 text-[11px] text-zinc-200 transition hover:border-purple-400/50 hover:bg-purple-500/15"
            title="Beyni .brain.json olarak kaydet"
          >
            <Save className="h-3 w-3 text-purple-300" />
            Kaydet
          </button>

          <button
            onClick={importBrain}
            className="flex items-center justify-center gap-1.5 rounded-lg border border-zinc-800 bg-cyan-500/5 px-2 py-2 text-[11px] text-zinc-200 transition hover:border-cyan-400/50 hover:bg-cyan-500/15"
            title="Bir .brain.json dosyasını yükle"
          >
            <Upload className="h-3 w-3 text-cyan-300" />
            Yükle
          </button>
        </div>

        <button
          onClick={handleReset}
          disabled={totalNodes <= 1}
          className="mt-1.5 flex w-full items-center justify-center gap-1.5 rounded-lg border border-zinc-800 px-2 py-1.5 text-[10px] text-zinc-500 transition hover:border-red-500/40 hover:text-red-300 disabled:cursor-not-allowed disabled:opacity-40 disabled:hover:border-zinc-800 disabled:hover:text-zinc-500"
          title="Beyni sıfırla (sadece Patron kalır)"
        >
          <RotateCcw className="h-3 w-3" />
          Sıfırla
        </button>

        {!isElectron && (
          <input
            ref={fileInputRef}
            type="file"
            accept=".json,application/json"
            className="hidden"
            onChange={onBrowserFileSelected}
          />
        )}
      </div>

      {toast && (
        <div
          className={
            toast.type === "ok"
              ? "mt-3 rounded-lg border border-emerald-500/30 bg-emerald-500/10 px-2.5 py-1.5 text-[11px] text-emerald-300"
              : "mt-3 rounded-lg border border-red-500/30 bg-red-500/10 px-2.5 py-1.5 text-[11px] text-red-300"
          }
        >
          {toast.msg}
        </div>
      )}

      <p className="mt-4 text-[11px] leading-relaxed text-zinc-500">
        {view.kind === "company"
          ? "Departmanlara çift tıklayarak içlerine girin. Patron yalnızca gözlemler ve yorum bırakır."
          : "Düğümleri sürükleyip departman LLM'ine bağlayın. Yalnızca aktif düğümler bağlama dahil edilir."}
      </p>
    </aside>
  );
}
