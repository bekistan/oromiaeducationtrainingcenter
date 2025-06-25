
"use client";

import Image from "next/image";
import { PublicLayout } from "@/components/layout/public-layout";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { useLanguage } from "@/hooks/use-language";
import Link from "next/link";
import { BedDouble, Presentation, Utensils, ShieldCheck, Settings, Languages, QrCode, HelpCircle, Loader2 } from "lucide-react";
import { PLACEHOLDER_IMAGE_SIZE, SITE_NAME, SITE_CONTENT_DOC_PATH, DEFAULT_SITE_CONTENT } from "@/constants";
import { QRCodeDisplay } from "@/components/shared/qr-code-display";
import { useEffect, useState } from "react";
import { useQuery } from '@tanstack/react-query';
import { doc, getDoc } from 'firebase/firestore';
import { db } from '@/lib/firebase';
import type { SiteContentSettings, Locale, FAQItem } from '@/types';
import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from "@/components/ui/accordion";

const SITE_CONTENT_QUERY_KEY = "siteContentPublic";

const fetchSiteContentPublic = async (): Promise<SiteContentSettings> => {
  const docRef = doc(db, SITE_CONTENT_DOC_PATH);
  const docSnap = await getDoc(docRef);
  if (docSnap.exists()) {
    return { ...DEFAULT_SITE_CONTENT, ...docSnap.data() } as SiteContentSettings;
  }
  return DEFAULT_SITE_CONTENT;
};

export default function HomePage() {
  const { t, locale } = useLanguage();
  const [brochureUrl, setBrochureUrl] = useState('');

  const { data: siteContent, isLoading: isLoadingContent } = useQuery<SiteContentSettings, Error>({
    queryKey: [SITE_CONTENT_QUERY_KEY],
    queryFn: fetchSiteContentPublic,
    staleTime: 1000 * 60 * 5, // 5 minutes
  });

  useEffect(() => {
    if (typeof window !== 'undefined') {
      setBrochureUrl(window.location.origin + '/brochure');
    }
  }, []);

  const services = [
    {
      icon: <BedDouble className="h-10 w-10 text-primary" />,
      titleKey: "dormitories",
      descriptionKey: "tagline",
      link: "/dormitories",
      image: `https://placehold.co/${PLACEHOLDER_IMAGE_SIZE}.png`,
      imageHint: "modern dormitory"
    },
    {
      icon: <Presentation className="h-10 w-10 text-primary" />,
      titleKey: "halls",
      descriptionKey: "tagline",
      link: "/halls",
      image: `https://placehold.co/${PLACEHOLDER_IMAGE_SIZE}.png`,
      imageHint: "conference hall"
    },
    {
      icon: <Utensils className="h-10 w-10 text-primary" />,
      titleKey: "cateringServices",
      descriptionKey: "tagline",
      link: "/halls#catering",
      image: `https://placehold.co/${PLACEHOLDER_IMAGE_SIZE}.png`,
      imageHint: "catering food"
    },
  ];

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

      {/* Services Section */}
      <section className="py-16 md:py-24 bg-background">
        <div className="container mx-auto">
          <h2 className="text-3xl font-bold text-center text-primary mb-12">
            {t('services')}
          </h2>
          <div className="grid grid-cols-1 gap-8 md:grid-cols-2 lg:grid-cols-3">
            {services.map((service) => (
              <Card key={service.titleKey} className="overflow-hidden shadow-lg hover:shadow-xl transition-shadow duration-300">
                <CardHeader className="items-center text-center p-6">
                  <div className="p-3 rounded-full bg-primary/10 mb-4">
                     {service.icon}
                  </div>
                  <CardTitle className="text-2xl">{t(service.titleKey)}</CardTitle>
                </CardHeader>
                <div className="relative h-48 w-full">
                  <Image
                    src={service.image}
                    alt={t(service.titleKey)}
                    fill
                    style={{ objectFit: 'cover' }}
                    data-ai-hint={service.imageHint}
                    sizes="(max-width: 768px) 100vw, (max-width: 1200px) 50vw, 33vw"
                  />
                </div>
                <CardContent className="p-6 text-center">
                  <CardDescription className="mb-6">{siteContent?.tagline?.[locale as Locale] || t(service.descriptionKey)}</CardDescription>
                  <Link href={service.link} passHref>
                    <Button variant="default" className="w-full">{t('bookNow')}</Button>
                  </Link>
                </CardContent>
              </Card>
            ))}
          </div>
        </div>
      </section>

      {/* Features Section */}
      <section className="py-16 md:py-24 bg-secondary/30">
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

      {/* Brochure QR Code Section */}
      <section className="py-16 md:py-24 bg-secondary/30">
        <div className="container mx-auto text-center">
          <h2 className="text-3xl font-bold text-primary mb-4">{t('discoverMoreTitle')}</h2>
          <p className="text-lg text-muted-foreground mb-8 max-w-xl mx-auto">{t('discoverMoreSubtitle')}</p>
          <Card className="max-w-xs mx-auto shadow-xl p-6 md:p-8">
            <CardHeader className="p-0 mb-4">
              <div className="mx-auto bg-primary/10 p-3 rounded-full w-fit mb-2">
                <QrCode className="w-8 h-8 text-primary" />
              </div>
              <CardTitle className="text-xl">{t('scanForBrochureTitle')}</CardTitle>
            </CardHeader>
            <CardContent className="flex justify-center">
              {brochureUrl ? (
                <QRCodeDisplay value={brochureUrl} size={160} />
              ) : (
                <div className="w-[160px] h-[160px] bg-muted rounded-md flex items-center justify-center">
                  <p className="text-sm text-muted-foreground">{t('generatingQrCode')}</p>
                </div>
              )}
            </CardContent>
            <CardDescription className="mt-4 text-sm">{t('scanForBrochureDesc')}</CardDescription>
          </Card>
        </div>
      </section>
    </PublicLayout>
  );
}
