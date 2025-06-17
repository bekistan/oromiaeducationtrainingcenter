
"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { cn } from "@/lib/utils";
import { useLanguage } from "@/hooks/use-language";
import { useAuth } from "@/hooks/use-auth"; 
import { ADMIN_NAVS } from "@/constants";
import { ScrollArea } from "@/components/ui/scroll-area";
import { 
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
  UserCircle,
  UserPlus, 
  Users,
  BedDouble,
  KeyRound,
  Settings,
  DollarSign,
  Bell // Added Bell for notifications
} from "lucide-react";
import type { LucideIcon } from "lucide-react";

const ICONS: Record<string, LucideIcon> = {
  dashboard: LayoutDashboard,
  notifications: Bell, // Added Bell icon for notifications
  manageDormitories: Bed,
  manageHalls: Building,
  manageDormitoryBookings: BedDouble,
  manageFacilityBookings: ListChecks,
  manageCompanies: Users,
  reports: FileText,
  financialManagement: DollarSign,
  userProfile: UserCircle,
  registerAdmin: UserPlus,
  registerKeyholder: KeyRound, 
  manageSettings: Settings, 
};

export function AdminSidebarNav() {
  const pathname = usePathname();
  const { t } = useLanguage();
  const { user, loading } = useAuth(); 

  if (loading) {
    return <ScrollArea className="h-full py-4"><p className="p-4 text-muted-foreground">{t('loading')}...</p></ScrollArea>;
  }

  return (
    <ScrollArea className="h-full py-4">
      <SidebarMenu>
        <SidebarGroup>
          <SidebarGroupLabel className="sr-only">{t('adminNavigation')}</SidebarGroupLabel>
            {ADMIN_NAVS.filter(item => {
              if (!item.roles || item.roles.length === 0) return true; 
              return item.roles.includes(user?.role as never); 
            }).map((item) => {
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
