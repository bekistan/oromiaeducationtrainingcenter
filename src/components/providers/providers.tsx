"use client";

import type { ReactNode } from 'react';
import { LanguageProvider } from '@/contexts/language-context';
import { AuthProvider } from '@/hooks/use-auth'; 
import { QueryProvider } from '@/components/providers/query-provider'; 
import { Toaster } from "@/components/ui/toaster";
import { TawkToWidget } from '@/components/analytics/tawk-to';
import { FirebaseMessagingProvider } from './firebase-messaging-provider';

export function Providers({ children }: { children: ReactNode }) {
  return (
    <AuthProvider>
      <LanguageProvider>
        <QueryProvider>
          <FirebaseMessagingProvider>
            {children}
          </FirebaseMessagingProvider>
          <Toaster />
          <TawkToWidget />
        </QueryProvider>
      </LanguageProvider>
    </AuthProvider>
  );
}
