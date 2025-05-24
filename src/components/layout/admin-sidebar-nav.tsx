"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { cn } from "@/lib/utils";
import { useLanguage } from "@/hooks/use-language";
import { ADMIN_NAVS } from "@/constants";
import { ScrollArea } from "@/components/ui/scroll-area";
import { 
  Sidebar, 
  SidebarMenu, 
  SidebarMenuItem, 
  SidebarMenuButton,
  SidebarGroup,
  SidebarGroupLabel
} from "@/components/ui/sidebar"; 
import { 
  LayoutDashboard, 
  Bed, 
  Building, 
  ListChecks, 
  FileText, 
  UserCircle 
} from "lucide-react";
import type { LucideIcon } from "lucide-react";

const ICONS: Record<string, LucideIcon> = {
  dashboard: LayoutDashboard,
  manageDormitories: Bed,
  manageHalls: Building,
  manageBookings: ListChecks,
  reports: FileText,
  userProfile: UserCircle,
};

export function AdminSidebarNav() {
  const pathname = usePathname();
  const { t } = useLanguage();

  return (
    <ScrollArea className="h-full py-4">
      <SidebarMenu>
        <SidebarGroup>
          <SidebarGroupLabel className="sr-only">{t('adminNavigation')}</SidebarGroupLabel> {/* Add to JSON */}
            {ADMIN_NAVS.map((item) => {
              const Icon = ICONS[item.labelKey] || LayoutDashboard;
              return (
                <SidebarMenuItem key={item.href}>
                  <Link href={item.href} passHref legacyBehavior>
                    <SidebarMenuButton
                      isActive={pathname === item.href || (item.href !== '/admin/dashboard' && pathname.startsWith(item.href))}
                      tooltip={t(item.labelKey)}
                      className="justify-start"
                    >
                      <Icon className="mr-2 h-5 w-5" />
                      <span className="group-data-[collapsible=icon]:hidden">{t(item.labelKey)}</span>
                    </SidebarMenuButton>
                  </Link>
                </SidebarMenuItem>
              );
            })}
        </SidebarGroup>
      </SidebarMenu>
    </ScrollArea>
  );
}
