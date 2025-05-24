"use client";

import Link from "next/link";
import { SITE_NAME, FOOTER_LINKS } from "@/constants";
import { useLanguage } from "@/hooks/use-language";

export function Footer() {
  const { t } = useLanguage();
  const currentYear = new Date().getFullYear();

  return (
    <footer className="border-t border-border/40">
      <div className="container flex flex-col items-center justify-between gap-4 py-10 md:h-20 md:flex-row md:py-0">
        <div className="flex flex-col items-center gap-4 px-8 md:flex-row md:gap-2 md:px-0">
          <p className="text-center text-sm leading-loose text-muted-foreground md:text-left">
            &copy; {currentYear} {SITE_NAME}. {t('allRightsReserved')}.
          </p>
        </div>
        <div className="flex items-center gap-4">
          {FOOTER_LINKS.map(link => (
            <Link
              key={link.href}
              href={link.href}
              className="text-sm text-muted-foreground hover:text-foreground transition-colors"
            >
              {t(link.labelKey)}
            </Link>
          ))}
        </div>
      </div>
    </footer>
  );
}
