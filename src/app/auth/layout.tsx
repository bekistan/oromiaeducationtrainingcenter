
import type { ReactNode } from 'react';
import { Logo } from '@/components/shared/logo';

interface AuthLayoutProps {
  children: ReactNode;
}

export default function AuthLayout({ children }: AuthLayoutProps) {
  return (
    <div className="flex min-h-screen flex-col items-center justify-center bg-gradient-to-br from-primary/5 via-background to-accent/5 p-4">
       <div className="absolute top-8 left-8">
        <Logo />
      </div>
      {children}
    </div>
  );
}
