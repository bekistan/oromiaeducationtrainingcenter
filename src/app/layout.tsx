
import type { Metadata } from 'next';
import { GeistSans } from 'geist/font/sans';
// Removed GeistMono import as it was causing issues and not explicitly used for main font
import './globals.css';
import { LanguageProvider } from '@/contexts/language-context';
import { AuthProvider } from '@/hooks/use-auth'; // Import AuthProvider
import { Toaster } from "@/components/ui/toaster";
import { SITE_NAME, SITE_DESCRIPTION } from '@/constants';
import { TawkToWidget } from '@/components/analytics/tawk-to'; // Import Tawk.to widget

export const metadata: Metadata = {
  title: {
    default: SITE_NAME,
    template: `%s | ${SITE_NAME}`,
  },
  description: SITE_DESCRIPTION,
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" className={GeistSans.variable}>
      <body className="min-h-screen bg-background font-sans antialiased">
        <AuthProvider> {/* Wrap with AuthProvider */}
          <LanguageProvider>
            {children}
            <Toaster />
            <TawkToWidget /> {/* Add Tawk.to widget here */}
          </LanguageProvider>
        </AuthProvider>
      </body>
    </html>
  );
}
