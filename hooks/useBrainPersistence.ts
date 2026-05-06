"use client";

import { useCallback, useRef } from "react";
import { useStore } from "@/store/useStore";

/**
 * Beyin (graph) export/import.
 *
 * Electron'da: native save/open dialog + atomic IPC (preload).
 * Browser'da: Blob download + <input type="file"> fallback.
 *
 * `onError` ve `onSuccess` callback'leri UI tarafında toast/notification
 * göstermek için kullanılır — varsayılan olarak hiçbir şey yapmazlar.
 */
export function useBrainPersistence(opts?: {
  onSuccess?: (msg: string) => void;
  onError?: (msg: string) => void;
}) {
  const serializeBrain = useStore((s) => s.serializeBrain);
  const loadBrain = useStore((s) => s.loadBrain);
  const fileInputRef = useRef<HTMLInputElement | null>(null);

  const onSuccess = opts?.onSuccess ?? (() => {});
  const onError = opts?.onError ?? ((m) => console.error("[Brain]", m));

  const isElectron =
    typeof window !== "undefined" && !!window.electronAPI?.isElectron;

  const exportBrain = useCallback(
    async (defaultName = "yeni-beyin") => {
      const content = serializeBrain(defaultName);

      if (isElectron && window.electronAPI) {
        const res = await window.electronAPI.exportBrain(defaultName, content);
        if (res.ok) {
          onSuccess(`Beyin kaydedildi: ${res.filePath}`);
        } else if (res.reason !== "cancelled") {
          onError(`Kaydetme başarısız: ${res.reason}`);
        }
        return;
      }

      // Browser fallback — Blob download
      try {
        const blob = new Blob([content], { type: "application/json" });
        const url = URL.createObjectURL(blob);
        const a = document.createElement("a");
        a.href = url;
        a.download = `${defaultName}.brain.json`;
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
        URL.revokeObjectURL(url);
        onSuccess("Beyin indirildi.");
      } catch (err) {
        onError(err instanceof Error ? err.message : "İndirme başarısız.");
      }
    },
    [isElectron, serializeBrain, onSuccess, onError],
  );

  const handleImportContent = useCallback(
    (content: string) => {
      try {
        loadBrain(content);
        onSuccess("Beyin yüklendi.");
      } catch (err) {
        onError(err instanceof Error ? err.message : "Yükleme başarısız.");
      }
    },
    [loadBrain, onSuccess, onError],
  );

  const importBrain = useCallback(async () => {
    if (isElectron && window.electronAPI) {
      const res = await window.electronAPI.importBrain();
      if (res.ok) handleImportContent(res.content);
      else if (res.reason !== "cancelled") onError(`Yükleme başarısız: ${res.reason}`);
      return;
    }
    // Browser fallback — trigger hidden input click
    fileInputRef.current?.click();
  }, [isElectron, handleImportContent, onError]);

  const onBrowserFileSelected = useCallback(
    (e: React.ChangeEvent<HTMLInputElement>) => {
      const file = e.target.files?.[0];
      if (!file) return;
      file.text().then(handleImportContent).catch((err) => {
        onError(err instanceof Error ? err.message : "Dosya okunamadı.");
      });
      e.target.value = ""; // izin ver: aynı dosyayı tekrar seçebilsin
    },
    [handleImportContent, onError],
  );

  return {
    exportBrain,
    importBrain,
    isElectron,
    /** Browser fallback için Sidebar'da görünmez `<input>` render edilmeli */
    fileInputRef,
    onBrowserFileSelected,
  };
}
