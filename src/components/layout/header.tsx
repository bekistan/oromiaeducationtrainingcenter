"use client";

import Link from "next/link";
import { Logo } from "@/components/shared/logo";
import { Button } from "@/components/ui/button";
import { LanguageSwitcher } from "./language-switcher";
import { useLanguage } from "@/hooks/use-language";
import { useAuth } from "@/hooks/use-auth";
import { PUBLIC_NAVS } from "@/constants";
import { Sheet, SheetContent, SheetTrigger, SheetTitle, SheetClose } from "@/components/ui/sheet";
import { Menu, LogOutIcon, LayoutDashboard, Loader2, UserCircle, ChevronDown, Phone, Mail, FileText, Bell } from "lucide-react";
import { cn } from "@/lib/utils";
import { usePathname } from "next/navigation";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { useState, useEffect, useRef, useCallback } from "react";
import { onSnapshot, collection, query, where, Timestamp } from 'firebase/firestore';
import { db } from '@/lib/firebase';
import { useToast } from "@/hooks/use-toast";
import { ToastAction } from "@/components/ui/toast";
import { Badge } from "@/components/ui/badge";
import type { AdminNotification } from "@/types";


export function Header() {
  const { t } = useLanguage();
  const { user, logout, loading } = useAuth();
  const { toast } = useToast();
  const pathname = usePathname();
  const [isVisible, setIsVisible] = useState(true);
  const lastScrollY = useRef(0);
  const [lastNotificationTimestamp, setLastNotificationTimestamp] = useState<Timestamp | null>(null);

  const controlNavbar = useCallback(() => {
    if (typeof window !== 'undefined') {
      if (window.scrollY > lastScrollY.current && window.scrollY > 150) {
        setIsVisible(false);
      } else {
        setIsVisible(true);
      }
      lastScrollY.current = window.scrollY;
    }
  }, []);

  useEffect(() => {
    if (typeof window !== 'undefined') {
      window.addEventListener('scroll', controlNavbar);
      return () => {
        window.removeEventListener('scroll', controlNavbar);
      };
    }
  }, [controlNavbar]);
  
   // Centralized notification listener
  useEffect(() => {
    if (!user || !user.role || !db) return;

    // Roles that should receive real-time popups
    const listenableRoles: Array<typeof user.role> = ['admin', 'superadmin', 'keyholder', 'company_representative'];
    if (!listenableRoles.includes(user.role)) return;

    // Set initial timestamp to avoid showing old notifications on login
    const initialTimestamp = Timestamp.now();
    setLastNotificationTimestamp(initialTimestamp);

    const q = query(
      collection(db, "notifications"),
      where("recipientRole", "==", user.role),
      where("createdAt", ">", initialTimestamp)
    );

    const unsubscribe = onSnapshot(q, (snapshot) => {
      snapshot.docChanges().forEach((change) => {
        const notificationData = change.doc.data() as AdminNotification;
        
        // Final check to ensure it's a new notification and for the correct user if targeted
        if (change.type === "added" && (!notificationData.recipientId || notificationData.recipientId === user.id)) {
            let toastTitle = t('newNotification'); // Default title
            if (notificationData.type === 'key_assignment_pending') toastTitle = `🔑 ${t('newKeyAssignmentTitle')}`;
            if (notificationData.type.includes('agreement')) toastTitle = `📝 ${t('agreementUpdate')}`;

            toast({
              title: toastTitle,
              description: notificationData.message,
              action: notificationData.link ? (
                <ToastAction altText={t('view')} asChild>
                  <Link href={notificationData.link}>{t('view')}</Link>
                </ToastAction>
              ) : undefined,
              duration: 15000,
            });
        }
      });
    }, (error) => {
      console.error(`Notification listener error for role ${user.role}:`, error);
    });

    return () => unsubscribe();
  }, [user, t, toast]);


  const getDashboardPath = () => {
    if (!user) return null;
    if (user.role === 'admin' || user.role === 'superadmin') return '/admin/dashboard';
    if (user.role === 'company_representative' && user.approvalStatus === 'approved') return '/company/dashboard';
    if (user.role === 'keyholder') return '/keyholder/dashboard';
    if (user.role === 'store_manager') return '/store-manager/dashboard';
    return null;
  };

  const dashboardPath = getDashboardPath();

  const userMenu = user && (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button variant="ghost" className="flex items-center gap-1.5 px-2">
          <UserCircle className="h-5 w-5" />
          <span className="font-medium truncate max-w-[100px]">{user.name || user.companyName}</span>
          <ChevronDown className="h-4 w-4" />
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent className="w-56" align="end" forceMount>
        <DropdownMenuLabel className="font-normal">
          <div className="flex flex-col space-y-1">
            <p className="text-sm font-medium leading-none">{user.name || user.companyName}</p>
            <p className="text-xs leading-none text-muted-foreground">{user.email}</p>
          </div>
        </DropdownMenuLabel>
        <DropdownMenuSeparator />
        {dashboardPath && (
          <DropdownMenuItem asChild>
            <Link href={dashboardPath}><LayoutDashboard className="mr-2 h-4 w-4" /><span>{t('dashboard')}</span></Link>
          </DropdownMenuItem>
        )}
        {(user.role === 'admin' || user.role === 'superadmin') && (
            <DropdownMenuItem asChild>
                <Link href="/admin/profile"><UserCircle className="mr-2 h-4 w-4" /><span>{t('userProfile')}</span></Link>
            </DropdownMenuItem>
        )}
         {(user.role === 'admin' || user.role === 'superadmin') && (
            <DropdownMenuItem asChild>
                <Link href="/admin/notifications" className="flex justify-between items-center w-full">
                    <span className="flex items-center"><Bell className="mr-2 h-4 w-4" />{t('notifications')}</span>
                </Link>
            </DropdownMenuItem>
        )}
        <DropdownMenuSeparator />
        <DropdownMenuItem onClick={logout} className="text-destructive focus:bg-destructive focus:text-destructive-foreground">
          <LogOutIcon className="mr-2 h-4 w-4" />
          <span>{t('logout')}</span>
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  );

  const authButtons = !user && (
    <div className="flex items-center gap-x-2">
      <Button asChild variant="link" size="sm" className="px-1">
        <Link href="/auth/login">{t('login')}</Link>
      </Button>
      <span className="text-muted-foreground">|</span>
      <Button asChild variant="link" size="sm" className="px-1">
        <Link href="/auth/register-company">{t('register')}</Link>
      </Button>
    </div>
  );

  return (
    <header className={cn(
      "sticky top-0 z-50 w-full bg-background/95 backdrop-blur-sm text-foreground shadow-lg transition-transform duration-300 ease-in-out",
      !isVisible && "-translate-y-full"
    )}>
      {/* Top Bar */}
      <div className="hidden md:block border-b border-border">
        <div className="container flex h-10 items-center justify-end text-xs font-medium">
          <div className="flex items-center gap-x-4 lg:gap-x-6">
            <a href={`tel:${t('generalPhoneNumberPlaceholder')}`} className="flex items-center gap-1.5 hover:text-primary transition-colors">
              <Phone className="h-4 w-4" />
              <span className="truncate">{t('generalPhoneNumberPlaceholder')}</span>
            </a>
            <a href={`mailto:${t('generalEmailAddressPlaceholder')}`} className="flex items-center gap-1.5 hover:text-primary transition-colors">
              <Mail className="h-4 w-4" />
              <span className="truncate">{t('generalEmailAddressPlaceholder')}</span>
            </a>
            <LanguageSwitcher />
            <div className="w-px h-5 bg-border"></div>
            {loading ? <Loader2 className="h-5 w-5 animate-spin" /> : user ? userMenu : authButtons}
          </div>
        </div>
      </div>

      {/* Main Header Bar */}
      <div className="container flex h-20 items-center justify-between">
        <Logo />

        <nav className="hidden md:flex items-center gap-x-4 lg:gap-x-8">
            {PUBLIC_NAVS.map((item) => {
              const isParentActive = item.children ? item.children.some(child => child.href && pathname.startsWith(child.href)) : item.href && pathname.startsWith(item.href);
              
              if (item.children) {
                return (
                  <DropdownMenu key={item.labelKey}>
                    <DropdownMenuTrigger asChild>
                      <Button variant="ghost" className={cn(
                        "flex items-center gap-1 p-0 text-base font-medium focus-visible:ring-0 hover:bg-transparent hover:text-primary data-[state=open]:text-primary",
                        isParentActive ? "text-primary font-semibold" : "text-foreground"
                      )}>
                        {t(item.labelKey)}
                        <ChevronDown className="h-4 w-4" />
                      </Button>
                    </DropdownMenuTrigger>
                    <DropdownMenuContent>
                      {item.children.map((child) => (
                        <DropdownMenuItem key={child.labelKey} asChild>
                          <Link href={child.href!}>{t(child.labelKey)}</Link>
                        </DropdownMenuItem>
                      ))}
                    </DropdownMenuContent>
                  </DropdownMenu>
                );
              }
              
              const isActive = item.href && (pathname === item.href || (item.href !== '/' && pathname.startsWith(item.href)));
              return (
                <Link
                  key={item.labelKey}
                  href={item.href!}
                  className={cn(
                    "transition-colors text-base font-medium hover:text-primary",
                    isActive ? "text-primary font-semibold" : "text-foreground"
                  )}
                >
                  {t(item.labelKey)}
                </Link>
              );
            })}
          </nav>
        
        {/* Mobile Menu Trigger */}
        <div className="md:hidden flex items-center gap-2">
           <LanguageSwitcher />
          <Sheet>
              <SheetTrigger asChild><Button variant="ghost" size="icon" className="text-foreground hover:bg-secondary"><Menu className="h-6 w-6" /></Button></SheetTrigger>
              <SheetContent side="right" className="flex flex-col">
                <SheetTitle><Logo /></SheetTitle>
                <div className="flex flex-col h-full mt-4">
                   <nav className="flex flex-col gap-1 text-lg">
                    {user && dashboardPath && (
                      <SheetClose asChild>
                        <Link href={dashboardPath} className={cn("rounded-md p-2 transition-colors hover:bg-muted font-semibold text-primary flex items-center gap-2", pathname.includes('/admin') || pathname.includes('/company') || pathname.includes('/keyholder') || pathname.includes('/store-manager') ? "bg-muted" : "")}>
                          <LayoutDashboard className="h-5 w-5" />{t('dashboard')}
                        </Link>
                      </SheetClose>
                    )}
                     {PUBLIC_NAVS.map((item) => {
                        if (item.children) {
                          return (
                            <div key={item.labelKey} className="px-2 py-1.5">
                              <h4 className="font-semibold text-foreground/80 mb-2">{t(item.labelKey)}</h4>
                              <div className="flex flex-col gap-1 pl-2 border-l">
                                {item.children.map((child) => {
                                  const isActive = child.href && (pathname === child.href || (child.href !== '/' && pathname.startsWith(child.href)));
                                  return (
                                    <SheetClose asChild key={child.labelKey}>
                                      <Link href={child.href!} className={cn("rounded-md p-2 transition-colors hover:bg-muted", isActive ? "text-primary font-semibold bg-muted" : "")}>
                                        {t(child.labelKey)}
                                      </Link>
                                    </SheetClose>
                                  )
                                })}
                              </div>
                            </div>
                          )
                        }
                        const isActive = item.href && (pathname === item.href || (item.href !== '/' && pathname.startsWith(item.href)));
                        return (
                          <SheetClose asChild key={item.labelKey}>
                              <Link href={item.href!} className={cn("rounded-md p-2 transition-colors hover:bg-muted", isActive ? "text-primary font-semibold bg-muted" : "")}>
                                {t(item.labelKey)}
                              </Link>
                          </SheetClose>
                        )
                      })}
                  </nav>

                  <div className="mt-auto pt-6 border-t">
                    {loading ? <div className="flex justify-center"><Loader2 className="h-6 w-6 animate-spin" /></div> : user ? (
                      <div className="flex items-center justify-between">
                        <div className="text-sm">
                          <p className="font-semibold">{user.name || user.companyName}</p>
                          <p className="text-xs text-muted-foreground">{user.email}</p>
                        </div>
                        <Button variant="ghost" size="icon" onClick={logout}><LogOutIcon className="h-5 w-5 text-destructive" /></Button>
                      </div>
                    ) : (
                      <div className="flex flex-col gap-2">{authButtons}</div>
                    )}
                  </div>
                </div>
              </SheetContent>
            </Sheet>
        </div>
      </div>
    </header>
  );
}
