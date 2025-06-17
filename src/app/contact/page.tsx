
"use client";

import { PublicLayout } from "@/components/layout/public-layout";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { useLanguage } from "@/hooks/use-language";
import { Phone, Mail, MapPin, Building, Users } from "lucide-react";
import { SITE_NAME } from "@/constants";

interface ContactPerson {
  nameKey: string;
  buildingKey: string;
  roomRangeKey: string;
  phone: string;
}

export default function ContactUsPage() {
  const { t } = useLanguage();

  const contactPeople: ContactPerson[] = [
    {
      nameKey: "adminIfaBoruName", // e.g., "Mr. Ifa Boru Contact"
      buildingKey: "ifaBoruBuilding", // "Ifa Boru Building"
      roomRangeKey: "ifaBoruRooms", // "Rooms 001-077"
      phone: "+251911111111", // Placeholder, replace with actual number
    },
    {
      nameKey: "adminBuuraBoruName", // e.g., "Ms. Bu'ura Boru Contact"
      buildingKey: "buuraBoruBuilding", // "Bu'ura Boru Building"
      roomRangeKey: "buuraBoruRooms", // "Rooms 078-175"
      phone: "+251922222222", // Placeholder, replace with actual number
    },
  ];

  // Replace this with the actual Google Maps embed URL for your location
  const googleMapsEmbedUrl = "https://www.google.com/maps/embed?pb=!1m18!1m12!1m3!1d252231.7314988568!2d38.61332471060792!3d9.005401249999999!2m3!1f0!2f0!3f0!3m2!1i1024!2i768!4f13.1!3m3!1m2!1s0x164b8f913a515955%3A0x166e629084840434!2sAddis%20Ababa!5e0!3m2!1sen!2set!4v1716816862654!5m2!1sen!2set";

  return (
    <PublicLayout>
      <div className="container mx-auto py-12 px-4">
        <header className="text-center mb-12">
          <h1 className="text-4xl font-bold text-primary mb-2">
            {t('contactUsTitle')}
          </h1>
          <p className="text-lg text-muted-foreground max-w-2xl mx-auto">
            {t('contactUsSubtitle')}
          </p>
        </header>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-8 items-start">
          <Card className="shadow-lg">
            <CardHeader>
              <CardTitle className="flex items-center text-2xl">
                <Building className="mr-3 h-7 w-7 text-primary" />
                {t('contactBuildingAdminsTitle')}
              </CardTitle>
              <CardDescription>{t('contactBuildingAdminsDesc')}</CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
              {contactPeople.map((person) => (
                <div key={person.nameKey} className="p-4 border rounded-lg bg-background hover:shadow-md transition-shadow">
                  <h3 className="text-lg font-semibold text-foreground mb-1">{t(person.nameKey)}</h3>
                  <p className="text-sm text-muted-foreground">
                    {t(person.buildingKey)} - {t(person.roomRangeKey)}
                  </p>
                  <div className="flex items-center mt-2">
                    <Phone className="h-5 w-5 mr-2 text-primary" />
                    <a href={`tel:${person.phone}`} className="text-primary hover:underline">
                      {person.phone}
                    </a>
                  </div>
                  <Button asChild variant="outline" size="sm" className="mt-3 w-full">
                    <a href={`tel:${person.phone}`}>
                      <Phone className="mr-2 h-4 w-4" /> {t('callNow')}
                    </a>
                  </Button>
                </div>
              ))}
            </CardContent>
          </Card>

          <Card className="shadow-lg">
            <CardHeader>
              <CardTitle className="flex items-center text-2xl">
                <Users className="mr-3 h-7 w-7 text-primary" />
                {t('generalInquiriesTitle')}
              </CardTitle>
              <CardDescription>{t('generalInquiriesDesc')}</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="flex items-start">
                <MapPin className="h-6 w-6 mr-3 text-primary mt-1 flex-shrink-0" />
                <div>
                  <h4 className="font-semibold text-foreground">{t('ourLocation')}</h4>
                  <p className="text-sm text-muted-foreground">{t('addressPlaceholder')}</p> {/* Replace with actual address */}
                </div>
              </div>
              <div className="flex items-start">
                <Phone className="h-6 w-6 mr-3 text-primary mt-1 flex-shrink-0" />
                <div>
                  <h4 className="font-semibold text-foreground">{t('generalPhone')}</h4>
                  <a href="tel:+251000000000" className="text-primary hover:underline text-sm">
                    {t('generalPhoneNumberPlaceholder')} {/* Replace */}
                  </a>
                </div>
              </div>
              <div className="flex items-start">
                <Mail className="h-6 w-6 mr-3 text-primary mt-1 flex-shrink-0" />
                <div>
                  <h4 className="font-semibold text-foreground">{t('generalEmail')}</h4>
                  <a href="mailto:info@example.com" className="text-primary hover:underline text-sm">
                    {t('generalEmailAddressPlaceholder')} {/* Replace */}
                  </a>
                </div>
              </div>
               <p className="text-xs text-muted-foreground pt-4">{t('workingHoursNote', { hours: "8:00 AM - 5:00 PM, Monday - Friday" })}</p>
            </CardContent>
          </Card>
        </div>
        
        <div className="mt-12">
          <Card className="shadow-lg">
            <CardHeader>
              <CardTitle className="text-2xl text-center">{t('findUsOnMap')}</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="aspect-video bg-muted rounded-md overflow-hidden">
                <iframe
                  src={googleMapsEmbedUrl}
                  width="100%"
                  height="100%"
                  style={{ border:0 }}
                  allowFullScreen={true}
                  loading="lazy"
                  referrerPolicy="no-referrer-when-downgrade"
                  title={t('googleMapsEmbedTitle')}
                ></iframe>
              </div>
              <p className="text-xs text-center text-muted-foreground mt-2">
                {t('mapEmbedNote')}
              </p>
            </CardContent>
          </Card>
        </div>
      </div>
    </PublicLayout>
  );
}
