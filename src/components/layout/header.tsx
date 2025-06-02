
"use client";

import Link from "next/link";
import { Logo } from "@/components/shared/logo";
import { Button, buttonVariants } from "@/components/ui/button";
import { LanguageSwitcher } from "./language-switcher";
import { useLanguage } from "@/hooks/use-language";
import { useAuth } from "@/hooks/use-auth";
import { PUBLIC_NAVS } from "@/constants";
import { Sheet, SheetContent, SheetTrigger, SheetTitle } from "@/components/ui/sheet";
import { Menu, LogOutIcon, LayoutDashboard, Loader2, UserCircle } from "lucide-react";
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
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";


export function Header() {
  const { t } = useLanguage();
  const { user, logout, loading } = useAuth();
  const pathname = usePathname();

  const isCompanyRep = user?.role === 'company_representative';
  const isAdminOrSuper = user?.role === 'admin' || user?.role === 'superadmin';

  return (
    <header className="sticky top-0 z-50 w-full border-b border-border/40 bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60">
      <div className="container flex py-4 max-w-screen-2xl items-center justify-between">
        <Logo />
        
        <nav className="hidden md:flex items-center space-x-6 text-sm font-medium">
          {PUBLIC_NAVS.map((item) => {
            const isActive = pathname === item.href || (item.href !== '/' && pathname.startsWith(item.href));
            return (
              <Link
                key={item.href}
                href={item.href}
                className={cn(
                  "transition-colors hover:text-foreground/80",
                  isActive ? "text-primary font-semibold" : "text-foreground/60"
                )}
              >
                {t(item.labelKey)}
              </Link>
            );
          })}
           {isCompanyRep && user.approvalStatus === 'approved' && !pathname.startsWith('/company/dashboard') && (
            <Link
              href="/company/dashboard"
              className={cn(
                "transition-colors hover:text-foreground/80",
                 pathname.startsWith("/company/dashboard") ? "text-primary font-semibold" : "text-foreground/70"
              )}
            >
              <LayoutDashboard className="mr-1 h-4 w-4 inline-block" />{t('dashboard')}
            </Link>
          )}
        </nav>

        <div className="flex items-center space-x-2">
          <LanguageSwitcher />
          
          {loading ? (
             <Button variant="ghost" size="icon" className="h-9 w-9" disabled>
                <Loader2 className="h-4 w-4 animate-spin" />
             </Button>
          ) : user ? (
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button variant="ghost" size="icon" className="rounded-full">
                  <UserCircle className="h-6 w-6" />
                  <span className="sr-only">{t('openUserMenu')}</span>
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent className="w-56" align="end" forceMount>
                <DropdownMenuLabel className="font-normal">
                  <div className="flex flex-col space-y-1">
                    <p className="text-sm font-medium leading-none">
                      {user.name || user.companyName || t('user')}
                    </p>
                    <p className="text-xs leading-none text-muted-foreground">
                      {user.email} ({t(user.role)})
                    </p>
                  </div>
                </DropdownMenuLabel>
                <DropdownMenuSeparator />
                {isAdminOrSuper && (
                  <DropdownMenuItem asChild>
                    <Link href="/admin/dashboard">
                      <LayoutDashboard className="mr-2 h-4 w-4" />
                      <span>{t('adminDashboard')}</span>
                    </Link>
                  </DropdownMenuItem>
                )}
                {isCompanyRep && user.approvalStatus === 'approved' && (
                  <DropdownMenuItem asChild>
                    <Link href="/company/dashboard">
                      <LayoutDashboard className="mr-2 h-4 w-4" />
                      <span>{t('dashboard')}</span>
                    </Link>
                  </DropdownMenuItem>
                )}
                {(isAdminOrSuper || (isCompanyRep && user.approvalStatus === 'approved')) && <DropdownMenuSeparator />}
                <DropdownMenuItem onClick={logout} className="text-destructive focus:bg-destructive/10 focus:text-destructive">
                  <LogOutIcon className="mr-2 h-4 w-4" />
                  <span>{t('logout')}</span>
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          ) : (
            <>
              <Button asChild variant="outline" size="sm">
                <Link href="/auth/login">{t('login')}</Link>
              </Button>
              <Button asChild size="sm" className="hidden sm:inline-flex">
                 <Link href="/auth/register-company">{t('registerCompanyButton')}</Link> 
              </Button>
            </>
          )}

          <Sheet>
            <SheetTrigger asChild>
              <Button variant="ghost" size="icon" className="md:hidden">
                <Menu className="h-6 w-6" />
                <span className="sr-only">{t('toggleMenu')}</span>
              </Button>
            </SheetTrigger>
            <SheetContent side="right" className="w-[300px] sm:w-[400px]">
              <SheetTitle className="sr-only">
                {t('navigationMenu')}
              </SheetTitle>
              <nav className="flex flex-col space-y-4 mt-8">
                {PUBLIC_NAVS.map((item) => {
                  const isActive = pathname === item.href || (item.href !== '/' && pathname.startsWith(item.href));
                  return (
                    <Link
                      key={item.href}
                      href={item.href}
                      className={cn(
                        "transition-colors hover:text-foreground/80 text-lg",
                        isActive ? "text-primary font-semibold" : "text-foreground/60"
                      )}
                    >
                      {t(item.labelKey)}
                    </Link>
                  );
                })}
                {isCompanyRep && user?.approvalStatus === 'approved' && (
                  <Link 
                    href="/company/dashboard" 
                    className={cn(
                        "transition-colors hover:text-foreground/80 text-lg",
                        pathname.startsWith("/company/dashboard") ? "text-primary font-semibold" : "text-foreground/70"
                    )}>
                      <LayoutDashboard className="mr-2 h-5 w-5 inline-block" />{t('dashboard')}
                  </Link>
                )}
                 {!user && !loading && (
                   <>
                    <Link href="/auth/login" className="transition-colors hover:text-foreground/80 text-foreground/60 text-lg">
                      {t('login')}
                    </Link>
                    <Link href="/auth/register-company" className="transition-colors hover:text-foreground/80 text-foreground/60 text-lg">
                      {t('registerCompanyButton')}
                    </Link>
                   </>
                )}
                {user && !loading && (
                   <Button onClick={logout} variant="ghost" className="text-destructive hover:text-destructive-foreground hover:bg-destructive justify-start text-lg p-0">
                    <LogOutIcon className="mr-2 h-5 w-5" />{t('logout')}
                   </Button>
                )}
              </nav>
            </SheetContent>
          </Sheet>
        </div>
      </div>
    </header>
  );
}

    