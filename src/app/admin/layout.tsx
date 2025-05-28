
"use client"; // Required for SidebarProvider and its hooks

import type { ReactNode } from 'react';
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
import { LogOut, UserCircle, Loader2 } from "lucide-react"; // Added Loader2 for loading state
import Link from "next/link";
import { useLanguage } from '@/hooks/use-language';
import { useAuth } from '@/hooks/use-auth'; // Import useAuth
import { useRouter } from 'next/navigation'; // Import useRouter for redirection
import { useToast } from '@/hooks/use-toast'; // Import useToast for notifications

interface AdminLayoutProps {
  children: ReactNode;
}

export default function AdminLayout({ children }: AdminLayoutProps) {
  const { t } = useLanguage();
  const { user, logout, loading: authLoading } = useAuth(); // Get user, logout, and loading state
  const router = useRouter();
  const { toast } = useToast();
  const [isLoggingOut, setIsLoggingOut] = React.useState(false);

  const handleLogout = async () => {
    setIsLoggingOut(true);
    try {
      await logout();
      toast({ title: t('logoutSuccessfulTitle'), description: t('logoutSuccessfulMessage') }); // Add keys to JSON
      router.push('/auth/login');
    } catch (error) {
      console.error("Logout failed:", error);
      toast({ variant: "destructive", title: t('logoutFailedTitle'), description: t('logoutFailedMessage') }); // Add keys to JSON
      setIsLoggingOut(false);
    }
    // No need to setIsLoggingOut(false) on success because page will redirect
  };

  const displayName = user?.name || user?.email || t('adminUser'); // Fallback display name
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
