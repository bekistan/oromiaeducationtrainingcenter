
"use client";

import Link from "next/link";
import { Logo } from "@/components/shared/logo";
import { SITE_NAME, FOOTER_LINKS, SITE_CONTENT_DOC_PATH, DEFAULT_SITE_CONTENT } from "@/constants";
import { useLanguage } from "@/hooks/use-language";
import { useQuery } from '@tanstack/react-query';
import { doc, getDoc, collection, query, where, getDocs } from 'firebase/firestore';
import { db, isFirebaseConfigured } from '@/lib/firebase';
import type { SiteContentSettings, Locale, BlogPost } from '@/types';
import { MapPin, Phone, Mail, ChevronRight } from "lucide-react";
import { toDateObject, formatDate } from "@/lib/date-utils";

const LATEST_POSTS_QUERY_KEY_FOOTER = "latestPostsFooter";

const fetchLatestPosts = async (): Promise<BlogPost[]> => {
  if (!isFirebaseConfigured || !db) return [];
  const postsQuery = query(
    collection(db, "blog"),
    where("isPublished", "==", true)
  );
  
  const postsSnapshot = await getDocs(postsQuery);
  const allPublishedPosts = postsSnapshot.docs.map(d => ({ id: d.id, ...d.data() } as BlogPost));

  allPublishedPosts.sort((a, b) => {
    const dateA = toDateObject(a.createdAt);
    const dateB = toDateObject(b.createdAt);
    if (!dateA || !dateB) return 0;
    return dateB.getTime() - dateA.getTime();
  });

  return allPublishedPosts.slice(0, 3);
};


export function Footer() {
  const { t, locale } = useLanguage();
  const currentYear = new Date().getFullYear();

  const { data: latestPosts, isLoading: isLoadingPosts } = useQuery<BlogPost[], Error>({
    queryKey: [LATEST_POSTS_QUERY_KEY_FOOTER],
    queryFn: fetchLatestPosts,
    staleTime: 1000 * 60 * 5,
  });

  return (
    <footer className="bg-sidebar text-sidebar-foreground/80">
      <div className="container py-12">
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-8">
          {/* Column 1: Logo & Tagline */}
          <div className="flex flex-col space-y-4">
            <Logo />
            <p className="text-sm">
              {t('tagline')}
            </p>
          </div>
          
          {/* Column 2: Latest News */}
          <div className="text-left">
            <h4 className="font-semibold mb-4 text-sidebar-foreground uppercase tracking-wider">{t('latestNews')}</h4>
            <ul className="space-y-4">
                {isLoadingPosts ? Array.from({length: 2}).map((_, i) => <li key={i} className="animate-pulse h-10 bg-sidebar-accent rounded"></li>) :
                 latestPosts && latestPosts.length > 0 ? latestPosts.map(post => (
                  <li key={post.id} className="border-b border-sidebar-border/50 pb-4">
                    <Link href={`/blog/${post.slug}`} className="text-sm font-medium text-sidebar-foreground/90 hover:text-primary transition-colors block">
                        {post.title}
                    </Link>
                    <time className="text-xs text-sidebar-foreground/60 uppercase tracking-widest">{formatDate(post.createdAt, 'MMMM d, yyyy')}</time>
                  </li>
                )) : <li className="text-sm text-sidebar-foreground/60">{t('noNewsFound')}</li>}
            </ul>
          </div>
          
          {/* Column 3: Useful Links */}
          <div className="text-left">
            <h4 className="font-semibold mb-4 text-sidebar-foreground uppercase tracking-wider">{t('usefulLinks')}</h4>
            <ul className="space-y-2">
                {FOOTER_LINKS.map(link => (
                  <li key={link.href}>
                    <Link href={link.href} className="flex items-center text-sm hover:text-primary transition-colors">
                        <ChevronRight className="h-4 w-4 mr-1 text-primary"/>
                        {t(link.labelKey)}
                    </Link>
                  </li>
                ))}
            </ul>
          </div>

          {/* Column 4: Contact Info */}
          <div className="text-left">
            <h4 className="font-semibold mb-4 text-sidebar-foreground uppercase tracking-wider">{t('contactUs')}</h4>
             <ul className="space-y-3">
                <li className="flex items-start">
                    <MapPin className="h-5 w-5 mr-3 mt-0.5 text-primary flex-shrink-0" />
                    <span className="text-sm">{t('addressPlaceholder')}</span>
                </li>
                <li className="flex items-start">
                    <Phone className="h-5 w-5 mr-3 mt-0.5 text-primary flex-shrink-0" />
                    <span className="text-sm">{t('generalPhoneNumberPlaceholder')}</span>
                </li>
                <li className="flex items-start">
                    <Mail className="h-5 w-5 mr-3 mt-0.5 text-primary flex-shrink-0" />
                    <span className="text-sm">{t('generalEmailAddressPlaceholder')}</span>
                </li>
            </ul>
          </div>
        </div>
        <div className="mt-12 border-t border-sidebar-border/50 pt-6 text-center text-sm text-sidebar-foreground/60">
            &copy; {currentYear} {SITE_NAME}. {t('allRightsReserved')}.
        </div>
      </div>
    </footer>
  );
}
