
"use client";

import React, { useState, useEffect, useCallback } from 'react';
import { PublicLayout } from "@/components/layout/public-layout";
import { BookingForm } from "@/components/sections/booking-form";
import { useLanguage } from "@/hooks/use-language";
import { useParams } from 'next/navigation';
import { BedDouble, Loader2, AlertCircle } from "lucide-react"; // Added AlertCircle
import type { BookingItem, Dormitory } from "@/types";
import { db } from '@/lib/firebase';
import { doc, getDoc } from 'firebase/firestore';
import { useToast } from '@/hooks/use-toast';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'; // Added Card imports
import { Button } from '@/components/ui/button'; // Added Button import

export default function BookDormitoryPage() {
  const { t } = useLanguage();
  const params = useParams();
  const { toast } = useToast();
  const dormitoryId = params.id as string;

  const [bookingItem, setBookingItem] = useState<BookingItem | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchDormitoryDetails = useCallback(async (id: string) => {
    if (!id) {
      setError(t('invalidDormitoryId'));
      setIsLoading(false);
      return;
    }
    if (!db) {
        setError(t('databaseConnectionError'));
        setIsLoading(false);
        return;
    }
    setIsLoading(true);
    setError(null);
    try {
      const dormRef = doc(db, "dormitories", id);
      const docSnap = await getDoc(dormRef);

      if (docSnap.exists()) {
        const dormData = docSnap.data() as Dormitory;
        if (!dormData.isAvailable) {
          // Use a more specific key for admin-disabled dormitories
          setError(t('dormitoryNotAvailableAdminOverride', { roomNumber: dormData.roomNumber })); 
          setIsLoading(false);
          setBookingItem(null);
          return;
        }
        setBookingItem({
          id: docSnap.id,
          name: `${t('roomNumber')} ${dormData.roomNumber} (${t('floor')} ${dormData.floor})`,
          itemType: "dormitory",
          pricePerDay: dormData.pricePerDay,
          capacity: dormData.capacity,
        });
      } else {
        setError(t('itemNotFound'));
      }
    } catch (err) {
      console.error("Error fetching dormitory details:", err);
      setError(t('errorFetchingDormitoryDetails'));
      toast({ variant: "destructive", title: t('error'), description: t('errorFetchingDormitoryDetails')});
    } finally {
      setIsLoading(false);
    }
  }, [t, toast]);

  useEffect(() => {
    if (dormitoryId) {
      fetchDormitoryDetails(dormitoryId);
    } else {
      setIsLoading(false);
      setError(t('noDormitoryIdProvided'));
    }
  }, [dormitoryId, fetchDormitoryDetails]);

  if (isLoading) {
    return (
      <PublicLayout>
        <div className="container mx-auto py-8 px-4 text-center flex flex-col items-center justify-center min-h-[calc(100vh-12rem)]">
          <Loader2 className="h-12 w-12 animate-spin text-primary mb-4" />
          <p>{t('loadingDormitoryDetails')}</p>
        </div>
      </PublicLayout>
    );
  }

  if (error || !bookingItem) {
    return (
      <PublicLayout>
        <div className="container mx-auto py-12 px-4 flex justify-center items-center min-h-[calc(100vh-8rem)]">
          <Card className="w-full max-w-md shadow-xl text-center">
            <CardHeader>
              <AlertCircle className="w-12 h-12 text-destructive mx-auto mb-4" />
              <CardTitle className="text-2xl text-destructive">{t('bookingErrorTitle')}</CardTitle> {/* Add to JSON */}
            </CardHeader>
            <CardContent>
              <p className="mb-4">{error || t('itemNotFound')}</p>
              <Button onClick={() => window.history.back()}>{t('goBack')}</Button>
            </CardContent>
          </Card>
        </div>
      </PublicLayout>
    );
  }

  return (
    <PublicLayout>
      <div className="container mx-auto py-8 px-4">
        <div className="flex flex-col items-center mb-8">
          <BedDouble className="w-12 h-12 text-primary mb-2" />
          <h1 className="text-3xl font-bold text-primary text-center">
            {t('bookDormitory')}
          </h1>
          <p className="text-muted-foreground text-center max-w-md">{t('fillFormToBookDormitory')}</p>
        </div>
        <BookingForm bookingCategory="dormitory" itemsToBook={[bookingItem]} />
      </div>
    </PublicLayout>
  );
}
