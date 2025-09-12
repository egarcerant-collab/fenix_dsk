import type { Metadata } from 'next';
import { Toaster } from "@/components/ui/toaster"
import './globals.css';
import { Inter as FontSans } from 'next/font/google';
import { cn } from '@/lib/utils';

const fontSans = FontSans({ 
  subsets: ["latin"],
  variable: "--font-sans",
});


export const metadata: Metadata = {
  title: 'Indicadores HTA/DM',
  description: 'Cargue y procese archivos de Excel/CSV para indicadores HTA/DM',
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="es" suppressHydrationWarning>
      <body suppressHydrationWarning className={cn("min-h-screen bg-background font-sans antialiased", fontSans.variable)}>
        {children}
        <Toaster />
      </body>
    </html>
  );
}
