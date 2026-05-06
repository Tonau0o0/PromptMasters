"use client";

import { useCallback } from "react";
import { useStore } from "@/store/useStore";

const API = process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:8000";

const TABULAR_EXTS = new Set(["csv", "xlsx", "xls"]);
const DOC_EXTS = new Set(["pdf", "docx", "doc"]);
const ALL_EXTS = [...TABULAR_EXTS, ...DOC_EXTS];

function extOf(name: string) {
  return name.split(".").pop()?.toLowerCase() ?? "";
}

function labelOf(name: string) {
  return name.replace(/\.[^.]+$/, "");
}

function basenameOf(filePath: string) {
  return filePath.replace(/\\/g, "/").split("/").pop() ?? "dosya";
}

interface ApiTabularResponse {
  basari: boolean;
  dosya_adi: string;
  dosya_turu: string;
  meta: unknown;
}

interface ApiDocumentResponse {
  basari: boolean;
  file_id: string;
  dosya_adi: string;
  dosya_turu: string;
  parca_sayisi: number;
  mesaj: string;
}

export function useFileUpload(nodeId: string) {
  const patchNodeData = useStore((s) => s.patchNodeData);
  const isElectron =
    typeof window !== "undefined" && !!window.electronAPI?.isElectron;

  const setError = useCallback(
    (message: string) => {
      patchNodeData(nodeId, { uploadStatus: "error", uploadError: message });
    },
    [nodeId, patchNodeData],
  );

  /**
   * Asıl upload akışı: status patch → fetch → response patch.
   * Hem Electron native path hem browser multipart path bunu kullanır;
   * tek farkları `request` callback'inin ne döndürdüğüdür.
   */
  const runUpload = useCallback(
    async (params: {
      fileName: string;
      ext: string;
      request: () => Promise<Response>;
    }) => {
      const { fileName, ext, request } = params;

      if (!TABULAR_EXTS.has(ext) && !DOC_EXTS.has(ext)) {
        setError(`Desteklenmeyen dosya türü: .${ext}`);
        return;
      }

      patchNodeData(nodeId, {
        uploadStatus: "uploading",
        uploadError: undefined,
        fileName,
        fileType: ext.toUpperCase(),
      });

      try {
        const res = await request();
        const json = (await res.json()) as Record<string, unknown>;
        if (!res.ok) {
          throw new Error((json.detail as string) ?? "Sunucu hatası");
        }

        if (TABULAR_EXTS.has(ext)) {
          const data = json as unknown as ApiTabularResponse;
          patchNodeData(nodeId, {
            uploadStatus: "done",
            label: labelOf(fileName),
            fileType: ext.toUpperCase(),
            tabularMeta: data.meta as never,
            documentFileId: undefined,
            documentChunks: undefined,
          });
        } else {
          const data = json as unknown as ApiDocumentResponse;
          patchNodeData(nodeId, {
            uploadStatus: "done",
            label: labelOf(fileName),
            fileType: ext.toUpperCase(),
            documentFileId: data.file_id,
            documentChunks: data.parca_sayisi,
            tabularMeta: undefined,
          });
        }
      } catch (err) {
        setError(
          err instanceof Error ? err.message : "Bilinmeyen bir hata oluştu.",
        );
      }
    },
    [nodeId, patchNodeData, setError],
  );

  /**
   * ELECTRON: Native dialog → mutlak yol → backend diskten okur.
   */
  const openNativeDialog = useCallback(async () => {
    if (!window.electronAPI) return;

    const filePath = await window.electronAPI.openFileDialog([
      { name: "Desteklenen Dosyalar", extensions: ALL_EXTS },
    ]);
    if (!filePath) return;

    const fileName = basenameOf(filePath);
    const ext = extOf(fileName);
    const endpoint = TABULAR_EXTS.has(ext) ? "tabular-path" : "document-path";

    await runUpload({
      fileName,
      ext,
      request: () =>
        fetch(`${API}/upload/${endpoint}`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ file_path: filePath }),
        }),
    });

    window.electronAPI?.notify(
      "Dosya İşlendi",
      `"${fileName}" başarıyla yüklendi.`,
    );
  }, [runUpload]);

  /**
   * BROWSER: <input type="file"> → multipart upload.
   */
  const uploadFile = useCallback(
    async (file: File) => {
      const ext = extOf(file.name);
      const endpoint = TABULAR_EXTS.has(ext) ? "tabular" : "document";

      await runUpload({
        fileName: file.name,
        ext,
        request: () => {
          const form = new FormData();
          form.append("file", file);
          return fetch(`${API}/upload/${endpoint}`, {
            method: "POST",
            body: form,
          });
        },
      });
    },
    [runUpload],
  );

  return { openNativeDialog, uploadFile, isElectron };
}
