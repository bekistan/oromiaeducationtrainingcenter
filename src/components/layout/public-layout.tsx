
"use client";

import type { ReactNode } from 'react';
import { Header } from './header';
import { Footer } from './footer';
import { cn } from '@/lib/utils';

interface PublicLayoutProps {
  children: ReactNode;
  usePrintLayout?: boolean; // New prop to control layout for printing
}

export function PublicLayout({ children, usePrintLayout = false }: PublicLayoutProps) {
  return (
    <div className={cn("flex min-h-screen flex-col", usePrintLayout && "print:block")}>
      <Header />
      <main className="flex-1">{children}</main>
      <Footer />
    </div>
  );
}
