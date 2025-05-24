
"use client";

import { PublicLayout } from "@/components/layout/public-layout";
import { BookingForm } from "@/components/sections/booking-form";
import { useLanguage } from "@/hooks/use-language";
import { useAuth } from "@/hooks/use-auth";
import { useParams, useRouter } from 'next/navigation';
import { Presentation, AlertCircle } from "lucide-react";
import type { BookingItem } from "@/types";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button"; // Added import

const getHallOrSectionDetails = (id: string): BookingItem | null => {
  // Placeholder: combine sample halls and sections for lookup
  const sampleItems = [
    { id: "h001", name: "Grand Meeting Hall A", itemType: "hall" as const },
    { id: "s001", name: "Training Section Alpha", itemType: "section" as const },
    { id: "s002", name: "Workshop Area Beta", itemType: "section" as const },
    { id: "s003", name: "Seminar Room Gamma", itemType: "section" as const },
  ];
  const found = sampleItems.find(item => item.id === id);
  if (found) return found;

  console.warn(`Hall/Section with ID ${id} not found in placeholder data.`);
  // Fallback or error handling
  return null; 
};

export default function BookHallOrSectionPage() {
  const { t } = useLanguage();
  const params = useParams();
  const router = useRouter();
  const { user, loading } = useAuth();
  const itemId = params.id as string;

  const itemDetails = getHallOrSectionDetails(itemId);

  if (loading) {
    return (
      <PublicLayout>
        <div className="container mx-auto py-8 px-4 text-center">
          <p>{t('loading')}...</p>
        </div>
      </PublicLayout>
    );
  }

  if (!user || user.role !== 'company_representative') {
    // If using localStorage for mock auth, direct navigation might not pick up user immediately.
    // A brief loading state or a redirect after a timeout might be needed for real scenarios.
    // For now, simple alert and redirect.
    // alert(t('mustBeLoggedInAsCompany'));
    // router.push('/auth/login?redirect=' + encodeURIComponent(router.asPath)); // Use router.asPath if available or construct
     return (
      <PublicLayout>
        <div className="container mx-auto py-12 px-4 flex justify-center items-center min-h-[calc(100vh-8rem)]">
            <Card className="w-full max-w-md shadow-xl">
                <CardHeader className="text-center">
                    <AlertCircle className="w-12 h-12 text-destructive mx-auto mb-4" />
                    <CardTitle className="text-2xl text-destructive">{t('accessDenied')}</CardTitle>
                </CardHeader>
                <CardContent className="text-center">
                    <p className="mb-4">{t('mustBeLoggedInAsCompanyToBookFacility')}</p> {/* Add to JSON */}
                    <Button onClick={() => router.push(`/auth/login?redirect=/halls/${itemId}/book`)}>{t('login')}</Button>
                </CardContent>
            </Card>
        </div>
      </PublicLayout>
    );
  }
  
  if (!itemDetails) {
    return (
      <PublicLayout>
        <div className="container mx-auto py-8 px-4 text-center">
          <h1 className="text-2xl text-destructive">{t('itemNotFound')}</h1>
        </div>
      </PublicLayout>
    );
  }

  return (
    <PublicLayout>
      <div className="container mx-auto py-8 px-4">
        <div className="flex flex-col items-center mb-8">
          <Presentation className="w-12 h-12 text-primary mb-2" />
          <h1 className="text-3xl font-bold text-primary text-center">
            {itemDetails.itemType === 'hall' ? t('bookHall') : t('bookSection')} {/* Add 'bookHall', 'bookSection' to JSON */}
          </h1>
          <p className="text-muted-foreground text-center max-w-md">{t('fillFormToBookFacility')}</p> {/* Add to JSON */}
        </div>
        <BookingForm bookingCategory="facility" itemsToBook={[itemDetails]} />
      </div>
    </PublicLayout>
  );
}

