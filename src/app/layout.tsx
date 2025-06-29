
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
// If any are missing, it will cause the server to crash and log a clear error.
const checkRequiredServerEnvVars = () => {
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

  if (process.env.NODE_ENV === 'production') {
    const missingVars = requiredVars.filter((varName) => !process.env[varName]);

    if (missingVars.length > 0) {
      throw new Error(
        `FATAL: Missing required environment variables on the server: ${missingVars.join(
          ', '
        )}. Please add them to your hosting provider (e.g., Vercel) settings and redeploy.`
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
