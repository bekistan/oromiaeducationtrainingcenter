"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useLanguage } from "@/hooks/use-language";
import { useAuth } from "@/hooks/use-auth"; 
import { STORE_MANAGER_NAVS } from "@/constants";
import { ScrollArea } from "@/components/ui/scroll-area";
import { 
  SidebarMenu, 
  SidebarMenuBadge,
  SidebarMenuButton,
} from "@/components/ui/sidebar"; 
import { 
  LayoutDashboard,
  FileText,
  Warehouse,
  ArrowRightLeft
} from "lucide-react";
import type { LucideIcon } from "lucide-react";
import { useState, useEffect } from "react";
import { collection, query, where, onSnapshot } from "firebase/firestore";
import { db } from "@/lib/firebase";
import type { AdminNotification } from "@/types";

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
  const [unreadCounts, setUnreadCounts] = useState<Record<string, number>>({});

  useEffect(() => {
    if (!user || user.role !== 'store_manager' || !db) return;

    const notificationTypes = STORE_MANAGER_NAVS
      .map(nav => nav.notificationType)
      .flat()
      .filter((type): type is NonNullable<typeof type> => !!type);

    if (notificationTypes.length === 0) return;

    const q = query(
      collection(db, "notifications"),
      where("recipientRole", "==", "store_manager"),
      where("isRead", "==", false)
    );

    const unsubscribe = onSnapshot(q, (snapshot) => {
      const counts: Record<string, number> = {};
      snapshot.docs.forEach(doc => {
        const notification = doc.data() as AdminNotification;
        const type = notification.type;
        counts[type] = (counts[type] || 0) + 1;
      });
      setUnreadCounts(counts);
    });

    return () => unsubscribe();
  }, [user]);

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
          const notificationTypes = Array.isArray(item.notificationType) 
            ? item.notificationType 
            : item.notificationType ? [item.notificationType] : [];
          
          const notificationCount = notificationTypes.reduce((acc, type) => acc + (unreadCounts[type] || 0), 0);

          return (
            <Link key={item.href} href={item.href!} passHref legacyBehavior>
              <SidebarMenuButton
                isActive={pathname === item.href || (item.href !== '/store-manager/dashboard' && pathname.startsWith(item.href))}
                tooltip={t(item.labelKey)}
                className="justify-start"
              >
                <Icon className="mr-2 h-5 w-5" />
                <span className="group-data-[collapsible=icon]:hidden">{t(item.labelKey)}</span>
                {notificationCount > 0 && <SidebarMenuBadge>{notificationCount}</SidebarMenuBadge>}
              </SidebarMenuButton>
            </Link>
          );
        })}
      </SidebarMenu>
    </ScrollArea>
  );
}
