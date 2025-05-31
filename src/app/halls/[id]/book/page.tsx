
"use client";

import React, { useState, useEffect, useCallback } from 'react';
import { PublicLayout } from "@/components/layout/public-layout";
import { BookingForm } from "@/components/sections/booking-form";
import { useLanguage } from "@/hooks/use-language";
import { useAuth } from "@/hooks/use-auth";
import { useParams, useRouter } from 'next/navigation';
import { Presentation, AlertCircle, Loader2 } from "lucide-react";
import type { BookingItem, Hall as HallType } from "@/types";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from '@/components/ui/button';
import { db } from '@/lib/firebase';
import { doc, getDoc } from 'firebase/firestore';
import { useToast } from '@/hooks/use-toast';

export default function BookHallOrSectionPage() {
  const { t } = useLanguage();
  const params = useParams();
  const router = useRouter();
  const { user, loading: authLoading } = useAuth();
  const { toast } = useToast();
  const itemId = params.id as string;

  const [bookingItem, setBookingItem] = useState<BookingItem | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchItemDetails = useCallback(async (id: string) => {
    if (!id) {
      setError(t('invalidItemId')); // Add to JSON: "Invalid item ID."
      setIsLoading(false);
      return;
    }
    setIsLoading(true);
    setError(null);
    try {
      const itemRef = doc(db, "halls", id); // Assuming "halls" collection for both halls and sections
      const docSnap = await getDoc(itemRef);

      if (docSnap.exists()) {
        const itemData = docSnap.data() as HallType;
        if (!itemData.isAvailable) {
          setError(t('itemNotAvailableError', { itemName: itemData.name })); // Add to JSON: "{itemName} is currently not available for booking."
          setIsLoading(false);
          setBookingItem(null);
          return;
        }
        setBookingItem({
          id: docSnap.id,
          name: itemData.name,
          itemType: itemData.itemType,
          rentalCost: itemData.rentalCost, // Pass rental cost for calculation
        });
      } else {
        setError(t('itemNotFound'));
      }
    } catch (err) {
      console.error("Error fetching item details:", err);
      setError(t('errorFetchingItemDetails')); // Add to JSON: "Error fetching item details. Please try again."
      toast({ variant: "destructive", title: t('error'), description: t('errorFetchingItemDetails')});
    } finally {
      setIsLoading(false);
    }
  }, [t, toast]);

  useEffect(() => {
    if (itemId) {
      fetchItemDetails(itemId);
    } else {
      setIsLoading(false);
      setError(t('noItemIdProvided')); // Add to JSON: "No item ID was provided."
    }
  }, [itemId, fetchItemDetails]);

  if (authLoading || isLoading) {
    return (
      <PublicLayout>
        <div className="container mx-auto py-8 px-4 text-center flex flex-col items-center justify-center min-h-[calc(100vh-12rem)]">
          <Loader2 className="h-12 w-12 animate-spin text-primary mb-4" />
          <p>{t('loadingItemDetails')}</p> {/* Add to JSON: "Loading item details..." */}
        </div>
      </PublicLayout>
    );
  }

  if (!user || user.role !== 'company_representative') {
     return (
      <PublicLayout>
        <div className="container mx-auto py-12 px-4 flex justify-center items-center min-h-[calc(100vh-8rem)]">
            <Card className="w-full max-w-md shadow-xl">
                <CardHeader className="text-center">
                    <AlertCircle className="w-12 h-12 text-destructive mx-auto mb-4" />
                    <CardTitle className="text-2xl text-destructive">{t('accessDenied')}</CardTitle>
                </CardHeader>
                <CardContent className="text-center">
                    <p className="mb-4">{t('mustBeLoggedInAsCompanyToBookFacility')}</p>
                    <Button onClick={() => router.push(`/auth/login?redirect=/halls/${itemId}/book`)}>{t('login')}</Button>
                </CardContent>
            </Card>
        </div>
      </PublicLayout>
    );
  }
  
  if (error || !bookingItem) {
    return (
      <PublicLayout>
        <div className="container mx-auto py-8 px-4 text-center">
          <h1 className="text-2xl text-destructive">{error || t('itemNotFound')}</h1>
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
            {bookingItem.itemType === 'hall' ? t('bookHall') : t('bookSection')}
          </h1>
          <p className="text-muted-foreground text-center max-w-md">{t('fillFormToBookFacility')}</p>
        </div>
        <BookingForm bookingCategory="facility" itemsToBook={[bookingItem]} />
      </div>
    </PublicLayout>
  );
}
