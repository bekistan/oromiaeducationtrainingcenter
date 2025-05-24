"use client";

import Image from "next/image";
import { PublicLayout } from "@/components/layout/public-layout";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { useLanguage } from "@/hooks/use-language";
import Link from "next/link";
import { BedDouble, Presentation, Utensils } from "lucide-react";
import { PLACEHOLDER_IMAGE_SIZE } from "@/constants";

export default function HomePage() {
  const { t } = useLanguage();

  const services = [
    {
      icon: <BedDouble className="h-10 w-10 text-primary" />,
      titleKey: "dormitories",
      descriptionKey: "tagline", // Placeholder, needs more specific description
      link: "/dormitories",
      image: `https://placehold.co/${PLACEHOLDER_IMAGE_SIZE}.png`,
      imageHint: "modern dormitory"
    },
    {
      icon: <Presentation className="h-10 w-10 text-primary" />,
      titleKey: "halls",
      descriptionKey: "tagline", // Placeholder
      link: "/halls",
      image: `https://placehold.co/${PLACEHOLDER_IMAGE_SIZE}.png`,
      imageHint: "conference hall"
    },
    {
      icon: <Utensils className="h-10 w-10 text-primary" />,
      titleKey: "cateringServices", // Needs new key
      descriptionKey: "tagline", // Placeholder
      link: "/halls#catering", // Assuming catering is part of halls
      image: `https://placehold.co/${PLACEHOLDER_IMAGE_SIZE}.png`,
      imageHint: "catering food"
    },
  ];
  // Add "cateringServices" to translation files if not present.
  // For now, I'll use existing keys or make reasonable assumptions.

  return (
    <PublicLayout>
      {/* Hero Section */}
      <section className="relative py-20 md:py-32 bg-gradient-to-b from-primary/10 to-background">
        <div className="container mx-auto text-center">
          <h1 className="text-4xl font-bold tracking-tight text-primary sm:text-5xl md:text-6xl">
            {t('welcomeTo')} {t('siteName')}
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
                    layout="fill" 
                    objectFit="cover"
                    data-ai-hint={service.imageHint}
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
            <div className="text-center p-6">
              <div className="flex justify-center mb-4">
                <svg xmlns="http://www.w3.org/2000/svg" width="48" height="48" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="text-accent"><path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z"></path><path d="m9 12 2 2 4-4"></path></svg> {/* ShieldCheck icon (inline SVG as lucide-react doesn't have it directly) */}
              </div>
              <h3 className="text-xl font-semibold mb-2">{t('securePayment')}</h3>
              <p className="text-foreground/70">{t('chapaGateway')}</p>
            </div>
            <div className="text-center p-6">
              <Globe className="h-12 w-12 text-accent mx-auto mb-4" />
              <h3 className="text-xl font-semibold mb-2">{t('multilingualSupport')}</h3>
              <p className="text-foreground/70">{t('languagesSupported')}</p>
            </div>
            <div className="text-center p-6">
               <svg xmlns="http://www.w3.org/2000/svg" width="48" height="48" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="text-accent"><rect width="18" height="18" x="3" y="4" rx="2" ry="2"/><line x1="12" x2="12" y1="2" y2="4"/><line x1="12" x2="12" y1="20" y2="22"/><line x1="4" x2="2" y1="12" y2="12"/><line x1="22" x2="20" y1="12" y2="12"/><line x1="4" x2="4" y1="20" y2="22"/><line x1="20" x2="20" y1="20" y2="22"/><line x1="4" x2="4" y1="2" y2="4"/><line x1="20" x2="20" y1="2" y2="4"/></svg> {/* Settings icon */}
              <h3 className="text-xl font-semibold mb-2">{t('adminPanel')}</h3>
              <p className="text-foreground/70">{t('powerfulManagement')}</p>
            </div>
          </div>
        </div>
      </section>
    </PublicLayout>
  );
}
