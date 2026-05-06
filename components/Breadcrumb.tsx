"use client";

import { ChevronRight, Building2, Home } from "lucide-react";
import { useStore } from "@/store/useStore";

export default function Breadcrumb() {
  const view = useStore((s) => s.view);
  const exitToCompany = useStore((s) => s.exitToCompany);
  const departmentLabel = useStore((s) =>
    view.kind === "department"
      ? s.nodes.find((n) => n.id === view.id)?.data.label ?? "Departman"
      : null,
  );

  return (
    <nav className="absolute left-1/2 top-4 z-10 flex -translate-x-1/2 items-center gap-1 rounded-full border border-zinc-800 bg-[#0b0b0f]/90 px-3 py-1.5 text-[11px] backdrop-blur-md">
      <button
        onClick={exitToCompany}
        disabled={view.kind === "company"}
        className="flex items-center gap-1 rounded-full px-2 py-0.5 text-zinc-400 transition hover:bg-zinc-800 hover:text-white disabled:cursor-default disabled:text-zinc-500 disabled:hover:bg-transparent"
      >
        <Home className="h-3 w-3" />
        Şirket
      </button>

      {view.kind === "department" && departmentLabel && (
        <>
          <ChevronRight className="h-3 w-3 text-zinc-600" />
          <span className="flex items-center gap-1 rounded-full bg-purple-500/15 px-2 py-0.5 text-purple-200 ring-1 ring-purple-400/30">
            <Building2 className="h-3 w-3" />
            {departmentLabel}
          </span>
        </>
      )}
    </nav>
  );
}
