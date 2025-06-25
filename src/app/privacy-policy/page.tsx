
"use client";

import { PublicLayout } from "@/components/layout/public-layout";
import { useLanguage } from "@/hooks/use-language";
import { useQuery } from '@tanstack/react-query';
import { doc, getDoc } from 'firebase/firestore';
import { db } from '@/lib/firebase';
import type { SiteContentSettings, Locale } from '@/types';
import { SITE_CONTENT_DOC_PATH, DEFAULT_SITE_CONTENT } from '@/constants';
import { Loader2 } from 'lucide-react';
import ReactMarkdown from 'react-markdown';

const SITE_CONTENT_QUERY_KEY_PRIVACY = "siteContentPublicPrivacy";

const fetchSiteContentPublic = async (): Promise<SiteContentSettings> => {
  const docRef = doc(db, SITE_CONTENT_DOC_PATH);
  const docSnap = await getDoc(docRef);
  if (docSnap.exists()) {
    return { ...DEFAULT_SITE_CONTENT, ...docSnap.data() } as SiteContentSettings;
  }
  return DEFAULT_SITE_CONTENT;
};

export default function PrivacyPolicyPage() {
  const { t, locale } = useLanguage();
  
  const { data: siteContent, isLoading: isLoadingContent } = useQuery<SiteContentSettings, Error>({
    queryKey: [SITE_CONTENT_QUERY_KEY_PRIVACY],
    queryFn: fetchSiteContentPublic,
    staleTime: 1000 * 60 * 5, // 5 minutes
  });
  
  const privacyPolicyContent = siteContent?.privacyPolicy?.[locale as Locale] || siteContent?.privacyPolicy?.['en'] || t('privacyPolicyContent');

  return (
    <PublicLayout>
      <div className="container mx-auto py-12 px-4">
        <h1 className="text-3xl font-bold text-primary mb-6 text-center">{t('privacyPolicyTitle')}</h1>
        <article className="prose prose-slate dark:prose-invert max-w-4xl mx-auto">
          {isLoadingContent ? (
            <div className="flex justify-center items-center h-40">
                <Loader2 className="h-8 w-8 animate-spin" />
            </div>
          ) : (
            <ReactMarkdown>
                {privacyPolicyContent}
            </ReactMarkdown>
          )}
        </article>
      </div>
    </PublicLayout>
  );
}
