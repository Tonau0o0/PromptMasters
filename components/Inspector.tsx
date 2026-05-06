"use client";

import { useEffect, useMemo, useState } from "react";
import {
  Building2,
  Database,
  Sparkles,
  Brain,
  X,
  MessageSquare,
  Trash2,
  Send,
  Copy,
} from "lucide-react";
import { useStore, type TaskType, type NodeKind } from "@/store/useStore";
import { cn } from "@/lib/utils";

const KIND_META: Record<NodeKind, { label: string; icon: typeof Brain; color: string }> = {
  core: { label: "Patron LLM", icon: Brain, color: "text-purple-300" },
  department: { label: "Departman", icon: Building2, color: "text-purple-300" },
  data: { label: "Veri", icon: Database, color: "text-cyan-300" },
  feature: { label: "Görev", icon: Sparkles, color: "text-amber-300" },
};

const TASK_TYPES: { value: TaskType; label: string; hint: string }[] = [
  { value: "prompt", label: "Sistem Promptu", hint: "LLM'e davranış talimatı verir" },
  { value: "tool", label: "Araç / Fonksiyon", hint: "Çağrılabilir bir yardımcı (web arama, hesap)" },
  { value: "agent", label: "Alt-Agent", hint: "Kendi başına LLM çağrısı yapar" },
];

export default function Inspector() {
  const selectedId = useStore((s) => s.selectedNodeId);
  const node = useStore((s) =>
    selectedId ? s.nodes.find((n) => n.id === selectedId) ?? null : null,
  );
  const updateNodeData = useStore((s) => s.updateNodeData);
  const addComment = useStore((s) => s.addComment);
  const removeComment = useStore((s) => s.removeComment);
  const selectNode = useStore((s) => s.selectNode);
  const copyNodeToDepartment = useStore((s) => s.copyNodeToDepartment);
  const allDepartments = useStore((s) =>
    s.nodes.filter((n) => n.data.kind === "department"),
  );
  const getConnectedDepartmentIds = useStore((s) => s.getConnectedDepartmentIds);

  const [commentDraft, setCommentDraft] = useState("");
  const [transferOpen, setTransferOpen] = useState(false);

  // Seçim değişince transfer menüsünü kapat
  useEffect(() => {
    setTransferOpen(false);
  }, [selectedId]);

  // Seçim değişince yorum draft'ı sıfırla
  useEffect(() => {
    setCommentDraft("");
  }, [selectedId]);

  const meta = useMemo(() => (node ? KIND_META[node.data.kind] : null), [node]);

  if (!node || !meta) {
    return (
      <div className="absolute bottom-0 left-0 right-0 z-10 flex h-8 items-center justify-center border-t border-zinc-800 bg-[#0b0b0f]/95 text-[11px] text-zinc-600 backdrop-blur-md">
        Bir düğüme tıklayarak detaylarını düzenleyin
      </div>
    );
  }

  const Icon = meta.icon;
  const data = node.data;
  const kind = data.kind;

  const handlePatch = (patch: Parameters<typeof updateNodeData>[1]) =>
    updateNodeData(node.id, patch);

  const handleSubmitComment = () => {
    const text = commentDraft.trim();
    if (!text) return;
    // Auth gelene kadar Patron etiketi
    addComment(node.id, "Patron", text);
    setCommentDraft("");
  };

  return (
    <div className="absolute bottom-0 left-0 right-0 z-10 max-h-[40vh] overflow-y-auto border-t border-zinc-800 bg-[#0b0b0f]/95 backdrop-blur-md">
      <div className="mx-auto max-w-5xl px-4 py-3">
        {/* Header */}
        <div className="mb-3 flex items-center gap-2">
          <div className="flex h-7 w-7 items-center justify-center rounded-lg bg-zinc-900 ring-1 ring-zinc-800">
            <Icon className={cn("h-3.5 w-3.5", meta.color)} />
          </div>
          <div className="flex-1">
            <div className="text-[10px] uppercase tracking-widest text-zinc-500">
              {meta.label}
            </div>
            <div className="text-sm font-medium text-white">{data.label}</div>
          </div>
          {/* Veri/Görev için: başka departmana kopyala — sadece edge ile bağlı departmanlara */}
          {(kind === "data" || kind === "feature") && data.departmentId && (() => {
            const connectedIds = new Set(
              getConnectedDepartmentIds(data.departmentId),
            );
            const targets = allDepartments.filter(
              (d) => connectedIds.has(d.id) && d.id !== data.departmentId,
            );
            return (
              <div className="relative">
                <button
                  onClick={() => setTransferOpen((o) => !o)}
                  className="flex items-center gap-1 rounded-md border border-zinc-800 bg-black/40 px-2 py-1 text-[10.5px] text-purple-200 transition hover:border-purple-400/50 hover:bg-purple-500/10"
                  title="Başka departmana kopyala (edge gerektirir)"
                >
                  <Copy className="h-3 w-3" />
                  Departmana Kopyala
                </button>
                {transferOpen && (
                  <div className="absolute right-0 top-full z-20 mt-1 w-56 overflow-hidden rounded-lg border border-zinc-800 bg-[#0b0b0f] shadow-xl">
                    {targets.length > 0 ? (
                      targets.map((d) => (
                        <button
                          key={d.id}
                          onClick={() => {
                            copyNodeToDepartment(node.id, d.id);
                            setTransferOpen(false);
                          }}
                          className="flex w-full items-center gap-1.5 border-b border-zinc-900 px-2.5 py-1.5 text-left text-[11px] text-zinc-300 last:border-b-0 hover:bg-zinc-900 hover:text-white"
                        >
                          <Building2 className="h-3 w-3 text-purple-300" />
                          <span className="truncate">{d.data.label}</span>
                        </button>
                      ))
                    ) : (
                      <div className="px-2.5 py-2 text-[10.5px] leading-relaxed text-zinc-500">
                        Bu departmanın bağlı olduğu başka departman yok.
                        Şirket görünümünde önce bir bağlantı (edge) çekin.
                      </div>
                    )}
                  </div>
                )}
              </div>
            );
          })()}

          <button
            onClick={() => selectNode(null)}
            className="rounded p-1 text-zinc-500 transition hover:bg-zinc-900 hover:text-zinc-200"
            title="Paneli kapat"
          >
            <X className="h-3.5 w-3.5" />
          </button>
        </div>

        <div className="grid grid-cols-1 gap-3 md:grid-cols-2">
          {/* ── Sol kolon: Tanım ── */}
          <div className="space-y-2">
            <Field label="Etiket">
              <input
                value={data.label}
                onChange={(e) => handlePatch({ label: e.target.value })}
                className="w-full rounded-lg border border-zinc-800 bg-black/40 px-2.5 py-1.5 text-[12px] text-white outline-none transition focus:border-purple-400/50"
              />
            </Field>

            <Field label="Açıklama">
              <input
                value={data.description ?? ""}
                onChange={(e) => handlePatch({ description: e.target.value })}
                placeholder="Kısa açıklama"
                className="w-full rounded-lg border border-zinc-800 bg-black/40 px-2.5 py-1.5 text-[12px] text-white outline-none transition focus:border-purple-400/50"
              />
            </Field>

            {/* Görev türü — sadece feature node */}
            {kind === "feature" && (
              <Field label="Görev Türü">
                <div className="grid grid-cols-3 gap-1.5">
                  {TASK_TYPES.map((t) => {
                    const active = (data.taskType ?? "prompt") === t.value;
                    return (
                      <button
                        key={t.value}
                        onClick={() => handlePatch({ taskType: t.value })}
                        className={cn(
                          "rounded-lg border px-2 py-1.5 text-[10px] transition",
                          active
                            ? "border-amber-400/60 bg-amber-500/10 text-amber-200"
                            : "border-zinc-800 bg-black/30 text-zinc-400 hover:border-zinc-700 hover:text-zinc-200",
                        )}
                        title={t.hint}
                      >
                        {t.label}
                      </button>
                    );
                  })}
                </div>
              </Field>
            )}

            {/* Aktif/pasif — leaf ve department için */}
            {(kind === "data" || kind === "feature" || kind === "department") && (
              <Field label="Durum">
                <button
                  onClick={() =>
                    useStore.getState().toggleActive(node.id)
                  }
                  className={cn(
                    "flex items-center gap-2 rounded-lg border px-2.5 py-1.5 text-[11px] transition",
                    data.isActive
                      ? "border-emerald-400/40 bg-emerald-500/10 text-emerald-300"
                      : "border-zinc-800 bg-black/30 text-zinc-400 hover:border-zinc-700",
                  )}
                >
                  <span
                    className={cn(
                      "h-2 w-2 rounded-full",
                      data.isActive ? "bg-emerald-400" : "bg-zinc-600",
                    )}
                  />
                  {data.isActive ? "Aktif" : "Pasif"}
                </button>
              </Field>
            )}
          </div>

          {/* ── Sağ kolon: Talimat (instruction) — core/department/feature için ── */}
          {(kind === "core" || kind === "department" || kind === "feature") && (
            <Field
              label={
                kind === "core"
                  ? "Patron Sistem Promptu (yalnızca Şirket sohbetinde kullanılır)"
                  : kind === "department"
                  ? "Departman Sistem Promptu (departman sohbetinde kullanılır)"
                  : "Talimat"
              }
            >
              <textarea
                value={data.instruction ?? ""}
                onChange={(e) => handlePatch({ instruction: e.target.value })}
                rows={kind === "feature" ? 4 : 5}
                placeholder={
                  kind === "core"
                    ? "Örn: Sen şirketin CEO'susun. Departmanlar arası dengeyi gözet…"
                    : kind === "department"
                    ? "Örn: Sen HR uzmanısın. Bordro, işe alım ve çalışan ilişkileriyle ilgilen…"
                    : "Örn: Müşteri verisini analiz et ve aylık raporu hazırla…"
                }
                className="w-full rounded-lg border border-zinc-800 bg-black/40 px-2.5 py-1.5 text-[12px] text-zinc-100 outline-none transition focus:border-purple-400/50"
              />
            </Field>
          )}
        </div>

        {/* ── Yorumlar ── */}
        <div className="mt-4 rounded-xl border border-zinc-800 bg-black/30 p-2.5">
          <div className="mb-2 flex items-center gap-1.5 text-[10px] uppercase tracking-widest text-zinc-500">
            <MessageSquare className="h-3 w-3" />
            Yorumlar
            {(data.comments?.length ?? 0) > 0 && (
              <span className="rounded bg-amber-500/15 px-1 text-amber-300">
                {data.comments!.length}
              </span>
            )}
          </div>

          {(data.comments?.length ?? 0) === 0 && (
            <p className="px-1 pb-1 text-[11px] text-zinc-600">Henüz yorum yok.</p>
          )}

          <ul className="space-y-1.5">
            {(data.comments ?? []).map((c) => (
              <li
                key={c.id}
                className="group flex items-start gap-2 rounded-lg border border-zinc-800 bg-black/40 px-2 py-1.5"
              >
                <div className="flex-1">
                  <div className="flex items-center gap-1.5 text-[10px] text-zinc-500">
                    <span className="font-medium text-purple-300">{c.author}</span>
                    <span>·</span>
                    <span>{new Date(c.createdAt).toLocaleString("tr-TR")}</span>
                  </div>
                  <p className="text-[12px] text-zinc-200">{c.text}</p>
                </div>
                <button
                  onClick={() => removeComment(node.id, c.id)}
                  className="rounded p-0.5 text-zinc-600 opacity-0 transition group-hover:opacity-100 hover:text-red-400"
                  title="Yorumu sil"
                >
                  <Trash2 className="h-3 w-3" />
                </button>
              </li>
            ))}
          </ul>

          <div className="mt-2 flex items-center gap-1.5">
            <input
              value={commentDraft}
              onChange={(e) => setCommentDraft(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === "Enter" && !e.shiftKey) {
                  e.preventDefault();
                  handleSubmitComment();
                }
              }}
              placeholder="Yorum yaz (Patron tarafından gözlem notu)…"
              className="flex-1 rounded-lg border border-zinc-800 bg-black/40 px-2.5 py-1.5 text-[12px] text-white outline-none transition focus:border-purple-400/50"
            />
            <button
              onClick={handleSubmitComment}
              disabled={!commentDraft.trim()}
              className="flex items-center gap-1 rounded-lg bg-purple-500 px-2.5 py-1.5 text-[11px] font-medium text-white transition hover:bg-purple-400 disabled:cursor-not-allowed disabled:bg-zinc-800 disabled:text-zinc-600"
            >
              <Send className="h-3 w-3" />
              Gönder
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <label className="block">
      <div className="mb-1 text-[10px] uppercase tracking-widest text-zinc-500">{label}</div>
      {children}
    </label>
  );
}
