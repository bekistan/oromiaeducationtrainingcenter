
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
import { Languages } from "lucide-react"; // Changed from Globe to Languages

export function LanguageSwitcher() {
  const { locale, setLocale } = useLanguage();

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button variant="ghost" size="icon">
          <Languages className="h-5 w-5" /> {/* Changed from Globe to Languages */}
          <span className="sr-only">Change language</span>
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end">
        {SUPPORTED_LOCALES.map((supportedLocale) => (
          <DropdownMenuItem
            key={supportedLocale.code}
            disabled={locale === supportedLocale.code}
            onClick={() => setLocale(supportedLocale.code)}
          >
            {supportedLocale.name}
          </DropdownMenuItem>
        ))}
      </DropdownMenuContent>
    </DropdownMenu>
  );
}

