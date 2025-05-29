
'use client';

import React, { useState, useEffect, useCallback } from 'react';
import { useParams, useRouter } from 'next/navigation'; // Added useRouter
import type { Booking } from '@/types';
import { db } from '@/lib/firebase';
import { doc, getDoc, Timestamp } from 'firebase/firestore';
import { useToast } from '@/hooks/use-toast';
import { useLanguage } from '@/hooks/use-language';
import { AgreementTemplate } from '@/components/shared/agreement-template';
import { Loader2, AlertTriangle, ArrowLeft } from 'lucide-react'; 
import { Button } from '@/components/ui/button'; // Import Button

export default function BookingAgreementPage() {
  const params = useParams();
  const router = useRouter(); // Initialize useRouter
  const bookingId = params.bookingId as string;
  const { toast } = useToast();
  const { t } = useLanguage();

  const [booking, setBooking] = useState<Booking | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchBookingDetails = useCallback(async (id: string) => {
    if (!id) {
      setError(t('invalidBookingId')); 
      setIsLoading(false);
      return;
    }
    setIsLoading(true);
    setError(null);
    try {
      const bookingRef = doc(db, "bookings", id);
      const docSnap = await getDoc(bookingRef);

      if (docSnap.exists()) {
        const data = docSnap.data();
        const fetchedBooking = {
          id: docSnap.id,
          ...data,
          // Ensure dates are consistently strings for the template, or handle Timestamps there
          bookedAt: data.bookedAt instanceof Timestamp ? data.bookedAt.toDate().toISOString() : (typeof data.bookedAt === 'string' ? data.bookedAt : new Date().toISOString()),
          startDate: data.startDate instanceof Timestamp ? data.startDate.toDate().toISOString().split('T')[0] : (typeof data.startDate === 'string' ? data.startDate : new Date().toISOString().split('T')[0]),
          endDate: data.endDate instanceof Timestamp ? data.endDate.toDate().toISOString().split('T')[0] : (typeof data.endDate === 'string' ? data.endDate : new Date().toISOString().split('T')[0]),
        } as Booking;
        
        if (fetchedBooking.bookingCategory !== 'facility' || fetchedBooking.approvalStatus !== 'approved') {
            setError(t('agreementNotAvailableForBooking')); 
            setBooking(null);
        } else {
            setBooking(fetchedBooking);
        }
      } else {
        setError(t('bookingNotFound')); 
      }
    } catch (err) {
      console.error("Error fetching booking details for agreement:", err);
      setError(t('errorFetchingBookingDetails')); 
      toast({ variant: "destructive", title: t('error'), description: t('errorFetchingBookingDetails') });
    } finally {
      setIsLoading(false);
    }
  }, [t, toast]);

  useEffect(() => {
    if (bookingId) {
      fetchBookingDetails(bookingId);
    } else {
      setError(t('noBookingIdProvided')); 
      setIsLoading(false);
    }
  }, [bookingId, fetchBookingDetails]);

  if (isLoading) {
    return (
      <div className="flex flex-col items-center justify-center min-h-screen p-4 bg-slate-100">
        <Loader2 className="h-12 w-12 animate-spin text-primary mb-4" />
        <p className="text-lg text-slate-600">{t('loadingAgreementDetails')}</p> 
      </div>
    );
  }

  if (error) {
    return (
      <div className="flex flex-col items-center justify-center min-h-screen p-4 bg-slate-100 text-center">
        <AlertTriangle className="h-12 w-12 text-destructive mb-4" />
        <p className="text-lg text-destructive mb-6">{error}</p>
        <Button onClick={() => router.back()} variant="outline">
            <ArrowLeft className="mr-2 h-4 w-4" /> {t('goBack')}
        </Button>
      </div>
    );
  }
  
  return (
    <div className="bg-slate-100 min-h-screen py-8 px-2 print:bg-white">
        <div className="max-w-4xl mx-auto mb-4 no-print">
            <Button onClick={() => router.back()} variant="outline" size="sm">
                <ArrowLeft className="mr-2 h-4 w-4" /> {t('backToBookings')}
            </Button>
        </div>
        <AgreementTemplate booking={booking} />
    </div>
  );
}
