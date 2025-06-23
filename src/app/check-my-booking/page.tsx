
"use client";

import React, { useState, useCallback } from 'react';
import { PublicLayout } from "@/components/layout/public-layout";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardDescription, CardHeader, CardTitle, CardFooter } from "@/components/ui/card";
import { useLanguage } from "@/hooks/use-language";
import type { Booking } from "@/types";
import { db } from '@/lib/firebase';
import { collection, query, where, getDocs, Timestamp } from 'firebase/firestore';
import { Loader2, Search, AlertCircle, BedDouble, CalendarDays, DollarSign, UploadCloud, Hourglass, CheckCircle, FileImage } from "lucide-react";
import { toDateObject, formatDualDate } from '@/lib/date-utils';
import { useRouter } from 'next/navigation';
import Link from 'next/link';

export default function CheckMyBookingPage() {
  const { t } = useLanguage();
  const router = useRouter();
  const [phoneNumber, setPhoneNumber] = useState('');
  const [bookings, setBookings] = useState<Booking[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [searched, setSearched] = useState(false);

  const handleSearch = useCallback(async () => {
    if (!phoneNumber.trim()) {
      setError(t('pleaseEnterPhoneNumber')); 
      return;
    }
    setIsLoading(true);
    setError(null);
    setBookings([]);
    setSearched(true);

    try {
      const q = query(
        collection(db, "bookings"),
        where("bookingCategory", "==", "dormitory"),
        where("phone", "==", phoneNumber.trim()),
        where("approvalStatus", "in", ["pending", "approved", "rejected"]) // Fetch all relevant statuses
      );
      const querySnapshot = await getDocs(q);

      const today = new Date();
      today.setHours(0, 0, 0, 0); 

      const foundBookings = querySnapshot.docs
        .map(docSnap => {
          const data = docSnap.data();
          return {
            id: docSnap.id,
            ...data,
            bookedAt: data.bookedAt instanceof Timestamp ? data.bookedAt.toDate().toISOString() : data.bookedAt,
            startDate: data.startDate instanceof Timestamp ? data.startDate.toDate().toISOString() : data.startDate,
            endDate: data.endDate instanceof Timestamp ? data.endDate.toDate().toISOString() : data.endDate,
          } as Booking;
        })
        .filter(booking => {
            const bookingEndDate = toDateObject(booking.endDate);
            if (!bookingEndDate) return false;
            bookingEndDate.setHours(23, 59, 59, 999);
            return bookingEndDate >= today; // Only show active or upcoming
        })
        .sort((a, b) => {
          const dateA = toDateObject(a.startDate);
          const dateB = toDateObject(b.startDate);
          if (!dateA || !dateB) return 0;
          return dateB.getTime() - dateA.getTime(); // Sort by most recent start date
        });
        
      setBookings(foundBookings);
    } catch (err) {
      console.error("Error searching bookings:", err);
      setError(t('errorSearchingBookings'));
    } finally {
      setIsLoading(false);
    }
  }, [phoneNumber, t]);
  
  const getStatusComponent = (booking: Booking) => {
    if (booking.paymentStatus === 'paid' && booking.approvalStatus === 'approved') {
        return (
            <div className="flex flex-col items-center text-center p-4 bg-green-50 border-t border-green-200">
                <CheckCircle className="w-8 h-8 text-green-600 mb-2"/>
                <p className="font-semibold text-green-700">{t('bookingConfirmedTitle')}</p>
                <p className="text-xs text-green-600">{t('bookingConfirmedDesc')}</p>
            </div>
        );
    }
    if (booking.paymentStatus === 'awaiting_verification') {
        return (
            <div className="flex flex-col items-center text-center p-4 bg-sky-50 border-t border-sky-200">
                <Hourglass className="w-8 h-8 text-sky-600 mb-2"/>
                <p className="font-semibold text-sky-700">{t('paymentAwaitingVerificationTitle')}</p>
                <p className="text-xs text-sky-600">{t('paymentAwaitingVerificationDesc')}</p>
                 {booking.paymentScreenshotUrl && (
                    <a href={booking.paymentScreenshotUrl} target="_blank" rel="noopener noreferrer" className="text-xs text-sky-700 hover:underline mt-1 flex items-center">
                        <FileImage className="w-3 h-3 mr-1"/> {t('viewYourUploadedProof')}
                    </a>
                )}
            </div>
        );
    }
    if (booking.paymentStatus === 'pending_transfer') {
        const resumeUrl = `/booking-confirmation?bookingId=${booking.id}&itemName=${encodeURIComponent(booking.items.map(i => i.name).join(', '))}&amount=${booking.totalCost}&category=dormitory&phone=${booking.phone}&status=booking_pending_approval`;
        return (
            <div className="flex flex-col items-center text-center p-4 bg-amber-50 border-t border-amber-200">
                 <AlertCircle className="w-8 h-8 text-amber-600 mb-2"/>
                <p className="font-semibold text-amber-700">{t('paymentProofRequiredTitle')}</p>
                <p className="text-xs text-amber-600 mb-3">{t('paymentProofRequiredDesc')}</p>
                <Button asChild size="sm">
                    <Link href={resumeUrl}>
                        <UploadCloud className="mr-2 h-4 w-4" />
                        {t('submitPaymentProofButton')}
                    </Link>
                </Button>
            </div>
        )
    }
     if (booking.approvalStatus === 'rejected' || booking.paymentStatus === 'failed') {
        return (
            <div className="flex flex-col items-center text-center p-4 bg-red-50 border-t border-red-200">
                <AlertCircle className="w-8 h-8 text-red-600 mb-2"/>
                <p className="font-semibold text-red-700">{t('bookingRejectedTitle')}</p>
                <p className="text-xs text-red-600">{t('bookingRejectedDesc')}</p>
            </div>
        );
    }
    
    return (
      <div className="flex flex-col items-center text-center p-4 bg-gray-50 border-t border-gray-200">
        <p className="text-sm text-muted-foreground">{t('status')}: {t(booking.approvalStatus)} / {t(booking.paymentStatus)}</p>
      </div>
    );
  };

  return (
    <PublicLayout>
      <div className="container mx-auto py-12 px-4 min-h-[calc(100vh-15rem)]">
        <Card className="max-w-lg mx-auto shadow-xl">
          <CardHeader className="text-center">
            <div className="mx-auto bg-primary/10 p-3 rounded-full w-fit mb-2">
                <BedDouble className="w-8 h-8 text-primary" />
            </div>
            <CardTitle className="text-2xl sm:text-3xl">{t('myDormitoryTitle')}</CardTitle>
            <CardDescription>{t('myDormitoryDescription')}</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="flex space-x-2">
              <Input
                type="tel"
                placeholder={t('enterPhoneNumberPrompt')}
                value={phoneNumber}
                onChange={(e) => {
                  setPhoneNumber(e.target.value);
                  setError(null); 
                  setSearched(false); 
                }}
                className="flex-grow"
                onKeyPress={(e) => e.key === 'Enter' && handleSearch()}
              />
              <Button onClick={handleSearch} disabled={isLoading}>
                {isLoading ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Search className="mr-2 h-4 w-4" />}
                {t('searchBookingButton')}
              </Button>
            </div>
            {error && (
              <p className="text-sm text-destructive flex items-center">
                <AlertCircle className="mr-1 h-4 w-4" /> {error}
              </p>
            )}
          </CardContent>
        </Card>

        {isLoading && (
          <div className="text-center mt-8">
            <Loader2 className="mx-auto h-8 w-8 animate-spin text-primary" />
            <p className="text-muted-foreground mt-2">{t('searchingBookings')}</p>
          </div>
        )}

        {!isLoading && searched && bookings.length === 0 && !error && (
          <Card className="max-w-lg mx-auto mt-8 shadow-md">
            <CardContent className="pt-6 text-center">
              <AlertCircle className="mx-auto h-10 w-10 text-muted-foreground mb-3" />
              <p className="text-muted-foreground">{t('noActiveBookingsFoundForPhone')}</p>
            </CardContent>
          </Card>
        )}

        {!isLoading && bookings.length > 0 && (
          <div className="mt-8 max-w-2xl mx-auto space-y-6">
            <h2 className="text-xl font-semibold text-center text-primary">{t('yourActiveBookingsTitle')} ({bookings.length})</h2>
            {bookings.map(booking => (
              <Card key={booking.id} className="shadow-lg overflow-hidden">
                <CardHeader>
                  <CardTitle className="flex items-center text-lg">
                    <BedDouble className="mr-2 h-5 w-5 text-primary" />
                    {booking.items.map(item => item.name).join(', ')}
                  </CardTitle>
                  <CardDescription>{t('bookingId')}: {booking.id.substring(0, 10)}...</CardDescription>
                </CardHeader>
                <CardContent className="space-y-2 text-sm">
                  <div className="flex items-center">
                    <CalendarDays className="mr-2 h-4 w-4 text-muted-foreground" />
                    <span>{t('bookingDates')}: {formatDualDate(booking.startDate)} - {formatDualDate(booking.endDate)}</span>
                  </div>
                  <div className="flex items-center">
                    <DollarSign className="mr-2 h-4 w-4 text-muted-foreground" />
                    <span>{t('totalCost')}: {booking.totalCost} {t('currencySymbol')}</span>
                  </div>
                </CardContent>
                 {getStatusComponent(booking)}
              </Card>
            ))}
          </div>
        )}
      </div>
    </PublicLayout>
  );
}
