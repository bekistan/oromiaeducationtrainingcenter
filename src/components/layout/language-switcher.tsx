
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
import { ChevronDown } from "lucide-react"; // Changed from Languages
import { useMemo } from "react";

export function LanguageSwitcher() {
  const { locale, setLocale, t } = useLanguage();

  const currentLanguageDisplay = useMemo(() => {
    const current = SUPPORTED_LOCALES.find(l => l.code === locale);
    return current ? current.code.toUpperCase() : locale.toUpperCase();
  }, [locale]);

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button variant="ghost" size="sm" className="flex items-center gap-1 px-2">
          <span>{currentLanguageDisplay}</span>
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
            className={locale === supportedLocale.code ? "bg-accent text-accent-foreground" : ""}
          >
            {supportedLocale.name} ({supportedLocale.code.toUpperCase()})
          </DropdownMenuItem>
        ))}
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
