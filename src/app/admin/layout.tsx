
"use client"; // Required for SidebarProvider and its hooks

import type { ReactNode } from 'react';
import React, { useCallback } from 'react'; // Added useCallback import
import {
  SidebarProvider,
  Sidebar,
  SidebarHeader,
  SidebarContent,
  SidebarFooter,
  SidebarTrigger,
  SidebarInset,
} from "@/components/ui/sidebar";
import { AdminSidebarNav } from "@/components/layout/admin-sidebar-nav";
import { Logo } from "@/components/shared/logo";
import { Button } from "@/components/ui/button";
import { LogOut, UserCircle, Loader2 } from "lucide-react";
import Link from "next/link";
import { useLanguage } from '@/hooks/use-language';
import { useAuth } from '@/hooks/use-auth';
import { useRouter } from 'next/navigation';
import { useToast } from '@/hooks/use-toast';

interface AdminLayoutProps {
  children: ReactNode;
  params?: Record<string, string | string[] | undefined>; // Explicitly type params to acknowledge its potential presence
}

export default function AdminLayout({ children, params: receivedRouteParams }: AdminLayoutProps) { // Destructure params
  const { t } = useLanguage();
  const { user, logout, loading: authLoading } = useAuth();
  const router = useRouter();
  const { toast } = useToast();
  const [isLoggingOut, setIsLoggingOut] = React.useState(false);

  // receivedRouteParams is acknowledged but not directly used in this component's rendering,
  // to avoid potential enumeration if it were spread or passed down implicitly.

  const handleLogout = useCallback(async () => {
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
  }, [logout, router, t, toast]);

  const displayName = user?.name || user?.email || t('adminUser');
  const displayEmail = user?.email || t('notAvailable');

  return (
    <SidebarProvider defaultOpen>
        <Sidebar collapsible="icon" variant="sidebar" side="left">
          <SidebarHeader className="p-4 border-b border-sidebar-border">
            <div className="flex items-center justify-between">
              <Logo />
            </div>
          </SidebarHeader>
          <SidebarContent>
            <AdminSidebarNav />
          </SidebarContent>
          <SidebarFooter className="p-4 border-t border-sidebar-border">
            <div className="flex flex-col items-start group-data-[collapsible=icon]:items-center gap-2">
               <Link href="/admin/profile" className="w-full">
                <Button variant="ghost" className="w-full justify-start group-data-[collapsible=icon]:justify-center group-data-[collapsible=icon]:px-2">
                  <UserCircle className="h-5 w-5 mr-2 group-data-[collapsible=icon]:mr-0" />
                  <span className="group-data-[collapsible=icon]:hidden truncate max-w-[120px]">{authLoading ? t('loading') : displayName}</span>
                </Button>
              </Link>
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
