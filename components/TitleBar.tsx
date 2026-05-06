"use client";

import { useEffect, useState } from "react";
import { Brain, Minus, Square, X, Maximize2 } from "lucide-react";
import { cn } from "@/lib/utils";

export default function TitleBar() {
  const [maximized, setMaximized] = useState(false);
  const isElectron = typeof window !== "undefined" && !!window.electronAPI;

  useEffect(() => {
    if (!isElectron) return;
    // Sync icon on mount
    window.electronAPI!.isMaximized().then(setMaximized);
  }, [isElectron]);

  if (!isElectron) return null;

  const handleMinimize  = () => window.electronAPI!.minimizeWindow();
  const handleMaximize  = () => {
    window.electronAPI!.maximizeWindow();
    window.electronAPI!.isMaximized().then(setMaximized);
  };
  const handleClose = () => window.electronAPI!.closeWindow();

  return (
    <div
      className="relative z-50 flex h-9 shrink-0 select-none items-center border-b border-zinc-800/60 bg-[#0b0b0f]"
      style={{ WebkitAppRegion: "drag" }}
    >
      {/* Brand */}
      <div className="flex items-center gap-2 px-4">
        <div className="flex h-5 w-5 items-center justify-center rounded bg-purple-500/20">
          <Brain className="h-3 w-3 text-purple-300" />
        </div>
        <span className="text-[13px] font-medium text-zinc-400 tracking-wide">
          Neuro-Agent
        </span>
        <span className="text-[11px] text-zinc-600">· Dinamik Bilgi Grafiği</span>
      </div>

      {/* Window controls — must NOT be draggable */}
      <div
        className="ml-auto flex h-full"
        style={{ WebkitAppRegion: "no-drag" }}
      >
        <TitleBtn onClick={handleMinimize} label="Küçült">
          <Minus className="h-3 w-3" />
        </TitleBtn>
        <TitleBtn onClick={handleMaximize} label={maximized ? "Eski Boyut" : "Büyüt"}>
          {maximized ? (
            <Square className="h-3 w-3" />
          ) : (
            <Maximize2 className="h-3 w-3" />
          )}
        </TitleBtn>
        <TitleBtn onClick={handleClose} label="Kapat" danger>
          <X className="h-3.5 w-3.5" />
        </TitleBtn>
      </div>
    </div>
  );
}

function TitleBtn({
  onClick,
  label,
  danger = false,
  children,
}: {
  onClick: () => void;
  label: string;
  danger?: boolean;
  children: React.ReactNode;
}) {
  return (
    <button
      onClick={onClick}
      title={label}
      className={cn(
        "flex h-full w-12 items-center justify-center text-zinc-500 transition-colors",
        danger
          ? "hover:bg-red-600 hover:text-white"
          : "hover:bg-zinc-800 hover:text-zinc-200",
      )}
    >
      {children}
    </button>
  );
}
