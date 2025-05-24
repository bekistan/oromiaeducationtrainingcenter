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
import { LogOut, UserCircle } from "lucide-react";
import Link from "next/link";
import { useLanguage } from '@/hooks/use-language';

interface AdminLayoutProps {
  children: ReactNode;
}

export default function AdminLayout({ children }: AdminLayoutProps) {
  const { t } = useLanguage();

  // Placeholder for user data and logout function
  const user = { name: "Admin User", email: "admin@example.com" }; 
  const handleLogout = () => { alert("Logout clicked (placeholder)"); };

  return (
    <SidebarProvider defaultOpen>
        <Sidebar collapsible="icon" variant="sidebar" side="left">
          <SidebarHeader className="p-4 border-b border-sidebar-border">
            <div className="flex items-center justify-between">
              <Logo />
              {/* SidebarTrigger is usually outside if sidebar is part of a larger layout.
                  Here, assuming it's for mobile or when the main trigger is elsewhere.
                  For this setup, the trigger might be better in an admin header.
                  If the sidebar is always visible on desktop and off-canvas on mobile,
                  this trigger placement might be okay. */}
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
                  <span className="group-data-[collapsible=icon]:hidden">{user.name}</span>
                </Button>
              </Link>
              <Button variant="ghost" onClick={handleLogout} className="w-full text-destructive hover:text-destructive-foreground hover:bg-destructive justify-start group-data-[collapsible=icon]:justify-center group-data-[collapsible=icon]:px-2">
                <LogOut className="h-5 w-5 mr-2 group-data-[collapsible=icon]:mr-0" />
                <span className="group-data-[collapsible=icon]:hidden">{t('logout')}</span>
              </Button>
            </div>
          </SidebarFooter>
        </Sidebar>
        
        <SidebarInset>
          <header className="sticky top-0 z-40 flex h-16 items-center justify-between border-b bg-background px-4 md:px-6 md:justify-end">
            {/* Mobile trigger for sidebar, if needed */}
            <div className="md:hidden">
              <SidebarTrigger />
            </div>
             {/* Other header content for admin area can go here */}
            <div className="hidden md:flex items-center gap-4">
                <span className="text-sm text-muted-foreground">{user.email}</span>
            </div>
          </header>
          <main className="flex-1 p-4 md:p-6 lg:p-8">
            {children}
          </main>
        </SidebarInset>
    </SidebarProvider>
  );
}
