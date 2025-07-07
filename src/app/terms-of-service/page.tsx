
"use client";

import { PublicLayout } from "@/components/layout/public-layout";
import { useLanguage } from "@/hooks/use-language";
import { useQuery } from '@tanstack/react-query';
import { doc, getDoc } from 'firebase/firestore';
import { db, isFirebaseConfigured } from '@/lib/firebase';
import type { SiteContentSettings, Locale } from '@/types';
import { SITE_CONTENT_DOC_PATH, DEFAULT_SITE_CONTENT } from '@/constants';
import { Loader2 } from 'lucide-react';
import ReactMarkdown from 'react-markdown';

const SITE_CONTENT_QUERY_KEY_TERMS = "siteContentPublicTerms";

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
  if (!isFirebaseConfigured || !db) return DEFAULT_SITE_CONTENT;
  const docRef = doc(db, SITE_CONTENT_DOC_PATH);
  const docSnap = await getDoc(docRef);
  if (docSnap.exists()) {
    return mergeDeep(DEFAULT_SITE_CONTENT, docSnap.data()) as SiteContentSettings;
  }
  return DEFAULT_SITE_CONTENT;
};

export default function TermsOfServicePage() {
  const { t, locale } = useLanguage();
  
  const { data: siteContent, isLoading: isLoadingContent } = useQuery<SiteContentSettings, Error>({
    queryKey: [SITE_CONTENT_QUERY_KEY_TERMS],
    queryFn: fetchSiteContentPublic,
    staleTime: 1000 * 60 * 5, // 5 minutes
  });
  
  const termsOfServiceContent = siteContent?.termsOfService?.[locale as Locale] || siteContent?.termsOfService?.['en'] || t('termsOfServiceContent');

  return (
    <PublicLayout>
      <div className="container mx-auto py-12 px-4">
        <h1 className="text-3xl font-bold text-primary mb-6 text-center">{t('termsOfServiceTitle')}</h1>
        <article className="prose prose-slate dark:prose-invert max-w-4xl mx-auto">
          {isLoadingContent ? (
            <div className="flex justify-center items-center h-40">
                <Loader2 className="h-8 w-8 animate-spin" />
            </div>
          ) : (
            <ReactMarkdown>
                {termsOfServiceContent}
            </ReactMarkdown>
          )}
        </article>
      </div>
    </PublicLayout>
  );
}
