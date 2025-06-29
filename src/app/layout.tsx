
import type { Metadata } from 'next';
import { GeistSans } from 'geist/font/sans';
// Removed GeistMono import as it was causing issues and not explicitly used for main font
import './globals.css';
import { LanguageProvider } from '@/contexts/language-context';
import { AuthProvider } from '@/hooks/use-auth'; // Import AuthProvider
import { QueryProvider } from '@/components/providers/query-provider'; // Import QueryProvider
import { Toaster } from "@/components/ui/toaster";
import { SITE_NAME, SITE_DESCRIPTION } from '@/constants';
import { TawkToWidget } from '@/components/analytics/tawk-to'; // Import Tawk.to widget

// This function checks for required environment variables on the server.
const checkRequiredServerEnvVars = () => {
  // This check will only run for Vercel production deployments.
  // It allows preview and development builds to succeed without all keys,
  // but ensures the final production site has everything it needs.
  if (process.env.VERCEL_ENV === 'production') {
    const requiredVars = [
      'CLOUDINARY_CLOUD_NAME',
      'CLOUDINARY_API_KEY',
      'CLOUDINARY_API_SECRET',
      'AIRTABLE_API_KEY',
      'AIRTABLE_BASE_ID',
      'AIRTABLE_TABLE_NAME',
      'AFRO_MESSAGING_API_KEY',
      'AFRO_MESSAGING_IDENTIFIER_ID',
    ];
    const missingVars = requiredVars.filter((varName) => !process.env[varName]);
    if (missingVars.length > 0) {
      throw new Error(
        `FATAL: Missing required environment variables for production: ${missingVars.join(
          ', '
        )}. Please add these to your Vercel project settings.`
      );
    }
  }
};

checkRequiredServerEnvVars();

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
        <AuthProvider>
          <LanguageProvider>
            <QueryProvider> {/* Wrap with QueryProvider */}
              {children}
              <Toaster />
              <TawkToWidget />
            </QueryProvider>
          </LanguageProvider>
        </AuthProvider>
      </body>
    </html>
  );
}
