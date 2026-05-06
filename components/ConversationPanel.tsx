"use client";

import { useEffect, useRef, useState } from "react";
import {
  Bot,
  User,
  AlertTriangle,
  X,
  MessageCircle,
  Trash2,
  Download,
  FileSpreadsheet,
  FileText,
  FileType,
  Send,
  Building2,
} from "lucide-react";
import { useChatStore, type ChatTurn, type GeneratedFile } from "@/store/useChatStore";
import { useStore } from "@/store/useStore";

const API = process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:8000";

export default function ConversationPanel() {
  const turns = useChatStore((s) => s.turns);
  const panelOpen = useChatStore((s) => s.panelOpen);
  const setPanelOpen = useChatStore((s) => s.setPanelOpen);
  const isSending = useChatStore((s) => s.isSending);
  const clear = useChatStore((s) => s.clear);

  const scrollRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
  }, [turns.length, isSending]);

  if (!panelOpen) {
    if (turns.length === 0) return null;
    return (
      <button
        onClick={() => setPanelOpen(true)}
        className="absolute right-4 top-20 z-10 flex items-center gap-1.5 rounded-l-xl border border-r-0 border-zinc-800 bg-[#0b0b0f]/90 px-3 py-2 text-[11px] text-zinc-300 backdrop-blur-md transition hover:border-purple-400/50 hover:text-white"
        title="Sohbeti aç"
      >
        <MessageCircle className="h-3.5 w-3.5 text-purple-300" />
        Sohbet ({turns.length})
      </button>
    );
  }

  return (
    <aside className="absolute right-4 top-16 bottom-24 z-10 flex w-[400px] flex-col rounded-2xl border border-zinc-800 bg-[#0b0b0f]/95 backdrop-blur-md">
      <div className="flex items-center gap-2 border-b border-zinc-800 px-3 py-2">
        <MessageCircle className="h-3.5 w-3.5 text-purple-300" />
        <div className="flex-1 text-[12px] font-medium text-white">Sohbet</div>
        <button
          onClick={clear}
          disabled={turns.length === 0}
          className="rounded p-1 text-zinc-500 transition hover:bg-zinc-900 hover:text-red-400 disabled:cursor-not-allowed disabled:opacity-40"
          title="Geçmişi temizle"
        >
          <Trash2 className="h-3 w-3" />
        </button>
        <button
          onClick={() => setPanelOpen(false)}
          className="rounded p-1 text-zinc-500 transition hover:bg-zinc-900 hover:text-zinc-200"
          title="Kapat"
        >
          <X className="h-3.5 w-3.5" />
        </button>
      </div>

      <div ref={scrollRef} className="flex-1 overflow-y-auto px-3 py-3">
        {turns.length === 0 && (
          <p className="mt-6 text-center text-[11px] text-zinc-600">Henüz mesaj yok.</p>
        )}
        <ul className="space-y-3">
          {turns.map((t) => (
            <Turn key={t.id} turn={t} />
          ))}
          {isSending && (
            <li className="flex items-center gap-2 px-1 text-[11px] text-zinc-500">
              <span className="flex gap-1">
                <span className="h-1.5 w-1.5 animate-pulse rounded-full bg-purple-400" />
                <span className="h-1.5 w-1.5 animate-pulse rounded-full bg-purple-400 [animation-delay:150ms]" />
                <span className="h-1.5 w-1.5 animate-pulse rounded-full bg-purple-400 [animation-delay:300ms]" />
              </span>
              Yanıt bekleniyor…
            </li>
          )}
        </ul>
      </div>
    </aside>
  );
}

function Turn({ turn }: { turn: ChatTurn }) {
  if (turn.role === "user") {
    return (
      <li className="rounded-xl border border-zinc-800 bg-zinc-900/40 p-2.5">
        <div className="mb-1 flex items-center gap-1.5 text-[10px] uppercase tracking-widest text-zinc-500">
          <User className="h-3 w-3" />
          Sen
          {turn.scope && (
            <span className="rounded bg-zinc-800 px-1 normal-case text-zinc-400">
              {turn.scope}
            </span>
          )}
        </div>
        <p className="whitespace-pre-wrap text-[12.5px] text-zinc-100">{turn.content}</p>
      </li>
    );
  }

  if (turn.role === "error") {
    return (
      <li className="rounded-xl border border-red-500/30 bg-red-500/10 p-2.5">
        <div className="mb-1 flex items-center gap-1.5 text-[10px] uppercase tracking-widest text-red-300">
          <AlertTriangle className="h-3 w-3" />
          Hata
        </div>
        <p className="whitespace-pre-wrap text-[12px] text-red-200">{turn.content}</p>
      </li>
    );
  }

  return (
    <li className="rounded-xl border border-purple-500/30 bg-purple-500/5 p-2.5">
      <div className="mb-1 flex items-center gap-1.5 text-[10px] uppercase tracking-widest text-purple-300">
        <Bot className="h-3 w-3" />
        Beyin
        {turn.scope && (
          <span className="rounded bg-purple-500/20 px-1 normal-case text-purple-200">
            {turn.scope}
          </span>
        )}
        {turn.outputTokens !== undefined && (
          <span className="ml-auto rounded bg-zinc-800 px-1 normal-case text-[9px] text-zinc-400">
            {turn.inputTokens ?? 0} in / {turn.outputTokens} out
          </span>
        )}
      </div>
      {turn.content && (
        <p className="whitespace-pre-wrap text-[12.5px] text-zinc-100">{turn.content}</p>
      )}

      {turn.generatedFiles && turn.generatedFiles.length > 0 && (
        <ul className="mt-2 space-y-1.5">
          {turn.generatedFiles.map((f) => (
            <FileAttachment
              key={f.file_id}
              file={f}
              sourceLabel={turn.scope}
              sourceId={turn.sourceId}
            />
          ))}
        </ul>
      )}

      {turn.model && <p className="mt-1 text-[10px] text-zinc-600">{turn.model}</p>}
    </li>
  );
}

function FileAttachment({
  file,
  sourceLabel,
  sourceId,
}: {
  file: GeneratedFile;
  sourceLabel?: string;
  sourceId?: string;
}) {
  const [menuOpen, setMenuOpen] = useState(false);
  const allDepartments = useStore((s) =>
    s.nodes.filter((n) => n.data.kind === "department"),
  );
  const getConnectedDepartmentIds = useStore((s) => s.getConnectedDepartmentIds);
  const attach = useStore((s) => s.attachGeneratedFileToDepartment);

  // Edge zorunluluğu: kaynak (sourceId) ile bağlı olan departmanlar
  const connectedIds = sourceId ? getConnectedDepartmentIds(sourceId) : [];
  const connectedSet = new Set(connectedIds);
  const departments = allDepartments.filter(
    (d) => connectedSet.has(d.id) && d.id !== sourceId,
  );

  const ext = file.filename.split(".").pop()?.toLowerCase() ?? "";
  const Icon =
    ext === "xlsx" || ext === "csv"
      ? FileSpreadsheet
      : ext === "docx" || ext === "doc"
      ? FileText
      : FileType;

  const downloadUrl = `${API}/files/${file.file_id}`;

  const handleAttach = (deptId: string) => {
    attach({
      departmentId: deptId,
      fileId: file.file_id,
      filename: file.filename,
      mime: file.mime,
      sourceLabel,
    });
    setMenuOpen(false);
  };

  return (
    <li className="rounded-lg border border-zinc-800 bg-black/40 p-2">
      <div className="flex items-center gap-2">
        <Icon className="h-4 w-4 shrink-0 text-cyan-300" />
        <div className="flex-1 truncate text-[11.5px] text-zinc-200" title={file.filename}>
          {file.filename}
        </div>
      </div>

      <div className="mt-1.5 flex items-center gap-1.5">
        <a
          href={downloadUrl}
          download={file.filename}
          className="flex items-center gap-1 rounded-md bg-cyan-500/15 px-2 py-1 text-[10.5px] text-cyan-200 transition hover:bg-cyan-500/25"
        >
          <Download className="h-3 w-3" />
          İndir
        </a>

        <div className="relative">
          <button
            onClick={() => setMenuOpen((o) => !o)}
            disabled={departments.length === 0}
            className="flex items-center gap-1 rounded-md bg-purple-500/15 px-2 py-1 text-[10.5px] text-purple-200 transition hover:bg-purple-500/25 disabled:cursor-not-allowed disabled:opacity-40"
          >
            <Send className="h-3 w-3" />
            Departmana Gönder
          </button>

          {menuOpen && (
            <div className="absolute right-0 top-full z-20 mt-1 w-56 overflow-hidden rounded-lg border border-zinc-800 bg-[#0b0b0f] shadow-xl">
              {departments.length > 0 ? (
                departments.map((d) => (
                  <button
                    key={d.id}
                    onClick={() => handleAttach(d.id)}
                    className="flex w-full items-center gap-1.5 border-b border-zinc-900 px-2.5 py-1.5 text-left text-[11px] text-zinc-300 last:border-b-0 hover:bg-zinc-900 hover:text-white"
                  >
                    <Building2 className="h-3 w-3 text-purple-300" />
                    <span className="truncate">{d.data.label}</span>
                  </button>
                ))
              ) : (
                <div className="px-2.5 py-2 text-[10.5px] leading-relaxed text-zinc-500">
                  Bağlı departman yok. Şirket görünümünde önce kaynaktan
                  hedefe bir bağlantı (edge) çekin.
                </div>
              )}
            </div>
          )}
        </div>
      </div>
    </li>
  );
}
