

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
  SidebarGroupLabel,
  SidebarMenuSub,
  SidebarMenuSubButton,
  SidebarMenuSubItem,
  useSidebar
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
  Bell,
  ChevronDown
} from "lucide-react";
import type { LucideIcon } from "lucide-react";
import * as React from "react"
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from "@/components/ui/collapsible"


const ICONS: Record<string, LucideIcon> = {
  dashboard: LayoutDashboard,
  notifications: Bell,
  manageDormitories: Bed,
  manageHalls: Building,
  manageDormitoryBookings: BedDouble,
  manageFacilityBookings: ListChecks,
  manageCompanies: Users,
  reports: FileText,
  userManagement: UserPlus,
  userProfile: UserCircle,
  manageSettings: Settings, 
  generalSettings: Settings,
  financialManagement: DollarSign,
  agreementTemplate: FileText,
  registerAdmin: UserPlus,
  registerKeyholder: KeyRound,
};

export function AdminSidebarNav() {
  const pathname = usePathname();
  const { t } = useLanguage();
  const { user, loading } = useAuth(); 
  const { state: sidebarState } = useSidebar();

  const isSubpathActive = (href?: string) => {
    if (!href) return false;
    return pathname === href || (href !== '/admin/dashboard' && pathname.startsWith(href));
  }

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
              if (!user || !item.roles.includes(user.role)) return false; 
              if (user.role === 'admin' && user.buildingAssignment && item.generalAdminOnly) {
                  return false;
              }
              return true;
            }).map((item) => {
              const Icon = ICONS[item.labelKey] || LayoutDashboard; 
              
              if (item.children && item.children.length > 0) {
                 const isParentActive = item.children.some(child => isSubpathActive(child.href));
                 return (
                  <Collapsible key={item.labelKey} defaultOpen={isParentActive} className="w-full">
                     <CollapsibleTrigger asChild>
                       <SidebarMenuButton
                         isActive={isParentActive && sidebarState === 'expanded'}
                         tooltip={t(item.labelKey)}
                         className="justify-between w-full"
                       >
                         <div className="flex items-center gap-2">
                           <Icon className="h-5 w-5" />
                           <span className="group-data-[collapsible=icon]:hidden">{t(item.labelKey)}</span>
                         </div>
                         <ChevronDown className="h-4 w-4 group-data-[collapsible=icon]:hidden transition-transform [&[data-state=open]]:-rotate-180" />
                       </SidebarMenuButton>
                     </CollapsibleTrigger>
                     <CollapsibleContent>
                        <SidebarMenuSub className="mt-1">
                          {item.children.map(child => (
                             <SidebarMenuSubItem key={child.href}>
                               <Link href={child.href!} passHref legacyBehavior>
                                 <SidebarMenuSubButton isActive={isSubpathActive(child.href)} className="gap-2">
                                     <span className="group-data-[collapsible=icon]:hidden">{t(child.labelKey)}</span>
                                 </SidebarMenuSubButton>
                               </Link>
                             </SidebarMenuSubItem>
                          ))}
                        </SidebarMenuSub>
                     </CollapsibleContent>
                  </Collapsible>
                 )
              }

              return (
                <SidebarMenuItem key={item.href}>
                  <Link href={item.href!} passHref legacyBehavior>
                    <SidebarMenuButton
                      isActive={isSubpathActive(item.href)}
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
