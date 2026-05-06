"use client";

import { cn } from "@/lib/utils";

type ToggleColor = "cyan" | "amber";

const COLOR_CLASSES: Record<ToggleColor, string> = {
  cyan: "bg-cyan-400",
  amber: "bg-amber-400",
};

interface Props {
  active: boolean;
  onToggle: () => void;
  color: ToggleColor;
  /** Switch tıklanamaz olsun mu (örn. dosya yüklenmeden önce) */
  disabled?: boolean;
  /** Devre dışı durumda etiket override (örn. "Önce dosya yükleyin") */
  disabledLabel?: string;
}

export default function NodeActiveToggle({
  active,
  onToggle,
  color,
  disabled = false,
  disabledLabel,
}: Props) {
  return (
    <label
      className={cn(
        "mt-3 flex cursor-pointer items-center justify-between rounded-lg border border-zinc-800 bg-black/40 px-2.5 py-1.5",
        disabled && "opacity-40 cursor-not-allowed",
      )}
    >
      <span className="text-[11px] text-zinc-400">
        {disabled ? disabledLabel ?? "Devre dışı" : "Aktif"}
      </span>
      <span
        onClick={() => !disabled && onToggle()}
        className={cn(
          "relative h-4 w-7 rounded-full transition-colors",
          active ? COLOR_CLASSES[color] : "bg-zinc-700",
        )}
      >
        <span
          className={cn(
            "absolute top-0.5 h-3 w-3 rounded-full bg-white transition-all",
            active ? "left-3.5" : "left-0.5",
          )}
        />
      </span>
    </label>
  );
}
