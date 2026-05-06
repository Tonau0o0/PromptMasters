export {};

declare global {
  interface ElectronAPI {
    isElectron: true;
    openFileDialog(
      filters?: Array<{ name: string; extensions: string[] }>,
    ): Promise<string | null>;
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
