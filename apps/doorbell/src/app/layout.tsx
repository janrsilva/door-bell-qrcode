import type { Metadata } from "next";
import "./globals.css";
import { SessionProvider } from "@/components/providers/SessionProvider";

export const metadata: Metadata = {
  title: "Campainha Eletrônica",
  description: "Toque a campainha de forma simples e rápida.",
  manifest: "/manifest.json",
  themeColor: "#3b82f6",
  viewport:
    "width=device-width, initial-scale=1, maximum-scale=1, user-scalable=no",
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
    "application-name": "Campainha Eletrônica",
    "msapplication-TileColor": "#3b82f6",
    "msapplication-config": "/browserconfig.xml",
  },
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="pt-BR" suppressHydrationWarning>
      <head>
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
      <body className="bg-background text-foreground">
        <SessionProvider>{children}</SessionProvider>
        <script
          dangerouslySetInnerHTML={{
            __html: `
              if ('serviceWorker' in navigator) {
                window.addEventListener('load', function() {
                  navigator.serviceWorker.register('/sw.js')
                    .then(function(registration) {
                      console.log('✅ SW registrado com sucesso:', registration.scope);
                      console.log('🔧 SW registration:', registration);

                      // Verificar se está ativo
                      if (registration.active) {
                        console.log('✅ SW está ativo');
                      } else {
                        console.log('⏳ SW aguardando ativação...');
                      }
                    }, function(err) {
                      console.log('❌ Falha ao registrar SW:', err);
                    });
                });
              } else {
                console.log('❌ Service Worker não suportado neste navegador');
              }
            `,
          }}
        />
      </body>
    </html>
  );
}
