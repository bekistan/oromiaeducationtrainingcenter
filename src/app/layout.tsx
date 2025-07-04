import type { Metadata } from 'next';
import './globals.css';
import { SITE_NAME, SITE_DESCRIPTION } from '@/constants';
import { cn } from '@/lib/utils';
import { Providers } from '@/components/providers/providers';

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
    <html lang="en">
      <body className={cn("min-h-screen bg-background font-sans antialiased")}>
        <Providers>{children}</Providers>
      </body>
    </html>
  );
}
