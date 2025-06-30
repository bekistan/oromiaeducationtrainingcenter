"use client";

import Image from "next/image";
import { PublicLayout } from "@/components/layout/public-layout";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { useLanguage } from "@/hooks/use-language";
import Link from "next/link";
import { BedDouble, Presentation, Utensils, ShieldCheck, Settings, Languages, QrCode, HelpCircle, Loader2 } from "lucide-react";
import { SITE_NAME, SITE_CONTENT_DOC_PATH, DEFAULT_SITE_CONTENT } from "@/constants";
import { QRCodeDisplay } from "@/components/shared/qr-code-display";
import { useEffect, useState } from "react";
import { useQuery } from '@tanstack/react-query';
import { doc, getDoc, getDocs, collection } from 'firebase/firestore';
import { db } from '@/lib/firebase';
import type { SiteContentSettings, Locale, FAQItem, Dormitory, Hall } from '@/types';
import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from "@/components/ui/accordion";

const SITE_CONTENT_QUERY_KEY = "siteContentPublic";
const FEATURED_ITEMS_QUERY_KEY = "featuredItemsPublic";

const fetchSiteContentPublic = async (): Promise<SiteContentSettings> => {
  const docRef = doc(db, SITE_CONTENT_DOC_PATH);
  const docSnap = await getDoc(docRef);
  if (docSnap.exists()) {
    return { ...DEFAULT_SITE_CONTENT, ...docSnap.data() } as SiteContentSettings;
  }
  return DEFAULT_SITE_CONTENT;
};

const fetchFeaturedItems = async (): Promise<{ dormitories: Dormitory[]; halls: Hall[] }> => {
    const dormsQuery = collection(db, "dormitories");
    const hallsQuery = collection(db, "halls");
    
    const dormsSnapshot = await getDocs(dormsQuery);
    const hallsSnapshot = await getDocs(hallsQuery);

    const dormitories = dormsSnapshot.docs
        .map(d => ({ id: d.id, ...d.data() } as Dormitory))
        .filter(d => d.isAvailable)
        .slice(0, 3);
        
    const halls = hallsSnapshot.docs
        .map(h => ({ id: h.id, ...h.data() } as Hall))
        .filter(h => h.isAvailable)
        .slice(0, 3);

    return { dormitories, halls };
};


export default function HomePage() {
  const { t, locale } = useLanguage();
  const [brochureUrl, setBrochureUrl] = useState('');

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

  useEffect(() => {
    if (typeof window !== 'undefined') {
      setBrochureUrl(window.location.origin + '/brochure');
    }
  }, []);

  const features = [
    {
      icon: <ShieldCheck className="h-10 w-10 text-accent" />,
      titleKey: "securePayment",
      descriptionKey: "chapaGateway",
    },
    {
      icon: <Languages className="h-10 w-10 text-accent" />,
      titleKey: "multilingualSupport",
      descriptionKey: "languagesSupported",
    },
    {
      icon: <Settings className="h-10 w-10 text-accent" />,
      titleKey: "adminPanel",
      descriptionKey: "powerfulManagement",
    },
  ];

  const welcomeMessage = siteContent?.welcomeMessage?.[locale as Locale] || t('homePageWelcomeMessage');
  const tagline = siteContent?.tagline?.[locale as Locale] || t('tagline');
  const faqs: FAQItem[] = siteContent?.faqs || [];
  
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
          <h2 className="text-3xl font-bold text-center text-primary mb-2">{t('featuredDormitories')}</h2>
          <p className="text-muted-foreground text-center mb-12">{t('featuredDormitoriesSubtitle')}</p>
          <div className="grid grid-cols-1 gap-8 md:grid-cols-2 lg:grid-cols-3">
             {isLoadingFeaturedItems ? (
              Array.from({ length: 3 }).map((_, i) => (
                <Card key={i} className="flex flex-col"><CardHeader><div className="h-48 w-full bg-muted rounded-md animate-pulse"></div></CardHeader><CardContent className="flex-grow"><div className="h-24 bg-muted rounded-md animate-pulse"></div></CardContent><CardFooter><Button disabled className="w-full"></Button></CardFooter></Card>
              ))
            ) : (
                featuredItems?.dormitories.map((dorm) => (
                  <Card key={dorm.id} className="overflow-hidden shadow-lg hover:shadow-xl transition-shadow duration-300">
                     <div className="relative h-48 w-full">
                      <Image
                        src={dorm.images?.[0] || `https://placehold.co/600x400.png`}
                        alt={dorm.roomNumber}
                        fill
                        style={{ objectFit: 'cover' }}
                        data-ai-hint={dorm.dataAiHint || "dormitory room"}
                        sizes="(max-width: 768px) 100vw, (max-width: 1200px) 50vw, 33vw"
                      />
                    </div>
                    <CardHeader><CardTitle>{t('roomNumber')} {dorm.roomNumber}</CardTitle><CardDescription>{t('floor')} {dorm.floor}</CardDescription></CardHeader>
                    <CardContent className="flex-grow"><p className="text-muted-foreground text-sm">{t('capacity')}: {dorm.capacity} {t('beds')}</p></CardContent>
                    <CardFooter>
                      <Button asChild className="w-full"><Link href={`/dormitories`}>{t('viewAndBook')}</Link></Button>
                    </CardFooter>
                  </Card>
                ))
            )}
          </div>
        </div>
      </section>
      
      {/* Featured Halls Section */}
      <section className="py-16 md:py-24 bg-secondary/30">
        <div className="container mx-auto">
          <h2 className="text-3xl font-bold text-center text-primary mb-2">{t('featuredHallsAndSections')}</h2>
          <p className="text-muted-foreground text-center mb-12">{t('featuredHallsAndSectionsSubtitle')}</p>
          <div className="grid grid-cols-1 gap-8 md:grid-cols-2 lg:grid-cols-3">
             {isLoadingFeaturedItems ? (
              Array.from({ length: 3 }).map((_, i) => (
                <Card key={i} className="flex flex-col"><CardHeader><div className="h-48 w-full bg-muted rounded-md animate-pulse"></div></CardHeader><CardContent className="flex-grow"><div className="h-24 bg-muted rounded-md animate-pulse"></div></CardContent><CardFooter><Button disabled className="w-full"></Button></CardFooter></Card>
              ))
            ) : (
                featuredItems?.halls.map((hall) => (
                  <Card key={hall.id} className="overflow-hidden shadow-lg hover:shadow-xl transition-shadow duration-300">
                     <div className="relative h-48 w-full">
                      <Image
                        src={hall.images?.[0] || `https://placehold.co/600x400.png`}
                        alt={hall.name}
                        fill
                        style={{ objectFit: 'cover' }}
                        data-ai-hint={hall.dataAiHint || "meeting space"}
                        sizes="(max-width: 768px) 100vw, (max-width: 1200px) 50vw, 33vw"
                      />
                    </div>
                    <CardHeader><CardTitle>{hall.name}</CardTitle><CardDescription>{t(hall.itemType)}</CardDescription></CardHeader>
                    <CardContent className="flex-grow"><p className="text-muted-foreground text-sm">{t('capacity')}: {hall.capacity}</p></CardContent>
                    <CardFooter>
                      <Button asChild className="w-full"><Link href={`/halls`}>{t('viewAndBook')}</Link></Button>
                    </CardFooter>
                  </Card>
                ))
            )}
          </div>
        </div>
      </section>

      {/* Features Section */}
      <section className="py-16 md:py-24 bg-background">
        <div className="container mx-auto">
          <h2 className="text-3xl font-bold text-center text-primary mb-12">{t('features')}</h2>
          <div className="grid grid-cols-1 gap-8 md:grid-cols-3">
            {features.map((feature) => (
              <Card key={feature.titleKey} className="flex flex-col items-center text-center shadow-lg hover:shadow-xl transition-shadow duration-300">
                <CardHeader className="items-center p-6">
                  <div className="p-3 rounded-full bg-accent/10 mb-4">
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
      <section className="py-16 md:py-24 bg-secondary/30">
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
    </PublicLayout>
  );
}
