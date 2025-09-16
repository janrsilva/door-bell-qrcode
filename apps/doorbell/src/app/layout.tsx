import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "Campainha Eletrônica",
  description: "Toque a campainha de forma simples e rápida.",
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="pt-BR" suppressHydrationWarning>
      <body className="bg-background text-foreground">{children}</body>
    </html>
  );
}
