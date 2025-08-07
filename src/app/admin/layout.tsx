"use client";

import type { ReactNode } from 'react';
import React, { useCallback, useEffect, useRef } from 'react';
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
import { LogOut, UserCircle, Loader2, ShieldAlert, LayoutDashboard, ChevronDown } from "lucide-react";
import Link from "next/link";
import { useLanguage } from '@/hooks/use-language';
import { useAuth } from '@/hooks/use-auth';
import { useRouter } from 'next/navigation';
import { useToast } from '@/hooks/use-toast';
import { cn } from '@/lib/utils';
import { onSnapshot, collection, query, where, Timestamp, orderBy, limit } from 'firebase/firestore';
import { db } from '@/lib/firebase';
import { ToastAction } from "@/components/ui/toast";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { LanguageSwitcher } from '@/components/layout/language-switcher';

interface AdminLayoutProps {
  children: ReactNode;
  params?: Record<string, string | string[] | undefined>;
}

export default function AdminLayout({ children, params: receivedRouteParams }: AdminLayoutProps) {
  const { t } = useLanguage();
  const { user, logout, loading: authLoading } = useAuth();
  const router = useRouter();
  const { toast } = useToast();
  const mountTime = useRef(new Date());

  useEffect(() => {
    if (authLoading) return;
    if (!user || (user.role !== 'admin' && user.role !== 'superadmin')) {
      router.push('/auth/login?redirect=/admin/dashboard');
    }
  }, [user, authLoading, router]);

  useEffect(() => {
    if (!user || (user.role !== 'admin' && user.role !== 'superadmin') || !db) return;
    
    // Corrected query: Simplifies the query to avoid needing a composite index.
    // We fetch all notifications for the relevant roles and then filter by timestamp on the client side.
    const q = query(
      collection(db, "notifications"),
      where("recipientRole", "in", ["admin", "superadmin"]),
      orderBy("createdAt", "desc"),
      limit(10) // Listen to the 10 most recent to be efficient
    );

    const unsubscribe = onSnapshot(q, (snapshot) => {
      snapshot.docChanges().forEach((change) => {
        if (change.type === "added") {
          const notificationData = change.doc.data();
          const createdAtDate = (notificationData.createdAt as Timestamp)?.toDate();
          // Check if notification is new (created after component mounted)
          if (createdAtDate && createdAtDate > mountTime.current) {
            toast({
              title: `🔔 ${t('newNotification')}`,
              description: notificationData.message,
              action: notificationData.link ? (
                <ToastAction altText={t('view')} asChild>
                  <Link href={notificationData.link}>{t('view')}</Link>
                </ToastAction>
              ) : undefined,
              duration: 15000 
            });
          }
        }
      });
    }, (error) => {
      console.error("Error with notification listener:", error);
    });

    return () => unsubscribe();
  }, [user, t, toast]);

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
  
  if (!user || (user.role !== 'admin' && user.role !== 'superadmin')) {
     return (
      <div className="flex flex-col items-center justify-center h-screen text-center p-4">
        <ShieldAlert className="w-16 h-16 text-destructive mb-4" />
        <h1 className="text-2xl font-bold text-destructive mb-2">{t('accessDenied')}</h1>
        <p className="text-muted-foreground">{t('adminOrSuperAdminOnlyPage')}</p>
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
          <Link href="/admin/dashboard"><LayoutDashboard className="mr-2 h-4 w-4" /><span>{t('dashboard')}</span></Link>
        </DropdownMenuItem>
        <DropdownMenuItem asChild>
          <Link href="/admin/profile"><UserCircle className="mr-2 h-4 w-4" /><span>{t('userProfile')}</span></Link>
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
            <AdminSidebarNav />
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
