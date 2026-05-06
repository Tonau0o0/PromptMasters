import type { Metadata } from "next";
import "./globals.css";
import TitleBar from "@/components/TitleBar";

export const metadata: Metadata = {
  title: "Neuro-Agent | Dinamik Bilgi Grafiği",
  description:
    "Görsel olarak özel AI beyinleri oluşturun: Veri ve Özellik düğümlerini Çekirdek LLM'e bağlayın.",
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="tr">
      <body className="flex h-screen flex-col overflow-hidden bg-obsidian-950 text-obsidian-50 antialiased">
        {/* Custom title bar (renders as null outside Electron) */}
        <TitleBar />
        {/* Canvas fills remaining height */}
        <div className="relative min-h-0 flex-1">{children}</div>
      </body>
    </html>
  );
}
