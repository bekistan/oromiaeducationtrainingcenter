
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

  const userMenu = user && (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button variant="outline" className="flex items-center gap-1.5 px-3">
          <UserCircle className="h-5 w-5 text-muted-foreground" />
          <span className="font-medium truncate max-w-[100px]">{user.name || user.companyName}</span>
          <ChevronDown className="h-4 w-4 text-muted-foreground" />
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
        <DropdownMenuSeparator />
        <DropdownMenuItem onClick={logout} className="text-destructive focus:bg-destructive focus:text-destructive-foreground">
          <LogOutIcon className="mr-2 h-4 w-4" />
          <span>{t('logout')}</span>
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  );

  const authButtons = !user && (
    <>
      <Button asChild variant="outline" size="sm"><Link href="/auth/login">{t('login')}</Link></Button>
      <Button asChild size="sm"><Link href="/auth/register-company">{t('register')}</Link></Button>
    </>
  );

  return (
    <header className="sticky top-0 z-50 w-full border-b border-border/40 bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60">
      <div className="container flex h-16 items-center justify-between">
        <div className="flex items-center gap-6">
          <Link href="/" className="mr-4"><Logo /></Link>
          <nav className="hidden md:flex items-center gap-6">
            {PUBLIC_NAVS.map((item) => {
              const isParentActive = item.children ? item.children.some(child => child.href && pathname.startsWith(child.href)) : item.href && pathname.startsWith(item.href);
              
              if (item.children) {
                return (
                  <DropdownMenu key={item.labelKey}>
                    <DropdownMenuTrigger asChild>
                      <Button variant="ghost" className={cn(
                        "flex items-center gap-1 p-0 text-sm font-medium focus-visible:ring-0",
                        isParentActive ? "text-primary font-semibold" : "text-foreground/60",
                        "hover:text-foreground/80"
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
                    "transition-colors hover:text-foreground/80 text-sm font-medium",
                    isActive ? "text-primary font-semibold" : "text-foreground/60"
                  )}
                >
                  {t(item.labelKey)}
                </Link>
              );
            })}
          </nav>
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
                  <nav className="flex flex-col gap-2 mt-8">
                     {PUBLIC_NAVS.map((item) => {
                        if (item.children) {
                          return (
                            <div key={item.labelKey} className="px-2 py-1.5">
                              <h4 className="font-semibold text-foreground/80 mb-2">{t(item.labelKey)}</h4>
                              <div className="flex flex-col gap-1 pl-2 border-l">
                                {item.children.map((child) => {
                                  const isActive = child.href && (pathname === child.href || (child.href !== '/' && pathname.startsWith(child.href)));
                                  return (
                                    <Link key={child.labelKey} href={child.href!} className={cn("rounded-md p-2 transition-colors hover:bg-muted", isActive ? "text-primary font-semibold bg-muted" : "")}>
                                      {t(child.labelKey)}
                                    </Link>
                                  )
                                })}
                              </div>
                            </div>
                          )
                        }
                        const isActive = item.href && (pathname === item.href || (item.href !== '/' && pathname.startsWith(item.href)));
                        return (
                          <Link key={item.labelKey} href={item.href!} className={cn("rounded-md p-2 transition-colors hover:bg-muted", isActive ? "text-primary font-semibold bg-muted" : "")}>
                            {t(item.labelKey)}
                          </Link>
                        )
                      })}
                  </nav>
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
