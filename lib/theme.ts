/**
 * Tek kaynaklı renk paleti — Tailwind config'i ile senkron tutulmalı.
 * `tailwind.config.ts > theme.extend.colors.neural` ile eşleşir.
 */
export const NODE_COLORS = {
  core: "#a855f7",
  data: "#22d3ee",
  feature: "#f59e0b",
} as const;

export type NodeColorKind = keyof typeof NODE_COLORS;
