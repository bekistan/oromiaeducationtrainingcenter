
"use client";

import Link from "next/link";
import { Logo } from "@/components/shared/logo";
import { SITE_NAME, FOOTER_LINKS, SITE_CONTENT_DOC_PATH, DEFAULT_SITE_CONTENT } from "@/constants";
import { useLanguage } from "@/hooks/use-language";
import { useQuery } from '@tanstack/react-query';
import { doc, getDoc } from 'firebase/firestore';
import { db, isFirebaseConfigured } from '@/lib/firebase';
import type { SiteContentSettings, Locale } from '@/types';

const SITE_CONTENT_QUERY_KEY_FOOTER = "siteContentPublicFooter";

const mergeDeep = (target: any, source: any): any => {
  const output = { ...target };
  if (target && typeof target === 'object' && !Array.isArray(target) && source && typeof source === 'object' && !Array.isArray(source)) {
    Object.keys(source).forEach(key => {
      if (source[key] && typeof source[key] === 'object' && !Array.isArray(source[key])) {
        if (!(key in target)) {
          Object.assign(output, { [key]: source[key] });
        } else {
          output[key] = mergeDeep(target[key], source[key]);
        }
      } else if (source[key] !== undefined) {
        Object.assign(output, { [key]: source[key] });
      }
    });
  }
  return output;
};


const fetchSiteContentPublic = async (): Promise<SiteContentSettings> => {
  if (!isFirebaseConfigured) return DEFAULT_SITE_CONTENT;
  const docRef = doc(db, SITE_CONTENT_DOC_PATH);
  const docSnap = await getDoc(docRef);
  if (docSnap.exists()) {
    return mergeDeep(DEFAULT_SITE_CONTENT, docSnap.data()) as SiteContentSettings;
  }
  return DEFAULT_SITE_CONTENT;
};


export function Footer() {
  const { t, locale } = useLanguage();
  const currentYear = new Date().getFullYear();

  const { data: siteContent } = useQuery<SiteContentSettings, Error>({
    queryKey: [SITE_CONTENT_QUERY_KEY_FOOTER],
    queryFn: fetchSiteContentPublic,
    staleTime: 1000 * 60 * 5, // 5 minutes
  });

  const tagline = siteContent?.tagline?.[locale as Locale] || t('tagline');

  return (
    <footer className="border-t bg-card text-card-foreground">
      <div className="container py-12">
        <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
          {/* Column 1: Logo & Tagline */}
          <div className="flex flex-col items-center md:items-start text-center md:text-left">
            <Logo className="h-14 w-auto" />
            <p className="text-sm text-muted-foreground mt-2 max-w-xs">
              {tagline}
            </p>
          </div>
          
          {/* Column 2: Quick Links */}
          <div className="text-center md:text-left">
            <h4 className="font-semibold mb-3 text-foreground">{t('quickLinks')}</h4>
            <ul className="space-y-2">
                {FOOTER_LINKS.map(link => (
                  <li key={link.href}>
                    <Link href={link.href} className="text-sm text-muted-foreground hover:text-primary transition-colors">
                        {t(link.labelKey)}
                    </Link>
                  </li>
                ))}
            </ul>
          </div>
          
          {/* Column 3: Contact Info */}
          <div className="text-center md:text-left">
            <h4 className="font-semibold mb-3 text-foreground">{t('contactUs')}</h4>
             <ul className="space-y-2">
                <li><p className="text-sm text-muted-foreground">{t('addressPlaceholder')}</p></li>
                <li><p className="text-sm text-muted-foreground">{t('generalPhoneNumberPlaceholder')}</p></li>
                <li><p className="text-sm text-muted-foreground">{t('generalEmailAddressPlaceholder')}</p></li>
            </ul>
          </div>
        </div>
        <div className="mt-10 border-t pt-6 text-center text-sm text-muted-foreground">
            &copy; {currentYear} {SITE_NAME}. {t('allRightsReserved')}.
        </div>
      </div>
    </footer>
  );
}
