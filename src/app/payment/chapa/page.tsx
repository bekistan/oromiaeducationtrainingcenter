
"use client";

import React, { Suspense } from 'react'; // Added React import
import { PublicLayout } from "@/components/layout/public-layout";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { useLanguage } from "@/hooks/use-language";
import { CreditCard, Loader2 } from "lucide-react";
import { useSearchParams, useRouter } from 'next/navigation';
import { useToast } from "@/hooks/use-toast";
import { db } from '@/lib/firebase'; // Import db
import { collection, addDoc, Timestamp } from 'firebase/firestore'; // Import Firestore functions

function ChapaPaymentContent() {
  const { t } = useLanguage();
  const searchParams = useSearchParams();
  const router = useRouter();
  const { toast } = useToast();
  const [isProcessing, setIsProcessing] = React.useState(false);

  // Extract all necessary booking details from query params
  const bookingIdParam = searchParams.get('bookingId'); // This is a temp ID from previous page
  const amount = searchParams.get('amount');
  const itemName = searchParams.get('itemName');
  const bookingCategory = searchParams.get('bookingCategory');
  
  // For dormitory bookings, reconstruct data to save after payment
  const guestName = searchParams.get('guestName');
  const guestEmployer = searchParams.get('guestEmployer');
  const startDateString = searchParams.get('startDate');
  const endDateString = searchParams.get('endDate');
  const userId = searchParams.get('userId');
  const itemIdsString = searchParams.get('itemIds');
  const itemNamesString = searchParams.get('itemNames');
  const itemTypesString = searchParams.get('itemTypes');


  if (!amount || !itemName || !bookingCategory) {
    return (
      <Card className="w-full max-w-md shadow-xl">
        <CardHeader>
          <CardTitle className="text-center text-destructive">{t('error')}</CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-center">{t('missingBookingDetails')}</p>
          <Button onClick={() => router.push('/')} className="w-full mt-4">{t('goToHomepage')}</Button>
        </CardContent>
      </Card>
    );
  }

  const handlePayment = async () => {
    setIsProcessing(true);
    console.log(`Simulating Chapa payment for amount: ${amount}`);
    
    // Simulate successful payment after a short delay
    await new Promise(resolve => setTimeout(resolve, 1500));

    let finalBookingId = '';

    if (bookingCategory === 'dormitory') {
      // Construct items array
      const itemIds = itemIdsString?.split(',') || [];
      const itemNames = itemNamesString?.split(',') || [];
      const itemTypes = itemTypesString?.split(',') || [];
      const itemsToBook = itemIds.map((id, index) => ({
        id,
        name: itemNames[index],
        itemType: itemTypes[index] as 'dormitory' | 'hall' | 'section',
      }));

      const bookingData = {
        bookingCategory: 'dormitory',
        items: itemsToBook,
        guestName,
        guestEmployer,
        startDate: startDateString ? Timestamp.fromDate(new Date(startDateString)) : Timestamp.now(),
        endDate: endDateString ? Timestamp.fromDate(new Date(endDateString)) : Timestamp.now(),
        totalCost: parseFloat(amount),
        paymentStatus: 'paid' as const,
        approvalStatus: 'approved' as const, // Dorms auto-approved on payment
        bookedAt: Timestamp.now(),
        ...(userId && { userId }),
      };

      try {
        const docRef = await addDoc(collection(db, "bookings"), bookingData);
        finalBookingId = docRef.id;
        toast({
          title: t('paymentSuccessful'),
          description: `${t('paymentFor')} ${itemName} ${t('processed')}`,
        });
      } catch (error) {
        console.error("Error saving dormitory booking: ", error);
        toast({ variant: "destructive", title: t('error'), description: t('errorSavingBooking') }); // Add to JSON
        setIsProcessing(false);
        return;
      }
    } else if (bookingCategory === 'facility') {
        // For facility, payment might happen after approval.
        // This page might be reached via a link sent after admin approval.
        // We'd need the actual booking ID from Firestore passed here.
        // For now, assume bookingIdParam is the actual Firestore booking ID for facilities.
        if (bookingIdParam) {
            finalBookingId = bookingIdParam;
            // Here you would update the existing facility booking in Firestore to 'paid'
            // const bookingRef = doc(db, "bookings", bookingIdParam);
            // await updateDoc(bookingRef, { paymentStatus: 'paid' });
            toast({
              title: t('paymentSuccessful'),
              description: `${t('paymentFor')} ${itemName} ${t('processed')}`,
            });
        } else {
             toast({ variant: "destructive", title: t('error'), description: t('missingBookingIdForFacility') }); // Add to JSON
             setIsProcessing(false);
             return;
        }
    }


    const queryParams = new URLSearchParams({
      bookingId: finalBookingId,
      status: 'paid',
      itemName,
      amount,
      category: bookingCategory,
    });
    router.push(`/booking-confirmation?${queryParams.toString()}`);
    setIsProcessing(false);
  };

  return (
    <Card className="w-full max-w-md shadow-xl">
      <CardHeader className="text-center">
        <div className="mx-auto bg-primary/10 p-3 rounded-full w-fit mb-4">
          <CreditCard className="w-10 h-10 text-primary" />
        </div>
        <CardTitle className="text-2xl">{t('chapaPaymentTitle')}</CardTitle>
        <CardDescription>{t('chapaPaymentDescription')}</CardDescription>
      </CardHeader>
      <CardContent>
        <div className="space-y-4 mb-6">
          {/* Removed bookingIdParam display as it's temporary for dorms */}
          <div className="flex justify-between">
            <span className="font-medium">{t('item')}:</span>
            <span>{itemName}</span>
          </div>
           <div className="flex justify-between">
            <span className="font-medium">{t('category')}:</span>
            <span className="capitalize">{t(bookingCategory)}</span>
          </div>
          <div className="flex justify-between">
            <span className="font-medium">{t('totalAmount')}:</span>
            <span className="font-semibold text-primary">{amount} ETB</span>
          </div>
        </div>
        <Button className="w-full" onClick={handlePayment} disabled={isProcessing}>
          {isProcessing && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
          {t('payWithChapa')}
        </Button>
      </CardContent>
    </Card>
  );
}

export default function ChapaPaymentPage() {
  const { t } = useLanguage();
  return (
    <PublicLayout>
      <div className="container mx-auto py-12 px-4 flex justify-center items-center min-h-[calc(100vh-8rem)]">
        <Suspense fallback={<div className="flex flex-col items-center"><Loader2 className="h-12 w-12 animate-spin text-primary mb-4" /> <p>{t('loadingPaymentDetails')}</p></div>}>
          <ChapaPaymentContent />
        </Suspense>
      </div>
    </PublicLayout>
  );
}
