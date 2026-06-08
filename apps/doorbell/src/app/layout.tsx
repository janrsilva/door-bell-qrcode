import type { Metadata } from "next";
import "./globals.css";
import { SessionProvider } from "@/components/providers/SessionProvider";
import SoundManager from "@/components/SoundManager";
import PWAController from "@/components/PWAController";

export const metadata: Metadata = {
  title: "CAMPAINHA ELETRÔNICA",
  description: "Toque a campainha de forma simples e rápida.",
  appleWebApp: {
    capable: true,
    statusBarStyle: "default",
    title: "Campainha",
  },
  other: {
    "mobile-web-app-capable": "yes",
    "apple-mobile-web-app-capable": "yes",
    "apple-mobile-web-app-status-bar-style": "default",
    "apple-mobile-web-app-title": "Campainha",
    "application-name": "CAMPAINHA ELETRÔNICA",
    "msapplication-TileColor": "#3b82f6",
    "msapplication-config": "/browserconfig.xml",
  },
};

export const viewport = {
  width: "device-width",
  initialScale: 1,
  maximumScale: 1,
  userScalable: false,
  themeColor: "#3b82f6",
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="pt-BR" suppressHydrationWarning>
      <head>
        <link rel="manifest" href="/manifest.json" />
        <link rel="icon" href="/favicon.ico" />
        <link rel="apple-touch-icon" href="/icons/icon-192x192.png" />
        <link
          rel="mask-icon"
          href="/icons/safari-pinned-tab.svg"
          color="#3b82f6"
        />
        <meta
          name="msapplication-TileImage"
          content="/icons/icon-144x144.png"
        />
      </head>
      <body className="bg-background text-foreground" suppressHydrationWarning>
        <SessionProvider>
          <PWAController />
          <SoundManager />
          {children}
        </SessionProvider>
      </body>
    </html>
  );
}
