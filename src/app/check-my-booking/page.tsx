
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
import { Loader2, Search, AlertCircle, BedDouble, CalendarDays, DollarSign, ShieldCheck, Phone } from "lucide-react";
import { Badge } from '@/components/ui/badge';
import { toDateObject, formatDualDate } from '@/lib/date-utils'; // Use formatDualDate

export default function CheckMyBookingPage() {
  const { t } = useLanguage();
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
        where("approvalStatus", "==", "approved")
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
  
  const getPaymentStatusBadge = (status?: Booking['paymentStatus']) => {
    if (!status) return <Badge variant="secondary">{t('unknown')}</Badge>;
    switch (status) {
      case 'paid':
        return <Badge className="bg-green-100 text-green-700 border-green-300 hover:bg-green-200">{t(status)}</Badge>;
      case 'pending_transfer':
         return <Badge className="bg-amber-100 text-amber-700 border-amber-300 hover:bg-amber-200">{t(status)}</Badge>;
      case 'awaiting_verification':
        return <Badge className="bg-sky-100 text-sky-700 border-sky-300 hover:bg-sky-200">{t(status)}</Badge>;
      case 'failed':
        return <Badge className="bg-red-100 text-red-700 border-red-300 hover:bg-red-200">{t(status)}</Badge>;
      default:
        return <Badge variant="secondary">{t(status)}</Badge>;
    }
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
            <h2 className="text-xl font-semibold text-center text-primary">{t('yourActiveBookingDetails')} ({bookings.length})</h2>
            {bookings.map(booking => (
              <Card key={booking.id} className="shadow-lg">
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
                   <div className="flex items-center">
                    <ShieldCheck className="mr-2 h-4 w-4 text-muted-foreground" />
                    <span>{t('paymentStatus')}: {getPaymentStatusBadge(booking.paymentStatus)}</span>
                  </div>
                </CardContent>
                 <CardFooter>
                    <p className="text-xs text-muted-foreground">
                      {t('bookedOn')}: {formatDualDate(booking.bookedAt)}
                    </p>
                </CardFooter>
              </Card>
            ))}
          </div>
        )}
      </div>
    </PublicLayout>
  );
}

    

    
