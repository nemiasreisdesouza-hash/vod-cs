import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "VOD Analyst Pro — Análise de demos CS2 e CrossFire",
  description: "Analise VODs e demos, detecte erros táticos e evolua seu jogo.",
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="pt-BR" className="dark">
      <body className="min-h-screen bg-base text-gray-100 antialiased">{children}</body>
    </html>
  );
}
