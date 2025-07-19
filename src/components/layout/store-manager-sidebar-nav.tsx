
"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useLanguage } from "@/hooks/use-language";
import { useAuth } from "@/hooks/use-auth"; 
import { STORE_MANAGER_NAVS } from "@/constants";
import { ScrollArea } from "@/components/ui/scroll-area";
import { 
  SidebarMenu, 
  SidebarMenuButton,
} from "@/components/ui/sidebar"; 
import { 
  LayoutDashboard,
  FileText,
  Warehouse,
  ArrowRightLeft
} from "lucide-react";
import type { LucideIcon } from "lucide-react";

const ICONS: Record<string, LucideIcon> = {
  storeDashboard: LayoutDashboard,
  manageStock: Warehouse,
  manageTransactions: ArrowRightLeft,
  storeReports: FileText,
};

export function StoreManagerSidebarNav() {
  const pathname = usePathname();
  const { t } = useLanguage();
  const { user, loading } = useAuth(); 

  if (loading) {
    return <ScrollArea className="h-full py-4"><p className="p-4 text-muted-foreground">{t('loading')}...</p></ScrollArea>;
  }
  
  if (user?.role !== 'store_manager') {
      return null;
  }

  return (
    <ScrollArea className="h-full p-2">
      <SidebarMenu>
        {STORE_MANAGER_NAVS.map((item) => {
          const Icon = ICONS[item.labelKey] || LayoutDashboard; 
          return (
            <Link key={item.href} href={item.href!} passHref legacyBehavior>
              <SidebarMenuButton
                isActive={pathname === item.href || (item.href !== '/store-manager/dashboard' && pathname.startsWith(item.href))}
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
