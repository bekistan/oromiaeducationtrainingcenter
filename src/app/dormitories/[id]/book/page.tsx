
"use client";

import React, { useState, useEffect, useCallback } from 'react';
import { PublicLayout } from "@/components/layout/public-layout";
import { BookingForm } from "@/components/sections/booking-form";
import { useLanguage } from "@/hooks/use-language";
import { useParams } from 'next/navigation';
import { BedDouble, Loader2 } from "lucide-react";
import type { BookingItem, Dormitory } from "@/types";
import { db } from '@/lib/firebase';
import { doc, getDoc } from 'firebase/firestore';
import { useToast } from '@/hooks/use-toast';

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
      setError(t('invalidDormitoryId')); // Add to JSON: "Invalid dormitory ID."
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
          setError(t('dormitoryNotAvailableError')); // Add to JSON: "This dormitory is currently not available for booking."
          setIsLoading(false);
          setBookingItem(null); // Ensure no booking item if not available
          return;
        }
        setBookingItem({
          id: docSnap.id,
          name: `${dormData.roomNumber} (${t('floor')} ${dormData.floor})`,
          itemType: "dormitory",
          pricePerDay: dormData.pricePerDay,
        });
      } else {
        setError(t('itemNotFound')); // Use existing key
      }
    } catch (err) {
      console.error("Error fetching dormitory details:", err);
      setError(t('errorFetchingDormitoryDetails')); // Add to JSON: "Error fetching dormitory details. Please try again."
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
      setError(t('noDormitoryIdProvided')); // Add to JSON: "No dormitory ID was provided."
    }
  }, [dormitoryId, fetchDormitoryDetails]);

  if (isLoading) {
    return (
      <PublicLayout>
        <div className="container mx-auto py-8 px-4 text-center flex flex-col items-center justify-center min-h-[calc(100vh-12rem)]">
          <Loader2 className="h-12 w-12 animate-spin text-primary mb-4" />
          <p>{t('loadingDormitoryDetails')}</p> {/* Add to JSON: "Loading dormitory details..." */}
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
