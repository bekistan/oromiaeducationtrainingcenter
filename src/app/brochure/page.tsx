
"use client";

import { PublicLayout } from "@/components/layout/public-layout";
import { useLanguage } from "@/hooks/use-language";
import { SITE_NAME } from "@/constants";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { BedDouble, Presentation, Utensils, Wifi, ParkingSquare, ShieldCheck, MapPin, Phone, Mail } from "lucide-react";
import { ScrollAnimate } from "@/components/shared/scroll-animate";

export default function BrochurePage() {
  const { t } = useLanguage();

  const services = [
    {
      icon: <BedDouble className="h-8 w-8 text-primary" />,
      titleKey: "brochureDormitoriesTitle",
      descriptionKey: "brochureDormitoriesDesc",
    },
    {
      icon: <Presentation className="h-8 w-8 text-primary" />,
      titleKey: "brochureHallsTitle",
      descriptionKey: "brochureHallsDesc",
    },
    {
      icon: <Utensils className="h-8 w-8 text-primary" />,
      titleKey: "brochureCateringTitle",
      descriptionKey: "brochureCateringDesc",
    },
  ];

  const features = [
    { icon: <Wifi className="h-6 w-6 text-accent" />, textKey: "brochureFeatureWifi" },
    { icon: <ParkingSquare className="h-6 w-6 text-accent" />, textKey: "brochureFeatureParking" },
    { icon: <ShieldCheck className="h-6 w-6 text-accent" />, textKey: "brochureFeatureSecurity" },
  ];

  return (
    <PublicLayout>
      <div className="container mx-auto py-12 px-4 bg-background text-foreground">
        <ScrollAnimate className="text-center mb-12">
          <h1 className="text-4xl font-extrabold text-primary tracking-tight sm:text-5xl md:text-6xl">
            {t('welcomeTo')} {SITE_NAME}
          </h1>
          <p className="mt-4 max-w-2xl mx-auto text-xl text-muted-foreground">
            {t('brochureSubtitle', { siteName: SITE_NAME })}
          </p>
        </ScrollAnimate>

        <section className="mb-16">
          <ScrollAnimate>
            <h2 className="text-3xl font-semibold text-center text-foreground mb-8">{t('brochureAboutUsTitle')}</h2>
            <Card className="shadow-lg">
              <CardContent className="p-6 md:p-8">
                <p className="text-lg leading-relaxed text-muted-foreground">
                  {t('brochureAboutUsContent', { siteName: SITE_NAME })}
                </p>
              </CardContent>
            </Card>
          </ScrollAnimate>
        </section>

        <section className="mb-16">
          <ScrollAnimate>
            <h2 className="text-3xl font-semibold text-center text-foreground mb-10">{t('brochureOurServicesTitle')}</h2>
          </ScrollAnimate>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
            {services.map((service, index) => (
              <ScrollAnimate key={service.titleKey} delay={index * 100}>
                <Card className="text-center shadow-xl hover:shadow-2xl transition-shadow duration-300 h-full">
                  <CardHeader className="items-center">
                    <div className="p-4 bg-primary/10 rounded-full mb-4 inline-block">
                      {service.icon}
                    </div>
                    <CardTitle className="text-2xl text-primary">{t(service.titleKey)}</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <p className="text-muted-foreground">{t(service.descriptionKey)}</p>
                  </CardContent>
                </Card>
              </ScrollAnimate>
            ))}
          </div>
        </section>

        <section className="mb-16 bg-secondary/20 py-12 rounded-lg">
          <div className="container mx-auto">
            <ScrollAnimate>
              <h2 className="text-3xl font-semibold text-center text-foreground mb-10">{t('brochureKeyFeaturesTitle')}</h2>
            </ScrollAnimate>
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-8">
              {features.map((feature, index) => (
                <ScrollAnimate key={feature.textKey} delay={index * 100}>
                  <div className="flex items-start p-4">
                    <div className="flex-shrink-0 mr-4">
                      <div className="p-3 bg-accent/10 rounded-full">
                        {feature.icon}
                      </div>
                    </div>
                    <div>
                      <h4 className="text-lg font-medium text-foreground">{t(feature.textKey)}</h4>
                    </div>
                  </div>
                </ScrollAnimate>
              ))}
            </div>
             <p className="text-center text-muted-foreground mt-8">{t('brochureKeyFeaturesMore')}</p>
          </div>
        </section>
        
        <section className="mb-12">
          <ScrollAnimate>
            <h2 className="text-3xl font-semibold text-center text-foreground mb-8">{t('brochureWhyChooseUsTitle')}</h2>
            <Card className="shadow-lg">
              <CardContent className="p-6 md:p-8">
                  <ul className="list-disc list-inside space-y-2 text-lg text-muted-foreground">
                      <li>{t('brochureWhyChoosePrimeLocation')}</li>
                      <li>{t('brochureWhyChooseExcellentService')}</li>
                      <li>{t('brochureWhyChooseCompetitivePricing')}</li>
                      <li>{t('brochureWhyChooseCommitmentToQuality')}</li>
                  </ul>
              </CardContent>
            </Card>
          </ScrollAnimate>
        </section>

        <ScrollAnimate>
          <section className="text-center py-10 bg-primary/90 text-primary-foreground rounded-lg">
            <h2 className="text-3xl font-semibold mb-4">{t('brochureCallToActionTitle')}</h2>
            <p className="text-lg mb-6 max-w-xl mx-auto">{t('brochureCallToActionDesc')}</p>
            <div className="flex flex-col sm:flex-row justify-center items-center gap-4">
              <div className="flex items-center">
                <Phone className="h-5 w-5 mr-2"/>
                <span>{t('generalPhoneNumberPlaceholder')}</span>
              </div>
              <div className="flex items-center">
                <Mail className="h-5 w-5 mr-2"/>
                <span>{t('generalEmailAddressPlaceholder')}</span>
              </div>
              <div className="flex items-center">
                <MapPin className="h-5 w-5 mr-2"/>
                <span>{t('addressPlaceholder')}</span>
              </div>
            </div>
          </section>
        </ScrollAnimate>

        <footer className="mt-16 text-center text-sm text-muted-foreground">
          <p>&copy; {new Date().getFullYear()} {SITE_NAME}. {t('allRightsReserved')}.</p>
        </footer>
      </div>
    </PublicLayout>
  );
}
