"use client";

import { useEffect, useState } from "react";
import { useStore } from "@/store/useStore";

/**
 * `useStore` persist `skipHydration: true` ile yapılandırılmış.
 * Bu bileşen client mount edildiğinde rehydrate'i manuel tetikler.
 * Bu sayede SSR ile client ilk render'ı eşleşir, hydration mismatch yaşanmaz.
 */
export default function StoreHydrator({ children }: { children: React.ReactNode }) {
  const [hydrated, setHydrated] = useState(false);

  useEffect(() => {
    useStore.persist.rehydrate();
    setHydrated(true);
  }, []);

  // Hidrasyon tamamlanmadan render etme — server ve client ilk render'ı default state'tedir
  if (!hydrated) {
    return (
      <div className="flex h-full w-full items-center justify-center bg-obsidian-950 text-zinc-600">
        <span className="text-[11px]">Beyin yükleniyor…</span>
      </div>
    );
  }
  return <>{children}</>;
}
