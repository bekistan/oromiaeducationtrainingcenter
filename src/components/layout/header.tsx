
"use client";

import Link from "next/link";
import { Logo } from "@/components/shared/logo";
import { Button, buttonVariants } from "@/components/ui/button"; // Import buttonVariants
import { LanguageSwitcher } from "./language-switcher";
import { useLanguage } from "@/hooks/use-language";
import { useAuth } from "@/hooks/use-auth"; // For mock login buttons
import { PUBLIC_NAVS } from "@/constants";
import { Sheet, SheetContent, SheetTrigger } from "@/components/ui/sheet";
import { Menu, LogOutIcon, UserCheck, UserCog, Building as CompanyIcon, UserCircle } from "lucide-react"; // Added icons for mock login
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { cn } from "@/lib/utils"; // Import cn

export function Header() {
  const { t } = useLanguage();
  const { user, loginAsAdmin, loginAsSuperAdmin, loginAsCompany, loginAsIndividual, logout, loading } = useAuth();

  return (
    <header className="sticky top-0 z-50 w-full border-b border-border/40 bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60">
      <div className="container flex h-16 max-w-screen-2xl items-center justify-between">
        <Logo />
        
        <nav className="hidden md:flex items-center space-x-6 text-sm font-medium">
          {PUBLIC_NAVS.map((item) => (
            <Link
              key={item.href}
              href={item.href}
              className="transition-colors hover:text-foreground/80 text-foreground/60"
            >
              {t(item.labelKey)}
            </Link>
          ))}
        </nav>

        <div className="flex items-center space-x-2">
          <LanguageSwitcher />
          
          {/* Mock Login Buttons for Testing - REMOVE FOR PRODUCTION */}
          {!loading && !user && (
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <button className={cn(buttonVariants({ variant: "outline", size: "sm" }))}>
                  <span>{t('testLogin')}</span>
                </button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end">
                <DropdownMenuLabel>{t('loginAs')}</DropdownMenuLabel> {/* Add 'loginAs' to JSON */}
                <DropdownMenuItem onClick={() => loginAsCompany('approved')}>
                  <CompanyIcon className="mr-2 h-4 w-4" /> {t('companyApproved')} {/* Add to JSON */}
                </DropdownMenuItem>
                <DropdownMenuItem onClick={() => loginAsCompany('pending')}>
                   <CompanyIcon className="mr-2 h-4 w-4 text-orange-500" /> {t('companyPending')} {/* Add to JSON */}
                </DropdownMenuItem>
                <DropdownMenuItem onClick={loginAsIndividual}>
                  <UserCircle className="mr-2 h-4 w-4" /> {t('individualUser')} {/* Add to JSON */}
                </DropdownMenuItem>
                <DropdownMenuSeparator/>
                <DropdownMenuItem onClick={loginAsAdmin}>
                  <UserCog className="mr-2 h-4 w-4" /> {t('admin')}
                </DropdownMenuItem>
                <DropdownMenuItem onClick={loginAsSuperAdmin}>
                  <UserCheck className="mr-2 h-4 w-4" /> {t('superAdmin')} {/* Add to JSON */}
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          )}
          {/* End Mock Login Buttons */}
          
          {user ? (
            <>
              <span className="text-sm text-muted-foreground hidden sm:inline">{user.name || user.email} ({t(user.role)})</span>
              <Button variant="ghost" size="sm" onClick={logout}>
                <LogOutIcon className="mr-1 h-4 w-4"/> {t('logout')}
              </Button>
            </>
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
                <span className="sr-only">Toggle menu</span>
              </Button>
            </SheetTrigger>
            <SheetContent side="right" className="w-[300px] sm:w-[400px]">
              <nav className="flex flex-col space-y-4 mt-8">
                {PUBLIC_NAVS.map((item) => (
                  <Link
                    key={item.href}
                    href={item.href}
                    className="transition-colors hover:text-foreground/80 text-foreground/60 text-lg"
                  >
                    {t(item.labelKey)}
                  </Link>
                ))}
                {!user && (
                   <Link href="/auth/register-company" className="transition-colors hover:text-foreground/80 text-foreground/60 text-lg">
                      {t('registerCompanyButton')}
                    </Link>
                )}
              </nav>
            </SheetContent>
          </Sheet>
        </div>
      </div>
    </header>
  );
}
