
"use client";

import Image from "next/image";
import { PublicLayout } from "@/components/layout/public-layout";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { useLanguage } from "@/hooks/use-language";
import Link from "next/link";
import { BedDouble, Presentation, Utensils, ShieldCheck, Settings, Languages, QrCode, HelpCircle } from "lucide-react";
import { PLACEHOLDER_IMAGE_SIZE, SITE_NAME } from "@/constants";
import { QRCodeDisplay } from "@/components/shared/qr-code-display";
import { useEffect, useState } from "react";
import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from "@/components/ui/accordion";

export default function HomePage() {
  const { t } = useLanguage();
  const [brochureUrl, setBrochureUrl] = useState('');

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
      link: "/halls#catering", // This might need adjustment if catering isn't a direct section on halls page
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

  const faqItems = [
    { id: "faq1", questionKey: "faqQ1Title", answerKey: "faqQ1Answer" },
    { id: "faq2", questionKey: "faqQ2Title", answerKey: "faqQ2Answer" },
    { id: "faq3", questionKey: "faqQ3Title", answerKey: "faqQ3Answer" },
    { id: "faq4", questionKey: "faqQ4Title", answerKey: "faqQ4Answer" },
    { id: "faq5", questionKey: "faqQ5Title", answerKey: "faqQ5Answer" },
    { id: "faq6", questionKey: "faqQ6Title", answerKey: "faqQ6Answer" },
    { id: "faq7", questionKey: "faqQ7Title", answerKey: "faqQ7Answer" },
  ];

  return (
    <PublicLayout>
      {/* Hero Section */}
      <section className="relative py-20 md:py-32 bg-gradient-to-b from-primary/10 to-background">
        <div className="container mx-auto text-center">
          <h1 className="text-4xl font-bold tracking-tight text-primary sm:text-5xl md:text-6xl">
            {t('welcomeTo')} {SITE_NAME}
          </h1>
          <p className="mt-6 max-w-2xl mx-auto text-lg leading-8 text-foreground/80">
            {t('tagline')}
          </p>
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
                  <CardDescription className="mb-6">{t(service.descriptionKey)}</CardDescription>
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
          <Accordion type="single" collapsible className="w-full max-w-3xl mx-auto">
            {faqItems.map((item) => (
              <AccordionItem value={item.id} key={item.id}>
                <AccordionTrigger className="text-lg text-left hover:text-primary">
                  {t(item.questionKey)}
                </AccordionTrigger>
                <AccordionContent className="text-base text-muted-foreground leading-relaxed">
                  {t(item.answerKey)}
                </AccordionContent>
              </AccordionItem>
            ))}
          </Accordion>
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
