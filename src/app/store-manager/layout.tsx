
"use client";

import type { ReactNode } from 'react';
import React, { useCallback } from 'react';
import {
  SidebarProvider,
  Sidebar,
  SidebarHeader,
  SidebarContent,
  SidebarFooter,
  SidebarTrigger,
  SidebarInset,
} from "@/components/ui/sidebar";
import { StoreManagerSidebarNav } from "@/components/layout/store-manager-sidebar-nav"; 
import { Logo } from "@/components/shared/logo";
import { Button } from "@/components/ui/button";
import { LogOut, UserCircle, Loader2, ShieldAlert, LayoutDashboard, ChevronDown } from "lucide-react";
import Link from "next/link";
import { useLanguage } from '@/hooks/use-language';
import { useAuth } from '@/hooks/use-auth';
import { useRouter } from 'next/navigation';
import { useToast } from '@/hooks/use-toast';
import { cn } from '@/lib/utils';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { LanguageSwitcher } from '@/components/layout/language-switcher';

interface StoreManagerLayoutProps {
  children: ReactNode;
}

export default function StoreManagerLayout({ children }: StoreManagerLayoutProps) {
  const { t } = useLanguage();
  const { user, logout, loading: authLoading } = useAuth();
  const router = useRouter();
  const { toast } = useToast();

  const handleLogout = useCallback(async () => {
    try {
      await logout();
      toast({ title: t('logoutSuccessfulTitle'), description: t('logoutSuccessfulMessage') });
      router.push('/auth/login');
    } catch (error) {
      console.error("Logout failed:", error);
      toast({ variant: "destructive", title: t('logoutFailedTitle'), description: t('logoutFailedMessage') });
    }
  }, [logout, router, t, toast]);

  if (authLoading) {
    return <div className="flex justify-center items-center h-screen"><Loader2 className="h-8 w-8 animate-spin text-primary" /><p className="ml-2">{t('loading')}</p></div>;
  }

  if (user?.role !== 'store_manager') {
    return (
      <div className="flex flex-col items-center justify-center h-screen text-center p-4">
        <ShieldAlert className="w-16 h-16 text-destructive mb-4" />
        <h1 className="text-2xl font-bold text-destructive mb-2">{t('accessDenied')}</h1>
        <p className="text-muted-foreground">{t('storeManagerOnlyPage')}</p>
        <Button onClick={() => router.push('/auth/login')} className="mt-4">{t('login')}</Button>
      </div>
    );
  }

  const userMenu = (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button variant="outline" className="flex items-center gap-1.5 px-3">
          <UserCircle className="h-5 w-5 text-muted-foreground" />
          <span className="font-medium truncate max-w-[100px]">{user.name}</span>
          <ChevronDown className="h-4 w-4 text-muted-foreground" />
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent className="w-56" align="end" forceMount>
        <DropdownMenuLabel className="font-normal">
          <div className="flex flex-col space-y-1">
            <p className="text-sm font-medium leading-none">{user.name}</p>
            <p className="text-xs leading-none text-muted-foreground">{user.email}</p>
          </div>
        </DropdownMenuLabel>
        <DropdownMenuSeparator />
        <DropdownMenuItem asChild>
          <Link href="/store-manager/dashboard"><LayoutDashboard className="mr-2 h-4 w-4" /><span>{t('dashboard')}</span></Link>
        </DropdownMenuItem>
        <DropdownMenuSeparator />
        <DropdownMenuItem onClick={handleLogout} className="text-destructive focus:bg-destructive focus:text-destructive-foreground">
          <LogOut className="mr-2 h-4 w-4" />
          <span>{t('logout')}</span>
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  );

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
            <StoreManagerSidebarNav />
          </SidebarContent>
           <SidebarFooter className="p-4 border-t border-sidebar-border">
            <p className="text-xs text-muted-foreground group-data-[collapsible=icon]:hidden">
                © {new Date().getFullYear()} {t('allRightsReserved')}
            </p>
          </SidebarFooter>
        </Sidebar>
        
        <SidebarInset>
          <header className="sticky top-0 z-40 flex h-14 items-center justify-between border-b bg-background px-4 md:px-6 md:justify-end">
            <div className="md:hidden">
              <SidebarTrigger />
            </div>
             <div className="flex items-center gap-4">
                <LanguageSwitcher />
                {userMenu}
            </div>
          </header>
          <main className="flex-1 p-4 md:p-6 lg:p-8 min-w-0">
            {children}
          </main>
        </SidebarInset>
    </SidebarProvider>
  );
}
