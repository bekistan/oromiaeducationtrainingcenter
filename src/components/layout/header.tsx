
"use client";

import Link from "next/link";
import { Logo } from "@/components/shared/logo";
import { Button } from "@/components/ui/button";
import { LanguageSwitcher } from "./language-switcher";
import { useLanguage } from "@/hooks/use-language";
import { useAuth } from "@/hooks/use-auth";
import { PUBLIC_NAVS } from "@/constants";
import { Sheet, SheetContent, SheetTrigger, SheetTitle } from "@/components/ui/sheet";
import { Menu, LogOutIcon, LayoutDashboard, Loader2, UserCircle, ChevronDown } from "lucide-react";
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

export function Header() {
  const { t } = useLanguage();
  const { user, logout, loading } = useAuth();
  const pathname = usePathname();

  const getDashboardPath = () => {
    if (!user) return null;
    if (user.role === 'admin' || user.role === 'superadmin') return '/admin/dashboard';
    if (user.role === 'company_representative' && user.approvalStatus === 'approved') return '/company/dashboard';
    if (user.role === 'keyholder') return '/keyholder/dashboard';
    return null;
  };

  const dashboardPath = getDashboardPath();

  const navLinks = (
    <>
      {PUBLIC_NAVS.map((item) => {
        const isActive = item.href && (pathname === item.href || (item.href !== '/' && pathname.startsWith(item.href)));
        return (
          <Link
            key={item.labelKey}
            href={item.href!}
            className={cn(
              "transition-colors hover:text-foreground/80 text-sm font-medium",
              isActive ? "text-primary font-semibold" : "text-foreground/60"
            )}
          >
            {t(item.labelKey)}
          </Link>
        );
      })}
    </>
  );

  const userMenu = user && (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button variant="ghost" className="relative h-8 w-8 rounded-full">
          <UserCircle className="h-8 w-8" />
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
        <DropdownMenuItem onClick={logout} className="text-destructive focus:bg-destructive/10">
          <LogOutIcon className="mr-2 h-4 w-4" />
          <span>{t('logout')}</span>
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  );

  const authButtons = !user && (
    <>
      <Button asChild variant="ghost" size="sm"><Link href="/auth/login">{t('login')}</Link></Button>
      <Button asChild size="sm"><Link href="/auth/register-company">{t('register')}</Link></Button>
    </>
  );

  return (
    <header className="sticky top-0 z-50 w-full border-b border-border/40 bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60">
      <div className="container flex h-16 items-center justify-between">
        <div className="flex items-center gap-6">
          <Link href="/" className="mr-4"><Logo /></Link>
          <nav className="hidden md:flex items-center gap-6">{navLinks}</nav>
        </div>
        
        <div className="flex items-center gap-2">
          <div className="hidden md:flex items-center gap-2">
            {loading ? <Loader2 className="h-5 w-5 animate-spin" /> : user ? userMenu : authButtons}
          </div>
          <LanguageSwitcher />
          <div className="md:hidden">
            <Sheet>
              <SheetTrigger asChild><Button variant="ghost" size="icon"><Menu className="h-6 w-6" /></Button></SheetTrigger>
              <SheetContent side="right">
                <SheetTitle><Logo /></SheetTitle>
                <div className="flex flex-col h-full">
                  <nav className="flex flex-col gap-4 mt-8">{navLinks}</nav>
                  <div className="mt-auto pt-4 border-t">
                    {loading ? <Loader2 className="h-5 w-5 animate-spin" /> : user ? (
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
      </div>
    </header>
  );
}
