
"use client";

import Image from "next/image";
import { PublicLayout } from "@/components/layout/public-layout";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { useLanguage } from "@/hooks/use-language";
import Link from "next/link";
import { BedDouble, Presentation, Utensils, ShieldCheck, Settings, Languages } from "lucide-react"; // Added Languages
import { PLACEHOLDER_IMAGE_SIZE, SITE_NAME } from "@/constants"; // Import SITE_NAME

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
                    sizes="(max-width: 768px) 100vw, (max-width: 1200px) 50vw, 33vw" // Added sizes for responsiveness
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

      {/* Features Section - Card View */}
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
    </PublicLayout>
  );
}
