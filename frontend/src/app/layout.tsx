import type { ReactNode } from "react";
import type { Metadata, Viewport } from "next";
import { AuthProvider } from "@/features/auth/AuthProvider";
import { ServiceWorker } from "./ServiceWorker";
import "./globals.css";

export const metadata: Metadata = {
  title: "LibrasLive Edu",
  description: "Plataforma educacional inclusiva com legenda ao vivo, avatar em Libras e cards visuais.",
  manifest: "/manifest.json",
};

export const viewport: Viewport = {
  themeColor: "#0f766e",
  width: "device-width",
  initialScale: 1,
};

export default function RootLayout({ children }: { children: ReactNode }) {
  return (
    <html lang="pt-BR">
      <body className="min-h-screen bg-paper antialiased">
        <AuthProvider>
          <ServiceWorker />
          {children}
        </AuthProvider>
      </body>
    </html>
  );
}
