
"use client";

import type { ReactNode } from 'react';
import { Header } from './header';
import { Footer } from './footer';
import { cn } from '@/lib/utils';

interface PublicLayoutProps {
  children: ReactNode;
  usePrintLayout?: boolean;
}

export function PublicLayout({ children, usePrintLayout = false }: PublicLayoutProps) {
  if (usePrintLayout) {
    return <div className="printable-agreement-wrapper">{children}</div>;
  }

  return (
    <div className="flex min-h-screen flex-col">
      <Header />
      <main className="flex-1">{children}</main>
      <Footer />
    </div>
  );
}
