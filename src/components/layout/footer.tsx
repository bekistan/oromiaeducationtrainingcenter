
"use client";

import Link from "next/link";
import Image from 'next/image';
import { SITE_NAME, FOOTER_LINKS, SITE_CONTENT_DOC_PATH, DEFAULT_SITE_CONTENT } from "@/constants";
import { useLanguage } from "@/hooks/use-language";
import { useQuery } from '@tanstack/react-query';
import { doc, getDoc } from 'firebase/firestore';
import { db } from '@/lib/firebase';
import type { SiteContentSettings, Locale } from '@/types';

const SITE_CONTENT_QUERY_KEY_FOOTER = "siteContentPublicFooter";

const fetchSiteContentPublic = async (): Promise<SiteContentSettings> => {
  const docRef = doc(db, SITE_CONTENT_DOC_PATH);
  const docSnap = await getDoc(docRef);
  if (docSnap.exists()) {
    return { ...DEFAULT_SITE_CONTENT, ...docSnap.data() } as SiteContentSettings;
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
      <div className="container py-8">
        <div className="flex flex-col md:flex-row justify-between items-center gap-8">
          <div className="flex flex-col items-center md:items-start">
            <Link href="/" className="flex items-center space-x-2" aria-label="Homepage">
              <Image
                src="/images/logo.png"
                alt="Oromia Education Training Center Logo"
                width={281}
                height={214}
                priority
                className="h-14 w-auto"
              />
            </Link>
            <p className="text-sm text-muted-foreground mt-2 max-w-xs text-center md:text-left">
              {tagline}
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
