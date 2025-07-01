
"use client";

import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { useLanguage } from "@/hooks/use-language";
import { SUPPORTED_LOCALES } from '@/constants';
import { ChevronDown, Globe } from "lucide-react";
import { useMemo } from "react";
import { cn } from "@/lib/utils";

export function LanguageSwitcher() {
  const { locale, setLocale, t } = useLanguage();

  const currentLanguageDisplay = useMemo(() => {
    const current = SUPPORTED_LOCALES.find(l => l.code === locale);
    return current ? current.name : locale.toUpperCase();
  }, [locale]);

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button variant="ghost" size="sm" className="flex items-center gap-1 px-2 text-white hover:bg-white/10 hover:text-white focus-visible:ring-offset-0 focus-visible:ring-white/50">
          <Globe className="h-4 w-4" />
          <span className="hidden sm:inline">{currentLanguageDisplay}</span>
          <ChevronDown className="h-4 w-4 opacity-70" />
          <span className="sr-only">{t('changeLanguage')}</span>
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end">
        {SUPPORTED_LOCALES.map((supportedLocale) => (
          <DropdownMenuItem
            key={supportedLocale.code}
            disabled={locale === supportedLocale.code}
            onClick={() => setLocale(supportedLocale.code)}
            className={cn("cursor-pointer", locale === supportedLocale.code ? "bg-accent text-accent-foreground" : "")}
          >
            {supportedLocale.name}
          </DropdownMenuItem>
        ))}
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
