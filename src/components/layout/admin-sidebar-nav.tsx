
"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useLanguage } from "@/hooks/use-language";
import { useAuth } from "@/hooks/use-auth"; 
import { ADMIN_NAVS } from "@/constants";
import { ScrollArea } from "@/components/ui/scroll-area";
import { 
  SidebarMenu, 
  SidebarMenuButton,
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
  ChevronDown,
  BookMarked,
  Store,
  Contact
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
  dormitories: Bed,
  halls: Building,
  manageBookings: ListChecks,
  manageDormitories: Bed, 
  manageHalls: Building, 
  manageDormitoryBookings: BedDouble,
  manageFacilityBookings: ListChecks, 
  manageCompanies: Users,
  manageEmployees: Contact,
  manageBlog: BookMarked,
  reports: FileText, 
  userManagement: UserPlus, 
  userProfile: UserCircle,
  manageSettings: Settings, 
  generalSettings: Settings,
  siteContent: Settings,
  financialManagement: DollarSign,
  agreementTemplate: FileText,
  registerAdmin: UserPlus,
  registerKeyholder: KeyRound,
  registerStoreManager: Store,
  siteManagement: Settings,
};

export function AdminSidebarNav() {
  const pathname = usePathname();
  const { t } = useLanguage();
  const { user, loading } = useAuth(); 

  const isSubpathActive = (href?: string, exact: boolean = false) => {
    if (!href) return false;
    if (exact) return pathname === href;
    return pathname === href || (href !== '/admin/dashboard' && pathname.startsWith(href));
  }

  if (loading) {
    return <ScrollArea className="h-full py-4"><p className="p-4 text-muted-foreground">{t('loading')}...</p></ScrollArea>;
  }

  const renderNavs = ADMIN_NAVS.filter(item => {
    if (!user) return false;
    if (!item.roles || item.roles.length === 0) return true; 
    if (!item.roles.includes(user.role)) return false; 
    
    // For parent items with children, show them if any child is visible.
    if (item.children) {
      return item.children.some(child => {
        if (!child.roles || child.roles.length === 0) return true;
        if (!child.roles.includes(user.role)) return false;
        if (user.role === 'admin' && user.buildingAssignment && child.generalAdminOnly) {
          return false;
        }
        return true;
      });
    }

    if (user.role === 'admin' && user.buildingAssignment && item.generalAdminOnly) {
        return false;
    }
    return true;
  });

  return (
    <ScrollArea className="h-full p-2">
      <SidebarMenu>
        {renderNavs.map((item) => {
          const Icon = ICONS[item.labelKey] || LayoutDashboard; 
          const isParentActive = item.children ? item.children.some(child => isSubpathActive(child.href)) : isSubpathActive(item.href, true);
          
          if (item.children && item.children.length > 0) {
             const filteredChildren = item.children.filter(child => {
                if (!user) return false;
                if (!child.roles || child.roles.length === 0) return true;
                if (!child.roles.includes(user.role)) return false;
                if (user.role === 'admin' && user.buildingAssignment && child.generalAdminOnly) {
                    return false;
                }
                return true;
             });

             if (filteredChildren.length === 0) return null;

             return (
              <Collapsible key={item.labelKey} defaultOpen={isParentActive} className="w-full">
                 <CollapsibleTrigger asChild>
                   <SidebarMenuButton
                     isActive={isParentActive}
                     tooltip={t(item.labelKey)}
                     className="justify-between w-full group-data-[collapsible=icon]:justify-center"
                   >
                     <div className="flex items-center gap-2">
                       <Icon className="h-5 w-5" />
                       <span className="group-data-[collapsible=icon]:hidden">{t(item.labelKey)}</span>
                     </div>
                     <ChevronDown className="h-4 w-4 group-data-[collapsible=icon]:hidden transition-transform [&[data-state=open]]:-rotate-180" />
                   </SidebarMenuButton>
                 </CollapsibleTrigger>
                 <CollapsibleContent>
                    <div className="pl-6 group-data-[collapsible=icon]:hidden space-y-1 py-1">
                        {filteredChildren.map(child => (
                            <Link key={child.href} href={child.href!} passHref legacyBehavior>
                                <SidebarMenuButton
                                  isActive={isSubpathActive(child.href, child.href === item.href)}
                                  className="justify-start w-full h-8 text-sm font-normal"
                                  variant="ghost"
                                >
                                 <span className="group-data-[collapsible=icon]:hidden">{t(child.labelKey)}</span>
                                </SidebarMenuButton>
                            </Link>
                        ))}
                    </div>
                 </CollapsibleContent>
              </Collapsible>
             )
          }

          return (
            <Link key={item.href} href={item.href!} passHref legacyBehavior>
                <SidebarMenuButton
                  isActive={isParentActive}
                  tooltip={t(item.labelKey)}
                  className="justify-start"
                >
                  <Icon className="mr-2 h-5 w-5" />
                  <span className="group-data-[collapsible=icon]:hidden">{t(item.labelKey)}</span>
                </SidebarMenuButton>
            </Link>
          );
        })}
      </SidebarMenu>
    </ScrollArea>
  );
}
