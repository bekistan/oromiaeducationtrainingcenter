
"use client";

import React, { Suspense, useState, useEffect } from 'react';
import { PublicLayout } from "@/components/layout/public-layout";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { useLanguage } from "@/hooks/use-language";
import { Banknote, Loader2, AlertCircle, MessageSquare, Send } from "lucide-react";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { useSearchParams, useRouter } from 'next/navigation';
import { db } from '@/lib/firebase';
import { doc, getDoc } from 'firebase/firestore';
import type { Booking, BankAccountDetails } from '@/types';
import { useToast } from '@/hooks/use-toast';
import { useQuery } from '@tanstack/react-query';

const BANK_DETAILS_DOC_PATH = "site_configuration/bank_account_details";
const BANK_DETAILS_QUERY_KEY = "bankAccountDetailsPublicPayment";

const fetchBankDetailsPublic = async (): Promise<BankAccountDetails | null> => {
  const docRef = doc(db, BANK_DETAILS_DOC_PATH);
  const docSnap = await getDoc(docRef);
  if (docSnap.exists()) {
    const data = docSnap.data();
    return {
      bankName: data.bankName || "",
      accountName: data.accountName || "",
      accountNumber: data.accountNumber || "",
    } as BankAccountDetails;
  }
  return null;
};

function PaymentDetailsContent() {
  const { t } = useLanguage();
  const searchParams = useSearchParams();
  const router = useRouter();
  const { toast } = useToast();

  const [bookingId, setBookingId] = useState<string | null>(null);
  const [bookingDetails, setBookingDetails] = useState<Booking | null>(null);
  const [isLoadingBooking, setIsLoadingBooking] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [userPhoneNumber, setUserPhoneNumber] = useState<string | undefined>(undefined);

  const itemNameQuery = searchParams.get('itemName');
  const amountQuery = searchParams.get('amount');
  const categoryQuery = searchParams.get('category');
  const phoneQuery = searchParams.get('phone');
  const telegramBotUsername = "oromiaeducationtrainingcenterbot"; // Updated bot username


  const { data: bankDetails, isLoading: isLoadingBankDetails, error: bankDetailsError } = useQuery<BankAccountDetails | null, Error>({
    queryKey: [BANK_DETAILS_QUERY_KEY],
    queryFn: fetchBankDetailsPublic,
  });

  useEffect(() => {
    const id = searchParams.get('bookingId');
    if (id) {
      setBookingId(id);
      if (phoneQuery) setUserPhoneNumber(phoneQuery);
    } else {
      setError(t('missingBookingId'));
      setIsLoadingBooking(false);
    }
  }, [searchParams, t, phoneQuery]);

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
          if (data.bookingCategory === 'dormitory' && data.paymentStatus !== 'pending_transfer') {
            setError(t('paymentNotExpectedOrAlreadyProcessed'));
            setBookingDetails(null);
          } else if (data.bookingCategory === 'facility' && data.approvalStatus !== 'approved' && data.paymentStatus !== 'pending') {
            setError(t('paymentNotExpectedOrAlreadyProcessed'));
            setBookingDetails(null);
          } else {
            setBookingDetails(data);
            if (!userPhoneNumber && data.phone) setUserPhoneNumber(data.phone);
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
  }, [bookingId, t, userPhoneNumber]);

  if (isLoadingBooking || isLoadingBankDetails) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[300px]">
        <Loader2 className="h-12 w-12 animate-spin text-primary mb-4" />
        <p>{isLoadingBooking ? t('loadingBookingDetails') : t('loadingPaymentInfo')}</p>
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

   if (bankDetailsError) {
     return (
      <Card className="w-full max-w-lg text-center">
        <CardHeader>
          <AlertCircle className="w-12 h-12 text-destructive mx-auto mb-4" />
          <CardTitle className="text-destructive">{t('errorLoadingPaymentDetails')}</CardTitle>
        </CardHeader>
        <CardContent>
          <p>{t('couldNotLoadBankInfo')}</p>
          <Button onClick={() => router.push('/')} className="mt-4">{t('goToHomepage')}</Button>
        </CardContent>
      </Card>
    );
  }

  const displayItemName = bookingDetails.items.map(i => i.name).join(', ') || itemNameQuery;
  const displayAmount = (bookingDetails.totalCost ?? amountQuery)?.toString();
  const displayCategory = bookingDetails.bookingCategory || categoryQuery;
  const displayPhoneNumber = userPhoneNumber || bookingDetails.phone || t('yourRegisteredPhoneNumber');
  

  return (
    <Card className="w-full max-w-lg shadow-xl">
      <CardHeader className="text-center">
        <Banknote className="w-12 h-12 text-primary mx-auto mb-4" />
        <CardTitle className="text-2xl">{t('completeYourPaymentTitle')}</CardTitle>
        <CardDescription>{t('completeYourPaymentDescription')}</CardDescription>
      </CardHeader>
      <CardContent>
        {bankDetails ? (
            <div className="mb-6 p-4 border border-dashed border-primary/50 rounded-md bg-primary/5">
              <h3 className="font-semibold text-primary mb-2">{t('paymentInstructionsTitle')}</h3>
              <p className="text-sm text-foreground/80 mb-1"><strong>{t('bankNameLabel')}:</strong> {bankDetails.bankName || t('notSet')}</p>
              <p className="text-sm text-foreground/80 mb-1"><strong>{t('accountNameLabel')}:</strong> {bankDetails.accountName || t('notSet')}</p>
              <p className="text-sm text-foreground/80 mb-1"><strong>{t('accountNumberLabel')}:</strong> {bankDetails.accountNumber || t('notSet')}</p>
              <p className="text-sm text-foreground/80 font-bold"><strong>{t('amountToPayLabel')}:</strong> {displayAmount} {t('currencySymbol')}</p>
              <p className="text-xs text-muted-foreground mt-2">{t('paymentReferenceNote', {bookingId: bookingId || 'N/A'})}</p>
            </div>
        ) : (
            <div className="mb-6 p-4 border border-dashed border-destructive/50 rounded-md bg-destructive/5">
                <h3 className="font-semibold text-destructive mb-2">{t('paymentInstructionsUnavailable')}</h3>
                <p className="text-sm text-destructive/80">{t('bankDetailsNotConfiguredContactAdmin')}</p>
            </div>
        )}

        <div className="mb-6 space-y-2 text-sm p-4 border rounded-md">
            <h4 className="font-semibold text-foreground">{t('bookingSummary')}</h4>
            <div className="flex justify-between"><span className="text-muted-foreground">{t('bookingId')}:</span> <span>{bookingId}</span></div>
            {displayItemName && <div className="flex justify-between"><span className="text-muted-foreground">{t('item')}:</span> <span>{displayItemName}</span></div>}
            {displayCategory && <div className="flex justify-between"><span className="text-muted-foreground">{t('category')}:</span> <span className="capitalize">{t(displayCategory)}</span></div>}
            {displayPhoneNumber && <div className="flex justify-between"><span className="text-muted-foreground">{t('phone')}:</span> <span>{displayPhoneNumber}</span></div>}
        </div>

        <Alert variant="default" className="bg-sky-50 border-sky-200 dark:bg-sky-900/30 dark:border-sky-700">
          <MessageSquare className="h-5 w-5 text-sky-600 dark:text-sky-400" />
          <AlertTitle className="text-sky-700 dark:text-sky-300">{t('telegramProofSubmissionTitle')}</AlertTitle>
          <AlertDescription className="text-sky-600 dark:text-sky-400">
            {t('telegramProofSubmissionInstruction', { botUsername: `@${telegramBotUsername}`, phoneNumber: displayPhoneNumber })}
          </AlertDescription>
        </Alert>
      </CardContent>
      <CardFooter className="flex flex-col items-center pt-4">
        <Button asChild className="w-full">
          <a href={`https://t.me/${telegramBotUsername}`} target="_blank" rel="noopener noreferrer">
            <Send className="mr-2 h-4 w-4" />
            {t('openTelegramToSendProof')}
          </a>
        </Button>
        <p className="text-xs text-muted-foreground mt-3">{t('afterSendingProofAdminWillVerify')}</p>
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
    
