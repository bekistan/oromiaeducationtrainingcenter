
"use client";

import type { ReactNode } from 'react';
import React from 'react';
import {
  SidebarProvider,
  Sidebar,
  SidebarHeader,
  SidebarContent,
  SidebarFooter,
  SidebarTrigger,
  SidebarInset,
} from "@/components/ui/sidebar";
import { KeyholderSidebarNav } from "@/components/layout/keyholder-sidebar-nav"; 
import { Logo } from "@/components/shared/logo";
import { Button } from "@/components/ui/button";
import { LogOut, UserCircle, Loader2 } from "lucide-react";
import Link from "next/link";
import { useLanguage } from '@/hooks/use-language';
import { useAuth } from '@/hooks/use-auth';
import { useRouter } from 'next/navigation';
import { useToast } from '@/hooks/use-toast';
import { cn } from '@/lib/utils';
import { ShieldAlert } from 'lucide-react';

interface KeyholderLayoutProps {
  children: ReactNode;
}

export default function KeyholderLayout({ children }: KeyholderLayoutProps) {
  const { t } = useLanguage();
  const { user, logout, loading: authLoading } = useAuth();
  const router = useRouter();
  const { toast } = useToast();
  const [isLoggingOut, setIsLoggingOut] = React.useState(false);

  const handleLogout = async () => {
    setIsLoggingOut(true);
    try {
      await logout();
      toast({ title: t('logoutSuccessfulTitle'), description: t('logoutSuccessfulMessage') });
      router.push('/auth/login');
    } catch (error) {
      console.error("Logout failed:", error);
      toast({ variant: "destructive", title: t('logoutFailedTitle'), description: t('logoutFailedMessage') });
      setIsLoggingOut(false);
    }
  };

  if (authLoading) {
    return (
      <div className="flex justify-center items-center h-screen">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
        <p className="ml-2">{t('loading')}</p>
      </div>
    );
  }

  if (user?.role !== 'keyholder') {
    return (
      <div className="flex flex-col items-center justify-center h-screen text-center p-4">
        <ShieldAlert className="w-16 h-16 text-destructive mb-4" />
        <h1 className="text-2xl font-bold text-destructive mb-2">{t('accessDenied')}</h1>
        <p className="text-muted-foreground">{t('keyholderOnlyPage')}</p>
        <Button onClick={() => router.push(user ? '/auth/login' : '/auth/login')} className="mt-4">
          {t('login')}
        </Button>
      </div>
    );
  }

  const displayName = user?.name || user?.email || t('keyholderUser');
  const displayEmail = user?.email || t('notAvailable');

  return (
    <SidebarProvider defaultOpen>
        <Sidebar collapsible="icon" variant="sidebar" side="left">
          <SidebarHeader className="p-4 border-b border-sidebar-border">
            <div className="flex items-center h-full">
              <div className={cn("flex-grow", "group-data-[collapsible=icon]:group-data-[state=collapsed]:hidden")}>
                 <Logo />
              </div>
              <div className="hidden md:flex">
                <SidebarTrigger />
              </div>
            </div>
          </SidebarHeader>
          <SidebarContent>
            <KeyholderSidebarNav />
          </SidebarContent>
          <SidebarFooter className="p-4 border-t border-sidebar-border">
            <div className="flex flex-col items-start group-data-[collapsible=icon]:items-center gap-2">
               <div className="w-full">
                <Button variant="ghost" className="w-full justify-start group-data-[collapsible=icon]:justify-center group-data-[collapsible=icon]:px-2">
                  <UserCircle className="h-5 w-5 mr-2 group-data-[collapsible=icon]:mr-0" />
                  <span className="group-data-[collapsible=icon]:hidden truncate max-w-[120px]">{authLoading ? t('loading') : displayName}</span>
                </Button>
              </div>
              <Button 
                variant="ghost" 
                onClick={handleLogout} 
                disabled={isLoggingOut || authLoading}
                className="w-full text-destructive hover:text-destructive-foreground hover:bg-destructive justify-start group-data-[collapsible=icon]:justify-center group-data-[collapsible=icon]:px-2"
              >
                {isLoggingOut ? <Loader2 className="h-5 w-5 mr-2 group-data-[collapsible=icon]:mr-0 animate-spin" /> : <LogOut className="h-5 w-5 mr-2 group-data-[collapsible=icon]:mr-0" />}
                <span className="group-data-[collapsible=icon]:hidden">{t('logout')}</span>
              </Button>
            </div>
          </SidebarFooter>
        </Sidebar>
        
        <SidebarInset>
          <header className="sticky top-0 z-40 flex h-16 items-center justify-between border-b bg-background px-4 md:px-6 md:justify-end">
            <div className="md:hidden">
              <SidebarTrigger />
            </div>
            <div className="hidden md:flex items-center gap-4">
                <span className="text-sm text-muted-foreground">{authLoading ? t('loading') : displayEmail}</span>
            </div>
          </header>
          <main className="flex-1 p-4 md:p-6 lg:p-8">
            {children}
          </main>
        </SidebarInset>
    </SidebarProvider>
  );
}
