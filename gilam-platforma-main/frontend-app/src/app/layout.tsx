import type { Metadata } from 'next';
import { inter } from '@/lib/fonts';
import './globals.css';

export const metadata: Metadata = {
  title: 'Gilam SaaS - Korxonalar Boshqaruvi',
  description: 'Gilam yuvish faolyatini zamonaviy boshqarish tizimi',
};

import { Toaster } from 'react-hot-toast';

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="uz">
      <head>
        {/* Leaflet CSS — CDN orqali (Turbopack crash ni oldini oladi) */}
        <link
          rel="stylesheet"
          href="https://unpkg.com/leaflet@1.9.4/dist/leaflet.css"
          integrity="sha256-p4NxAoJBhIIN+hmNHrzRCf9tD/miZyoHS5obTRR9BMY="
          crossOrigin=""
        />
      </head>
      <body className={`${inter.className} min-h-screen font-sans antialiased bg-slate-50`}>
        {children}
        <Toaster position="top-right" toastOptions={{ className: 'font-bold' }} />
      </body>
    </html>
  );
}
