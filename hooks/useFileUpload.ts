"use client";

import { useCallback } from "react";
import { useStore } from "@/store/useStore";

const API = process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:8000";

const TABULAR_EXTS = new Set(["csv", "xlsx", "xls"]);
const DOC_EXTS     = new Set(["pdf", "docx", "doc"]);

function extOf(name: string) {
  return name.split(".").pop()?.toLowerCase() ?? "";
}

function labelOf(name: string) {
  return name.replace(/\.[^.]+$/, "");
}

export function useFileUpload(nodeId: string) {
  const patchNodeData = useStore((s) => s.patchNodeData);
  const isElectron =
    typeof window !== "undefined" && !!window.electronAPI?.isElectron;

  /** Apply upload result coming from any endpoint */
  const applyResult = useCallback(
    (json: Record<string, unknown>, ext: string, fileName: string) => {
      if (TABULAR_EXTS.has(ext)) {
        patchNodeData(nodeId, {
          uploadStatus: "done",
          label: labelOf(fileName),
          fileType: ext.toUpperCase(),
          tabularMeta: json.meta as never,
          documentFileId: undefined,
          documentChunks: undefined,
        });
      } else {
        patchNodeData(nodeId, {
          uploadStatus: "done",
          label: labelOf(fileName),
          fileType: ext.toUpperCase(),
          documentFileId: json.file_id as string,
          documentChunks: json.parca_sayisi as number,
          tabularMeta: undefined,
        });
      }
    },
    [nodeId, patchNodeData],
  );

  const handleError = useCallback(
    (err: unknown) => {
      patchNodeData(nodeId, {
        uploadStatus: "error",
        uploadError:
          err instanceof Error ? err.message : "Bilinmeyen bir hata oluştu.",
      });
    },
    [nodeId, patchNodeData],
  );

  /**
   * ELECTRON PATH: Open native OS dialog → send absolute file path to backend.
   * The backend reads directly from disk — no file copy or memory overhead.
   */
  const openNativeDialog = useCallback(async () => {
    if (!window.electronAPI) return;

    const filePath = await window.electronAPI.openFileDialog([
      {
        name: "Desteklenen Dosyalar",
        extensions: ["csv", "xlsx", "xls", "pdf", "docx", "doc"],
      },
    ]);
    if (!filePath) return; // user cancelled

    const fileName = filePath.replace(/\\/g, "/").split("/").pop() ?? "dosya";
    const ext = extOf(fileName);

    if (!TABULAR_EXTS.has(ext) && !DOC_EXTS.has(ext)) {
      patchNodeData(nodeId, {
        uploadStatus: "error",
        uploadError: `Desteklenmeyen dosya türü: .${ext}`,
      });
      return;
    }

    patchNodeData(nodeId, {
      uploadStatus: "uploading",
      uploadError: undefined,
      fileName,
      fileType: ext.toUpperCase(),
    });

    const endpoint = TABULAR_EXTS.has(ext) ? "tabular-path" : "document-path";

    try {
      const res = await fetch(`${API}/upload/${endpoint}`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ file_path: filePath }),
      });
      const json = await res.json();
      if (!res.ok) throw new Error(json.detail ?? "Sunucu hatası");
      applyResult(json, ext, fileName);

      window.electronAPI?.notify(
        "Dosya İşlendi",
        `"${fileName}" başarıyla yüklendi.`,
      );
    } catch (err) {
      handleError(err);
    }
  }, [nodeId, patchNodeData, applyResult, handleError]);

  /**
   * BROWSER FALLBACK: Standard <input type="file"> → multipart upload.
   */
  const uploadFile = useCallback(
    async (file: File) => {
      const ext = extOf(file.name);

      if (!TABULAR_EXTS.has(ext) && !DOC_EXTS.has(ext)) {
        patchNodeData(nodeId, {
          uploadStatus: "error",
          uploadError: `Desteklenmeyen dosya türü: .${ext}`,
        });
        return;
      }

      patchNodeData(nodeId, {
        uploadStatus: "uploading",
        uploadError: undefined,
        fileName: file.name,
        fileType: ext.toUpperCase(),
      });

      const endpoint = TABULAR_EXTS.has(ext) ? "tabular" : "document";
      const form = new FormData();
      form.append("file", file);

      try {
        const res = await fetch(`${API}/upload/${endpoint}`, {
          method: "POST",
          body: form,
        });
        const json = await res.json();
        if (!res.ok) throw new Error(json.detail ?? "Sunucu hatası");
        applyResult(json, ext, file.name);
      } catch (err) {
        handleError(err);
      }
    },
    [nodeId, patchNodeData, applyResult, handleError],
  );

  return { openNativeDialog, uploadFile, isElectron };
}
