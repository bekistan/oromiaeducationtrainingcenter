
"use client";

import Image from "next/image";
import { PublicLayout } from "@/components/layout/public-layout";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { useLanguage } from "@/hooks/use-language";
import Link from "next/link";
import { BedDouble, Presentation, ShieldCheck, Settings, Languages, HelpCircle, Loader2, Utensils, User, Calendar } from "lucide-react";
import { SITE_NAME, SITE_CONTENT_DOC_PATH, DEFAULT_SITE_CONTENT, DEFAULT_PRICING_SETTINGS, PRICING_SETTINGS_DOC_PATH, STATIC_IMAGES } from "@/constants";
import { useEffect, useState, useMemo } from "react";
import { useQuery } from '@tanstack/react-query';
import { doc, getDoc, getDocs, collection, query, where, limit, orderBy } from 'firebase/firestore';
import type { SiteContentSettings, Locale, FAQItem, Dormitory, Hall, ServiceItem, PricingSettings, BlogPost } from '@/types';
import { db, isFirebaseConfigured } from '@/lib/firebase';
import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from "@/components/ui/accordion";
import { Skeleton } from "@/components/ui/skeleton";
import type { LucideIcon } from "lucide-react";
import { cn } from "@/lib/utils";
import { formatDate, toDateObject } from "@/lib/date-utils";
import { ImageViewer } from "@/components/shared/image-viewer";

const SITE_CONTENT_QUERY_KEY = "siteContentPublic";
const FEATURED_ITEMS_QUERY_KEY = "featuredItemsPublic";
const PRICING_SETTINGS_QUERY_KEY_PUBLIC = "pricingSettingsPublic";
const LATEST_POSTS_QUERY_KEY = "latestPostsPublic";

// Helper function for deep merging objects, useful for combining DB data with defaults
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
    const dbData = docSnap.data();
    // Deep merge to prevent DB data from completely overwriting nested default objects
    return mergeDeep(DEFAULT_SITE_CONTENT, dbData) as SiteContentSettings;
  }
  return DEFAULT_SITE_CONTENT;
};


const fetchFeaturedItems = async (): Promise<{ dormitories: Dormitory[]; halls: Hall[] }> => {
    if (!isFirebaseConfigured || !db) return { dormitories: [], halls: [] };
    const dormsQuery = query(collection(db, "dormitories"), where("isAvailable", "==", true), limit(3));
    const hallsQuery = query(collection(db, "halls"), where("isAvailable", "==", true), limit(3));
    
    const [dormsSnapshot, hallsSnapshot] = await Promise.all([
      getDocs(dormsQuery),
      getDocs(hallsQuery)
    ]);

    const dormitories = dormsSnapshot.docs.map(d => ({ id: d.id, ...d.data() } as Dormitory));
    const halls = hallsSnapshot.docs.map(h => ({ id: h.id, ...h.data() } as Hall));

    return { dormitories, halls };
};

const fetchPricingSettingsPublic = async (): Promise<PricingSettings> => {
  if (!isFirebaseConfigured || !db) return DEFAULT_PRICING_SETTINGS;
  const docRef = doc(db, PRICING_SETTINGS_DOC_PATH);
  const docSnap = await getDoc(docRef);
  if (docSnap.exists()) {
    return { ...DEFAULT_PRICING_SETTINGS, ...docSnap.data() } as PricingSettings;
  }
  return DEFAULT_PRICING_SETTINGS;
};

const fetchLatestPosts = async (): Promise<BlogPost[]> => {
  if (!isFirebaseConfigured || !db) return [];
  const postsQuery = query(
    collection(db, "blog"),
    where("isPublished", "==", true)
  );
  
  const postsSnapshot = await getDocs(postsQuery);
  const allPublishedPosts = postsSnapshot.docs.map(d => ({ id: d.id, ...d.data() } as BlogPost));

  // Sort on the client-side to avoid needing a composite index
  allPublishedPosts.sort((a, b) => {
    const dateA = toDateObject(a.createdAt);
    const dateB = toDateObject(b.createdAt);
    if (!dateA || !dateB) return 0;
    return dateB.getTime() - dateA.getTime();
  });

  return allPublishedPosts.slice(0, 3);
};


export default function HomePage() {
  const { t, locale } = useLanguage();
  const [isViewerOpen, setIsViewerOpen] = useState(false);
  const [viewerStartIndex, setViewerStartIndex] = useState(0);

  const { data: siteContent, isLoading: isLoadingContent } = useQuery<SiteContentSettings, Error>({
    queryKey: [SITE_CONTENT_QUERY_KEY],
    queryFn: fetchSiteContentPublic,
    staleTime: 1000 * 60 * 5, // 5 minutes
  });

   const { data: featuredItems, isLoading: isLoadingFeaturedItems } = useQuery<{ dormitories: Dormitory[]; halls: Hall[] }, Error>({
    queryKey: [FEATURED_ITEMS_QUERY_KEY],
    queryFn: fetchFeaturedItems,
    staleTime: 1000 * 60 * 5,
  });

  const { data: pricingSettings, isLoading: isLoadingPricing } = useQuery<PricingSettings, Error>({
    queryKey: [PRICING_SETTINGS_QUERY_KEY_PUBLIC],
    queryFn: fetchPricingSettingsPublic,
    staleTime: 1000 * 60 * 10,
  });

  const { data: latestPosts, isLoading: isLoadingLatestPosts } = useQuery<BlogPost[], Error>({
    queryKey: [LATEST_POSTS_QUERY_KEY],
    queryFn: fetchLatestPosts,
    staleTime: 1000 * 60 * 5,
  });

  const openImageViewer = (index: number) => {
    setViewerStartIndex(index);
    setIsViewerOpen(true);
  };

  const galleryImages = useMemo(() => STATIC_IMAGES.filter(img => img.path !== '/images/logo.png'), []);
  const displayGalleryImages = useMemo(() => galleryImages.filter(img => !img.path.includes('catering')).slice(0, 8), [galleryImages]);

  const features = [
    {
      icon: <ShieldCheck className="h-10 w-10 text-primary" />,
      titleKey: "securePayment",
      descriptionKey: "chapaGateway",
    },
    {
      icon: <Languages className="h-10 w-10 text-primary" />,
      titleKey: "multilingualSupport",
      descriptionKey: "languagesSupported",
    },
    {
      icon: <Settings className="h-10 w-10 text-primary" />,
      titleKey: "adminPanel",
      descriptionKey: "powerfulManagement",
    },
  ];
  
  const serviceIcons: Record<string, LucideIcon> = {
    dormitories: BedDouble,
    halls: Presentation,
    catering: Utensils,
  };

  const getServiceLink = (serviceId: string): string => {
    switch (serviceId) {
      case 'dormitories': return '/dormitories';
      case 'halls': return '/halls';
      case 'catering': return '/brochure';
      default: return '/';
    }
  };

  const welcomeMessage = siteContent?.welcomeMessage?.[locale as Locale] || t('homePageWelcomeMessage');
  const tagline = siteContent?.tagline?.[locale as Locale] || t('tagline');
  const servicesSectionTitle = siteContent?.servicesSectionTitle?.[locale as Locale] || t('ourServices');
  const services: ServiceItem[] = siteContent?.services || [];
  const faqs: FAQItem[] = siteContent?.faqs || [];

  const featuredDormitoriesTitle = siteContent?.featuredDormitoriesTitle?.[locale as Locale] || t('featuredDormitories');
  const featuredDormitoriesSubtitle = siteContent?.featuredDormitoriesSubtitle?.[locale as Locale] || t('featuredDormitoriesSubtitle');
  const featuredHallsTitle = siteContent?.featuredHallsTitle?.[locale as Locale] || t('featuredHallsAndSections');
  const featuredHallsSubtitle = siteContent?.featuredHallsSubtitle?.[locale as Locale] || t('featuredHallsAndSectionsSubtitle');
  const discoverSectionTitle = siteContent?.discoverSectionTitle?.[locale as Locale] || t('discoverOERTC');
  const discoverSectionDescription = siteContent?.discoverSectionDescription?.[locale as Locale] || t('discoverSectionDescription');
  
  const featuredDormitories = featuredItems?.dormitories || [];
  const featuredHalls = featuredItems?.halls || [];

  return (
    <PublicLayout>
      {/* Hero Section */}
      <section className="relative py-20 md:py-32 bg-gradient-to-b from-primary/10 to-background">
        <div className="container mx-auto text-center">
           {isLoadingContent ? <Loader2 className="h-12 w-12 mx-auto animate-spin text-primary" /> :
            <>
              <h1 className="text-4xl font-bold tracking-tight text-primary sm:text-5xl md:text-6xl">
                {welcomeMessage}
              </h1>
              <p className="mt-6 max-w-2xl mx-auto text-lg leading-8 text-foreground/80">
                {tagline}
              </p>
            </>
           }
          <div className="mt-10 flex items-center justify-center gap-x-6">
            <Link href="/dormitories" passHref>
              <Button size="lg">{t('viewAvailableDormitories')}</Button>
            </Link>
            <Link href="/halls" passHref>
              <Button variant="outline" size="lg">{t('viewAvailableHalls')}</Button>
            </Link>
          </div>
        </div>
      </section>

      {/* Featured Dormitories Section */}
      <section className="py-16 md:py-24 bg-background">
        <div className="container mx-auto">
          <h2 className="text-3xl font-bold text-center text-primary mb-2">{featuredDormitoriesTitle}</h2>
          <svg className="w-24 h-2 mx-auto text-primary mb-4" viewBox="0 0 100 10" preserveAspectRatio="none" xmlns="http://www.w3.org/2000/svg">
            <path d="M0 5 Q 12.5 0, 25 5 T 50 5 T 75 5 T 100 5" stroke="currentColor" strokeWidth="2" fill="none" />
          </svg>
          <p className="text-muted-foreground text-center mb-12 max-w-2xl mx-auto">{featuredDormitoriesSubtitle}</p>
          
          {isLoadingFeaturedItems || isLoadingPricing ? (
             <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
                {Array.from({length: 3}).map((_, i) => <Skeleton key={i} className="h-80 w-full" />)}
            </div>
          ) : featuredDormitories.length > 0 ? (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
              {featuredDormitories.map((dorm) => (
                <Card key={dorm.id} className="bg-card border overflow-hidden flex flex-col group">
                  <div className="relative overflow-hidden">
                    <Image
                      src={dorm.images?.[0] || `https://placehold.co/600x400.png`}
                      alt={dorm.roomNumber}
                      width={600}
                      height={400}
                      className="object-cover w-full h-56 transition-transform duration-300 group-hover:scale-105"
                      data-ai-hint={dorm.dataAiHint || "hotel room"}
                    />
                    <div className="absolute top-3 left-3 bg-black/60 text-white px-3 py-1 text-sm font-bold rounded">
                      {(dorm.pricePerDay ?? pricingSettings?.defaultDormitoryPricePerDay ?? 0).toLocaleString()} {t('currencySymbol')} / {t('night')}
                    </div>
                  </div>
                  <div className="p-4 mt-auto flex justify-between items-center">
                    <h3 className="text-lg font-semibold">{t('roomNumber')} {dorm.roomNumber}</h3>
                    <Button asChild>
                      <Link href="/dormitories">{t('viewDetails')}</Link>
                    </Button>
                  </div>
                </Card>
              ))}
            </div>
          ) : (
             <div className="text-center py-8 text-muted-foreground">{t('noFeaturedDormitories')}</div>
          )}

          <div className="text-center mt-12">
            <Button asChild variant="outline" size="lg">
              <Link href="/dormitories">{t('viewAllDormitories')}</Link>
            </Button>
          </div>
        </div>
      </section>

      {/* Featured Halls Section */}
      <section className="py-16 md:py-24 bg-secondary/30">
        <div className="container mx-auto">
          <h2 className="text-3xl font-bold text-center text-primary mb-2">{featuredHallsTitle}</h2>
           <svg className="w-24 h-2 mx-auto text-primary mb-4" viewBox="0 0 100 10" preserveAspectRatio="none" xmlns="http://www.w3.org/2000/svg">
            <path d="M0 5 Q 12.5 0, 25 5 T 50 5 T 75 5 T 100 5" stroke="currentColor" strokeWidth="2" fill="none" />
          </svg>
          <p className="text-muted-foreground text-center mb-12 max-w-2xl mx-auto">{featuredHallsSubtitle}</p>
          
          {isLoadingFeaturedItems || isLoadingPricing ? (
             <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
                {Array.from({length: 3}).map((_, i) => <Skeleton key={i} className="h-80 w-full" />)}
            </div>
          ) : featuredHalls.length > 0 ? (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
              {featuredHalls.map((hall) => (
                <Card key={hall.id} className="bg-card border overflow-hidden flex flex-col group">
                  <div className="relative overflow-hidden">
                    <Image
                      src={hall.images?.[0] || `https://placehold.co/600x400.png`}
                      alt={hall.name}
                      width={600}
                      height={400}
                      className="object-cover w-full h-56 transition-transform duration-300 group-hover:scale-105"
                      data-ai-hint={hall.dataAiHint || "meeting space"}
                    />
                    <div className="absolute top-3 left-3 bg-black/60 text-white px-3 py-1 text-sm font-bold rounded">
                       {(hall.rentalCost ?? (hall.itemType === 'hall' ? pricingSettings?.defaultHallRentalCostPerDay : pricingSettings?.defaultSectionRentalCostPerDay) ?? 0).toLocaleString()} {t('currencySymbol')} / {t('day')}
                    </div>
                  </div>
                  <div className="p-4 mt-auto flex justify-between items-center">
                    <h3 className="text-lg font-semibold">{hall.name}</h3>
                     <Button asChild>
                      <Link href="/halls">{t('viewDetails')}</Link>
                    </Button>
                  </div>
                </Card>
              ))}
            </div>
          ) : (
            <div className="text-center py-8 text-muted-foreground">{t('noFeaturedHalls')}</div>
          )}

          <div className="text-center mt-12">
            <Button asChild variant="outline" size="lg">
              <Link href="/halls">{t('viewAllHalls')}</Link>
            </Button>
          </div>
        </div>
      </section>

      {/* Discover Section */}
      <section className="py-16 md:py-24 bg-background">
        <div className="container mx-auto">
          <h2 className="text-3xl font-bold text-center text-primary mb-2">{discoverSectionTitle}</h2>
           <svg className="w-24 h-2 mx-auto text-primary mb-4" viewBox="0 0 100 10" preserveAspectRatio="none" xmlns="http://www.w3.org/2000/svg">
            <path d="M0 5 Q 12.5 0, 25 5 T 50 5 T 75 5 T 100 5" stroke="currentColor" strokeWidth="2" fill="none" />
          </svg>
          <p className="text-muted-foreground text-center mb-12 max-w-2xl mx-auto">{discoverSectionDescription}</p>

          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            {displayGalleryImages.map((image, index) => (
              <div key={image.path} className="relative aspect-square rounded-lg overflow-hidden group cursor-pointer shadow-lg" onClick={() => openImageViewer(galleryImages.findIndex(gi => gi.path === image.path))}>
                <Image 
                    src={image.path} 
                    alt={image.name} 
                    fill 
                    sizes="(max-width: 768px) 50vw, 25vw"
                    className="object-cover transition-transform duration-300 group-hover:scale-110" 
                />
                <div className="absolute inset-0 bg-primary/60 group-hover:bg-primary/40 transition-colors duration-300"></div>
                <h3 className="absolute bottom-4 left-4 text-white font-bold text-lg drop-shadow-md">{image.name}</h3>
              </div>
            ))}
          </div>
        </div>
      </section>
      
      {/* Our Services Section */}
       <section className="py-16 md:py-24 bg-secondary/30">
        <div className="container mx-auto">
           <div className="text-center mb-12">
            <h2 className="text-3xl font-bold text-primary mb-2">{servicesSectionTitle}</h2>
            <svg className="w-24 h-2 mx-auto text-primary mb-4" viewBox="0 0 100 10" preserveAspectRatio="none" xmlns="http://www.w3.org/2000/svg">
              <path d="M0 5 Q 12.5 0, 25 5 T 50 5 T 75 5 T 100 5" stroke="currentColor" strokeWidth="2" fill="none" />
            </svg>
            <p className="text-muted-foreground mt-2 max-w-2xl mx-auto">{t('ourServicesSubtitle')}</p>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
            {isLoadingContent ? (
              Array.from({ length: 3 }).map((_, index) => (
                <Card key={index}><CardContent className="p-6"><Skeleton className="h-40" /></CardContent></Card>
              ))
            ) : (
              services.map((service) => {
                const Icon = serviceIcons[service.id] || Settings;
                return (
                  <Card key={service.id} className="flex flex-col text-center items-center shadow-lg hover:shadow-xl transition-shadow duration-300">
                    <CardHeader className="items-center">
                       <div className="p-4 rounded-full bg-primary/10 mb-4">
                          <Icon className="h-10 w-10 text-primary" />
                        </div>
                      <CardTitle className="text-xl">{service.title[locale as Locale] || service.title['en']}</CardTitle>
                    </CardHeader>
                    <CardContent className="flex-grow">
                      <p className="text-muted-foreground">{service.description[locale as Locale] || service.description['en']}</p>
                    </CardContent>
                    <CardFooter>
                       <Button asChild variant="outline">
                          <Link href={getServiceLink(service.id)}>{t('learnMore')}</Link>
                       </Button>
                    </CardFooter>
                  </Card>
                );
              })
            )}
          </div>
        </div>
      </section>

      {/* Latest News Section */}
      <section className="py-16 md:py-24 bg-background">
        <div className="container mx-auto">
          <h2 className="text-3xl font-bold text-center text-primary mb-2">{t('latestNewsAndEvents')}</h2>
          <svg className="w-24 h-2 mx-auto text-primary mb-4" viewBox="0 0 100 10" preserveAspectRatio="none" xmlns="http://www.w3.org/2000/svg">
            <path d="M0 5 Q 12.5 0, 25 5 T 50 5 T 75 5 T 100 5" stroke="currentColor" strokeWidth="2" fill="none" />
          </svg>
          <p className="text-muted-foreground text-center mb-12 max-w-2xl mx-auto">{t('latestNewsAndEventsSubtitle')}</p>
          
          {isLoadingLatestPosts ? (
            <div className="space-y-8">
              {Array.from({length: 2}).map((_, i) => (
                <Card key={i} className="flex flex-col md:flex-row overflow-hidden shadow-lg">
                  <div className="md:w-1/3">
                    <Skeleton className="h-56 w-full md:h-full" />
                  </div>
                  <div className="md:w-2/3 p-6 flex flex-col">
                    <Skeleton className="h-8 w-3/4 mb-4" />
                    <Skeleton className="h-4 w-full mb-2" />
                    <Skeleton className="h-4 w-full mb-2" />
                    <Skeleton className="h-4 w-4/5 mb-auto" />
                    <div className="flex items-center space-x-4 mt-4">
                        <Skeleton className="h-4 w-24" />
                        <Skeleton className="h-4 w-24" />
                    </div>
                  </div>
                </Card>
              ))}
            </div>
          ) : latestPosts && latestPosts.length > 0 ? (
            <div className="space-y-8">
              {latestPosts.map(post => (
                 <Card key={post.id} className="flex flex-col md:flex-row overflow-hidden shadow-lg hover:shadow-xl transition-shadow duration-300">
                    <Link href={`/blog/${post.slug}`} className="md:w-1/3 block relative h-56 md:h-auto bg-muted">
                        <Image
                          src={post.imageUrl || `https://placehold.co/400x300.png`}
                          alt={post.title}
                          fill
                          className="object-cover"
                          data-ai-hint="blog post"
                        />
                    </Link>
                    <div className="flex flex-col md:w-2/3 p-6">
                      <CardTitle className="text-2xl leading-snug mb-2">
                        <Link href={`/blog/${post.slug}`} className="hover:text-primary transition-colors">{post.title}</Link>
                      </CardTitle>
                      <CardContent className="p-0 flex-grow mb-4">
                        <p className="text-base text-muted-foreground line-clamp-3">
                          {post.excerpt || post.content.substring(0, 150) + '...'}
                        </p>
                      </CardContent>
                      <CardFooter className="p-0 pt-4 mt-auto">
                        <div className="flex items-center space-x-4 text-xs text-muted-foreground">
                          <span className="flex items-center uppercase"><User className="mr-1.5 h-4 w-4" /> {post.authorName}</span>
                          <span className="flex items-center uppercase"><Calendar className="mr-1.5 h-4 w-4" /> {formatDate(post.createdAt, 'MMMM d, yyyy')}</span>
                        </div>
                      </CardFooter>
                    </div>
                  </Card>
              ))}
            </div>
          ) : (
            <div className="text-center py-8 text-muted-foreground">{t('noNewsFound')}</div>
          )}
          
          <div className="text-center mt-12">
            <Button asChild variant="outline" size="lg">
              <Link href="/blog">{t('viewAllNews')}</Link>
            </Button>
          </div>
        </div>
      </section>

      {/* Features Section */}
      <section className="py-16 md:py-24 bg-secondary/30">
        <div className="container mx-auto">
          <h2 className="text-3xl font-bold text-center text-primary mb-2">{t('features')}</h2>
          <svg className="w-24 h-2 mx-auto text-primary mb-12" viewBox="0 0 100 10" preserveAspectRatio="none" xmlns="http://www.w3.org/2000/svg">
            <path d="M0 5 Q 12.5 0, 25 5 T 50 5 T 75 5 T 100 5" stroke="currentColor" strokeWidth="2" fill="none" />
          </svg>
          <div className="grid grid-cols-1 gap-8 md:grid-cols-3">
            {features.map((feature) => (
              <Card key={feature.titleKey} className="flex flex-col items-center text-center shadow-lg hover:shadow-xl transition-shadow duration-300">
                <CardHeader className="items-center p-6">
                  <div className="p-4 rounded-full bg-primary/10 mb-4">
                    {feature.icon}
                  </div>
                  <CardTitle className="text-xl">{t(feature.titleKey)}</CardTitle>
                </CardHeader>
                <CardContent className="p-6 pt-0">
                  <CardDescription>{t(feature.descriptionKey)}</CardDescription>
                </CardContent>
              </Card>
            ))}
          </div>
        </div>
      </section>

      {/* FAQ Section */}
      <section className="py-16 md:py-24 bg-background">
        <div className="container mx-auto">
          <div className="text-center mb-12">
            <HelpCircle className="h-12 w-12 text-primary mx-auto mb-4" />
            <h2 className="text-3xl font-bold text-primary">{t('faqTitle')}</h2>
            <p className="text-muted-foreground mt-2">{t('faqSubtitle')}</p>
          </div>
           {isLoadingContent ? <Loader2 className="h-8 w-8 mx-auto animate-spin" /> :
              <Accordion type="single" collapsible className="w-full max-w-3xl mx-auto">
                {faqs.map((item) => (
                  <AccordionItem value={item.id} key={item.id}>
                    <AccordionTrigger className="text-lg text-left hover:text-primary">
                      {item.question[locale as Locale] || item.question['en']}
                    </AccordionTrigger>
                    <AccordionContent className="text-base text-muted-foreground leading-relaxed">
                      {item.answer[locale as Locale] || item.answer['en']}
                    </AccordionContent>
                  </AccordionItem>
                ))}
              </Accordion>
            }
        </div>
      </section>

      <ImageViewer 
        images={galleryImages.map(img => ({ src: img.path, title: img.name }))}
        startIndex={viewerStartIndex}
        isOpen={isViewerOpen}
        onClose={() => setIsViewerOpen(false)}
      />
    </PublicLayout>
  );
}
