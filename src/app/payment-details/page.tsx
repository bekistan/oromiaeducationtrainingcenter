
"use client";

import React, { Suspense, useState, useEffect } from 'react';
import Link from 'next/link';
import { PublicLayout } from "@/components/layout/public-layout";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { useLanguage } from "@/hooks/use-language";
import { Banknote, Loader2, AlertCircle, FileText, ArrowRight } from "lucide-react";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert"; // Added Alert imports
import { useSearchParams, useRouter } from 'next/navigation';
import { db } from '@/lib/firebase';
import { doc, getDoc, Timestamp } from 'firebase/firestore';
import type { Booking } from '@/types';
import { SITE_NAME } from '@/constants';

function PaymentDetailsContent() {
  const { t } = useLanguage();
  const searchParams = useSearchParams();
  const router = useRouter();
  
  const [bookingId, setBookingId] = useState<string | null>(null);
  const [bookingDetails, setBookingDetails] = useState<Booking | null>(null);
  const [isLoadingBooking, setIsLoadingBooking] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const itemNameQuery = searchParams.get('itemName');
  const amountQuery = searchParams.get('amount');
  const categoryQuery = searchParams.get('category');

  useEffect(() => {
    const id = searchParams.get('bookingId');
    if (id) {
      setBookingId(id);
    } else {
      setError(t('missingBookingId'));
      setIsLoadingBooking(false);
    }
  }, [searchParams, t]);

  useEffect(() => {
    if (!bookingId) return;

    const fetchBooking = async () => {
      setIsLoadingBooking(true);
      setError(null);
      try {
        const bookingRef = doc(db, "bookings", bookingId);
        const docSnap = await getDoc(bookingRef);
        if (docSnap.exists()) {
          const data = docSnap.data() as Booking;
          // For dormitory, status should be 'pending_transfer' to show this page.
          // For facility, this page might be reached if admin directs them here after approval AND payment is pending.
          // This check might need refinement based on facility payment flow.
          if (data.bookingCategory === 'dormitory' && data.paymentStatus !== 'pending_transfer') {
            setError(t('paymentNotExpectedOrAlreadyProcessed'));
            setBookingDetails(null);
          } else {
            setBookingDetails(data);
          }
        } else {
          setError(t('bookingNotFound'));
        }
      } catch (err) {
        console.error("Error fetching booking for payment details:", err);
        setError(t('errorFetchingBookingDetails'));
      } finally {
        setIsLoadingBooking(false);
      }
    };
    fetchBooking();
  }, [bookingId, t]);

  if (isLoadingBooking) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[300px]">
        <Loader2 className="h-12 w-12 animate-spin text-primary mb-4" />
        <p>{t('loadingBookingDetails')}</p>
      </div>
    );
  }

  if (error || !bookingDetails) {
    return (
      <Card className="w-full max-w-lg text-center shadow-xl">
        <CardHeader>
          <AlertCircle className="w-12 h-12 text-destructive mx-auto mb-4" />
          <CardTitle className="text-2xl text-destructive">{t('error')}</CardTitle>
        </CardHeader>
        <CardContent>
          <p>{error || t('bookingNotFound')}</p>
          <Button onClick={() => router.push('/')} className="mt-4">{t('goToHomepage')}</Button>
        </CardContent>
      </Card>
    );
  }
  
  const displayItemName = bookingDetails.items.map(i => i.name).join(', ') || itemNameQuery;
  const displayAmount = (bookingDetails.totalCost ?? amountQuery)?.toString();
  const displayCategory = bookingDetails.bookingCategory || categoryQuery;

  const proofSubmissionQueryParams = new URLSearchParams({
    bookingId: bookingId!,
    amount: displayAmount || '',
    itemName: displayItemName || '',
    category: displayCategory || ''
  });

  return (
    <Card className="w-full max-w-lg shadow-xl">
      <CardHeader className="text-center">
        <Banknote className="w-12 h-12 text-primary mx-auto mb-4" />
        <CardTitle className="text-2xl">{t('completeYourPaymentTitle')}</CardTitle>
        <CardDescription>{t('completeYourPaymentDescription')}</CardDescription>
      </CardHeader>
      <CardContent>
        <div className="mb-6 p-4 border border-dashed border-primary/50 rounded-md bg-primary/5">
          <h3 className="font-semibold text-primary mb-2">{t('paymentInstructionsTitle')}</h3>
          <p className="text-sm text-foreground/80 mb-1"><strong>{t('bankNameLabel')}:</strong> {t('bankNameValue')}</p>
          <p className="text-sm text-foreground/80 mb-1"><strong>{t('accountNumberLabel')}:</strong> {t('accountNumberValue')}</p>
          <p className="text-sm text-foreground/80 mb-1"><strong>{t('accountNameLabel')}:</strong> {SITE_NAME}</p>
          <p className="text-sm text-foreground/80 font-bold"><strong>{t('amountToPayLabel')}:</strong> {displayAmount} {t('currencySymbol')}</p>
          <p className="text-xs text-muted-foreground mt-2">{t('paymentReferenceNote', {bookingId: bookingId || 'N/A'})}</p>
        </div>

        <div className="mb-6 space-y-2 text-sm p-4 border rounded-md">
            <h4 className="font-semibold text-foreground">{t('bookingSummary')}</h4>
            <div className="flex justify-between"><span className="text-muted-foreground">{t('bookingId')}:</span> <span>{bookingId}</span></div>
            {displayItemName && <div className="flex justify-between"><span className="text-muted-foreground">{t('item')}:</span> <span>{displayItemName}</span></div>}
            {displayCategory && <div className="flex justify-between"><span className="text-muted-foreground">{t('category')}:</span> <span className="capitalize">{t(displayCategory)}</span></div>}
        </div>

        <Alert>
          <FileText className="h-4 w-4" />
          <AlertTitle>{t('nextStepTitle')}</AlertTitle>
          <AlertDescription>
            {t('afterPaymentProceedToSubmitProof')}
          </AlertDescription>
        </Alert>
      </CardContent>
      <CardFooter>
        <Link href={`/submit-payment-proof?${proofSubmissionQueryParams.toString()}`} className="w-full">
          <Button className="w-full">
            {t('proceedToSubmitProofButton')}
            <ArrowRight className="ml-2 h-4 w-4" />
          </Button>
        </Link>
      </CardFooter>
    </Card>
  );
}

export default function PaymentDetailsPage() {
  const { t } = useLanguage();
  return (
    <PublicLayout>
      <div className="container mx-auto py-12 px-4 flex justify-center items-center min-h-[calc(100vh-8rem)]">
        <Suspense fallback={<div className="flex flex-col items-center"><Loader2 className="h-12 w-12 animate-spin text-primary mb-4" /> <p>{t('loading')}</p></div>}>
          <PaymentDetailsContent />
        </Suspense>
      </div>
    </PublicLayout>
  );
}

    