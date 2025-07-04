"use client";

import type { ReactNode } from 'react';
import { LanguageProvider } from '@/contexts/language-context';
import { AuthProvider } from '@/hooks/use-auth'; 
import { QueryProvider } from '@/components/providers/query-provider'; 
import { Toaster } from "@/components/ui/toaster";
import { TawkToWidget } from '@/components/analytics/tawk-to';

export function Providers({ children }: { children: ReactNode }) {
  return (
    <AuthProvider>
      <LanguageProvider>
        <QueryProvider>
          {children}
          <Toaster />
          <TawkToWidget />
        </QueryProvider>
      </LanguageProvider>
    </AuthProvider>
  );
}
