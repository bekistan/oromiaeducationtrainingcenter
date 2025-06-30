
"use client";

import Link from "next/link";
import { SITE_NAME, FOOTER_LINKS } from "@/constants";
import { useLanguage } from "@/hooks/use-language";
import { Logo } from "@/components/shared/logo";

export function Footer() {
  const { t } = useLanguage();
  const currentYear = new Date().getFullYear();

  return (
    <footer className="border-t bg-card text-card-foreground">
      <div className="container py-8">
        <div className="flex flex-col md:flex-row justify-between items-center gap-8">
          <div className="flex flex-col items-center md:items-start">
            <Logo />
            <p className="text-sm text-muted-foreground mt-2 max-w-xs text-center md:text-left">
              {t('tagline')}
            </p>
          </div>
          <div className="flex flex-col md:flex-row gap-8 text-center md:text-left">
             <div>
                <h4 className="font-semibold mb-2">{t('quickLinks')}</h4>
                <ul className="space-y-1">
                    {FOOTER_LINKS.map(link => (
                      <li key={link.href}>
                        <Link href={link.href} className="text-sm text-muted-foreground hover:text-primary transition-colors">
                            {t(link.labelKey)}
                        </Link>
                      </li>
                    ))}
                </ul>
             </div>
             <div>
                <h4 className="font-semibold mb-2">{t('contactUs')}</h4>
                 <ul className="space-y-1">
                    <li><p className="text-sm text-muted-foreground">{t('addressPlaceholder')}</p></li>
                    <li><p className="text-sm text-muted-foreground">{t('generalPhoneNumberPlaceholder')}</p></li>
                    <li><p className="text-sm text-muted-foreground">{t('generalEmailAddressPlaceholder')}</p></li>
                </ul>
             </div>
          </div>
        </div>
        <div className="mt-8 border-t pt-6 text-center text-sm text-muted-foreground">
            &copy; {currentYear} {SITE_NAME}. {t('allRightsReserved')}.
        </div>
      </div>
    </footer>
  );
}
