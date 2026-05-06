export {};

declare global {
  type BrainExportResult =
    | { ok: true; filePath: string }
    | { ok: false; reason: string };

  type BrainImportResult =
    | { ok: true; content: string; filePath: string }
    | { ok: false; reason: string };

  interface ElectronAPI {
    isElectron: true;
    openFileDialog(
      filters?: Array<{ name: string; extensions: string[] }>,
    ): Promise<string | null>;
    exportBrain(defaultName: string, content: string): Promise<BrainExportResult>;
    importBrain(): Promise<BrainImportResult>;
    minimizeWindow(): void;
    maximizeWindow(): void;
    closeWindow(): void;
    isMaximized(): Promise<boolean>;
    notify(title: string, body: string): void;
  }

  interface Window {
    electronAPI?: ElectronAPI;
  }
}

// Allow -webkit-app-region in React inline styles
declare module "react" {
  interface CSSProperties {
    WebkitAppRegion?: "drag" | "no-drag";
  }
}
