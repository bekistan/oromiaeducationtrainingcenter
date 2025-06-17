
"use client"; // Required for client-side data fetching and hooks

import type { ReactNode } from 'react';
import { Header } from './header';
import { Footer } from './footer';
import { useQuery } from '@tanstack/react-query';
import { db } from '@/lib/firebase';
import { doc, getDoc } from 'firebase/firestore';
import type { SiteSettings } from '@/types';
import { SITE_SETTINGS_DOC_PATH, DEFAULT_SITE_SETTINGS } from '@/constants';
import { Loader2, Megaphone } from 'lucide-react';
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { cn } from '@/lib/utils';
import { useLanguage } from '@/hooks/use-language';

interface PublicLayoutProps {
  children: ReactNode;
}

const SITE_SETTINGS_QUERY_KEY_PUBLIC = "siteSettingsPublic";

const fetchSiteSettingsPublic = async (): Promise<SiteSettings> => {
  const docRef = doc(db, SITE_SETTINGS_DOC_PATH);
  const docSnap = await getDoc(docRef);
  if (docSnap.exists()) {
    const data = docSnap.data();
    return {
      id: docSnap.id,
      siteAnnouncementMessage: data.siteAnnouncementMessage || DEFAULT_SITE_SETTINGS.siteAnnouncementMessage,
      isAnnouncementVisible: data.isAnnouncementVisible === undefined ? DEFAULT_SITE_SETTINGS.isAnnouncementVisible : data.isAnnouncementVisible,
      lastUpdated: data.lastUpdated,
    } as SiteSettings;
  }
  return { ...DEFAULT_SITE_SETTINGS, id: 'general_settings' };
};

export function PublicLayout({ children }: PublicLayoutProps) {
  const { t } = useLanguage();
  const { data: siteSettings, isLoading: isLoadingSiteSettings, error: siteSettingsError } = useQuery<SiteSettings, Error>({
    queryKey: [SITE_SETTINGS_QUERY_KEY_PUBLIC],
    queryFn: fetchSiteSettingsPublic,
    staleTime: 1000 * 60 * 5, // Cache for 5 minutes
  });

  return (
    <div className="flex min-h-screen flex-col">
      {isLoadingSiteSettings && (
        <div className="bg-primary/10 text-primary p-2 text-center text-xs flex items-center justify-center">
          <Loader2 className="h-3 w-3 animate-spin mr-1" /> {t('loadingSiteInfo')}
        </div>
      )}
      {!isLoadingSiteSettings && siteSettingsError && (
         <div className="bg-destructive/10 text-destructive p-2 text-center text-xs">
          {t('errorLoadingSiteInfo')}
        </div>
      )}
      {!isLoadingSiteSettings && !siteSettingsError && siteSettings?.isAnnouncementVisible && siteSettings.siteAnnouncementMessage && (
        <Alert
          variant="default"
          className={cn(
            "rounded-none border-x-0 border-t-0 bg-primary/10 text-primary-foreground",
            "p-3 text-sm"
          )}
        >
          <div className="container mx-auto flex items-center justify-center gap-2">
            <Megaphone className="h-5 w-5 text-primary flex-shrink-0" />
            <AlertDescription className="text-primary text-center">
              {siteSettings.siteAnnouncementMessage}
            </AlertDescription>
          </div>
        </Alert>
      )}
      <Header />
      <main className="flex-1">{children}</main>
      <Footer />
    </div>
  );
}
