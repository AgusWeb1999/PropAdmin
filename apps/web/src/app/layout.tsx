import type { Metadata } from 'next';
import './globals.css';
import { Toaster } from '@/components/ui/Toaster';

export const metadata: Metadata = {
  metadataBase: new URL(process.env.NEXT_PUBLIC_SITE_URL || 'https://www.prop-admin.com'),
  title: { template: '%s — PropAdmin', default: 'PropAdmin' },
  description: 'Sistema de administración de propiedades, alquileres y gastos comunes',
  icons: { icon: '/favicon.ico' },
  robots: { index: false, follow: false },
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="es" suppressHydrationWarning>
      <body className="min-h-screen bg-background font-sans antialiased">
        {children}
        <Toaster />
      </body>
    </html>
  );
}
