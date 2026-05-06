"use client";

import { useState } from "react";
import { Send, Cpu, Loader2 } from "lucide-react";
import { useStore } from "@/store/useStore";
import { useChatStore } from "@/store/useChatStore";

const API = process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:8000";

export default function ChatInput() {
  const [value, setValue] = useState("");
  const getActiveContextForView = useStore((s) => s.getActiveContextForView);
  const view = useStore((s) => s.view);
  const selectedNodeId = useStore((s) => s.selectedNodeId);

  const isSending = useChatStore((s) => s.isSending);
  const setSending = useChatStore((s) => s.setSending);
  const appendUser = useChatStore((s) => s.appendUser);
  const appendAssistant = useChatStore((s) => s.appendAssistant);
  const appendError = useChatStore((s) => s.appendError);

  const handleSend = async () => {
    const text = value.trim();
    if (!text || isSending) return;

    const ctx = getActiveContextForView();
    const scope =
      ctx.departmentLabel ?? (ctx.view.kind === "company" ? "Şirket" : "Departman");
    const sourceId = ctx.view.kind === "department" ? ctx.view.id : "core_llm";

    setValue("");
    appendUser(text, scope, sourceId);
    setSending(true);

    try {
      const res = await fetch(`${API}/chat/`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          prompt: text,
          view: ctx.view,
          systemInstruction: ctx.departmentInstruction,
          contextLabel: ctx.departmentLabel,
          activeNodes: ctx.activeNodes,
          observerComments: ctx.comments,
        }),
      });

      const json = await res.json();
      if (!res.ok) {
        throw new Error(json.detail ?? `HTTP ${res.status}`);
      }
      appendAssistant(json.content, {
        inputTokens: json.inputTokens,
        outputTokens: json.outputTokens,
        model: json.model,
        scope,
        sourceId,
        generatedFiles: json.generatedFiles ?? [],
      });
    } catch (err) {
      appendError(err instanceof Error ? err.message : "Bilinmeyen hata.", scope, sourceId);
    } finally {
      setSending(false);
    }
  };

  // Inspector açıkken üst kısma it
  const bottomOffset = selectedNodeId ? "bottom-[calc(40vh+1rem)]" : "bottom-6";

  return (
    <div
      className={`absolute ${bottomOffset} left-1/2 z-10 w-[min(720px,90vw)] -translate-x-1/2 transition-all`}
    >
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
            disabled={isSending}
            placeholder={
              isSending
                ? "Beyin düşünüyor…"
                : view.kind === "company"
                ? "Patron'a sorun (departmanlara müdahale etmez)…"
                : "Departmana bir görev verin…"
            }
            className="flex-1 bg-transparent px-2 py-2 text-sm text-white placeholder:text-zinc-600 focus:outline-none disabled:opacity-60"
          />
          <button
            onClick={handleSend}
            disabled={!value.trim() || isSending}
            className="flex items-center gap-1.5 rounded-lg bg-purple-500 px-3 py-2 text-sm font-medium text-white shadow-glow transition hover:bg-purple-400 disabled:cursor-not-allowed disabled:bg-zinc-800 disabled:text-zinc-600 disabled:shadow-none"
          >
            {isSending ? (
              <Loader2 className="h-3.5 w-3.5 animate-spin" />
            ) : (
              <Send className="h-3.5 w-3.5" />
            )}
            {isSending ? "Yanıt bekleniyor" : "Gönder"}
          </button>
        </div>
      </div>
      <p className="mt-2 text-center text-[11px] text-zinc-600">
        {view.kind === "company"
          ? "Şirket görünümü — Patron LLM'le konuşuyorsunuz."
          : "Departman görünümü — sadece bu departmanın aktif düğümleri ve talimatı bağlama girer."}
      </p>
    </div>
  );
}
