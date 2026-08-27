import type { Metadata } from 'next';
import { QueryProvider } from '@/providers/query-provider';
import './globals.css';

export const metadata: Metadata = {
  title: 'GESTI | Sistema de gestion de TI',
  description: 'Sistema de gestion del departamento de TI.',
  icons: {
    icon: '/brand/gesti-icon.png',
    apple: '/brand/gesti-icon.png',
  },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="es">
      <body>
        <QueryProvider>{children}</QueryProvider>
      </body>
    </html>
  );
}
