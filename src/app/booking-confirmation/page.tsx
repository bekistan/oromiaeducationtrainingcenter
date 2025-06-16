
"use client";

import { Suspense, useEffect, useState } from 'react';
import Link from 'next/link';
import { useSearchParams, useRouter } from 'next/navigation';
import { PublicLayout } from '@/components/layout/public-layout';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '@/components/ui/card';
import { CheckCircle, Home, Loader2, Hourglass, MessageSquare, Send, AlertCircle } from 'lucide-react';
import { useLanguage } from '@/hooks/use-language';
import { useAuth } from '@/hooks/use-auth';
import { SITE_NAME } from '@/constants';
import { db } from '@/lib/firebase';
import { doc, getDoc } from 'firebase/firestore';
import type { BankAccountDetails } from '@/types';
import { useQuery } from '@tanstack/react-query';

const BANK_DETAILS_DOC_PATH = "site_configuration/bank_account_details";
const BANK_DETAILS_QUERY_KEY = "bankAccountDetailsPublicConfirmation";

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

function BookingConfirmationContent() {
  const { t } = useLanguage();
  const searchParams = useSearchParams();
  const router = useRouter();
  const { user } = useAuth();

  const bookingId = searchParams.get('bookingId');
  const status = searchParams.get('status');
  const itemName = searchParams.get('itemName');
  const amount = searchParams.get('amount');
  const category = searchParams.get('category');

  const { data: bankDetails, isLoading: isLoadingBankDetails, error: bankDetailsError } = useQuery<BankAccountDetails | null, Error>({
    queryKey: [BANK_DETAILS_QUERY_KEY],
    queryFn: fetchBankDetailsPublic,
    enabled: !!(status === 'booking_pending_approval' && category === 'dormitory'), // Only fetch if needed
  });

  if (!bookingId || !status || !itemName || !category) {
    return (
      <Card className="w-full max-w-lg text-center">
        <CardHeader>
          <CardTitle className="text-destructive">{t('error')}</CardTitle>
        </CardHeader>
        <CardContent>
          <p>{t('incompleteBookingConfirmationDetails')}</p>
          <Button onClick={() => router.push('/')} className="mt-4">{t('goToHomepage')}</Button>
        </CardContent>
      </Card>
    );
  }

  let titleText = '';
  let descriptionText = '';
  let icon = <CheckCircle className="w-16 h-16 text-green-600" />;
  let showDormitoryPaymentInstructions = false;

  if (status === 'telegram_pending') {
    titleText = t('paymentAwaitingTelegramVerificationTitle');
    descriptionText = t('paymentAwaitingTelegramVerificationDesc');
    icon = <MessageSquare className="w-16 h-16 text-sky-500" />;
  } else if (status === 'booking_pending_approval') {
    if (category === 'facility') {
      titleText = t('facilityBookingReceived');
      descriptionText = t('thankYouFacilityBookingWillBeReviewed');
    } else { // Dormitory
      titleText = t('dormitoryBookingRequestReceived');
      descriptionText = t('dormitoryBookingPendingApproval');
      showDormitoryPaymentInstructions = true;
    }
    icon = <Hourglass className="w-16 h-16 text-amber-500" />;
  } else { 
    titleText = t('bookingProcessedTitle');
    descriptionText = t('yourBookingRequestHasBeenProcessed');
  }

  if (isLoadingBankDetails && showDormitoryPaymentInstructions) {
    return (
        <Card className="w-full max-w-lg text-center">
            <CardHeader>
                <CardTitle>{t('loadingPaymentDetails')}</CardTitle>
            </CardHeader>
            <CardContent>
                <Loader2 className="mx-auto h-12 w-12 animate-spin text-primary" />
            </CardContent>
        </Card>
    );
  }

  if (bankDetailsError && showDormitoryPaymentInstructions) {
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


  return (
    <Card className="w-full max-w-lg text-center shadow-xl">
      <CardHeader>
        <div className="mx-auto bg-primary/10 p-4 rounded-full w-fit mb-4">
          {icon}
        </div>
        <CardTitle className="text-2xl sm:text-3xl text-primary">
          {titleText}
        </CardTitle>
        <CardDescription className="text-base">
          {descriptionText}
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-3 text-left">
        {showDormitoryPaymentInstructions && amount && bankDetails && (
          <div className="mb-6 p-4 border border-dashed border-primary/50 rounded-md bg-primary/5">
            <h3 className="font-semibold text-primary mb-2">{t('paymentInstructionsTitle')}</h3>
            <p className="text-sm text-foreground/80 mb-1"><strong>{t('bankNameLabel')}:</strong> {bankDetails.bankName || t('notSet')}</p>
            <p className="text-sm text-foreground/80 mb-1"><strong>{t('accountNameLabel')}:</strong> {bankDetails.accountName || t('notSet')}</p>
            <p className="text-sm text-foreground/80 mb-1"><strong>{t('accountNumberLabel')}:</strong> {bankDetails.accountNumber || t('notSet')}</p>
            <p className="text-sm text-foreground/80 font-bold"><strong>{t('amountToPayLabel')}:</strong> {amount} {t('currencySymbol')}</p>
            <Button asChild className="w-full mt-3">
              <a href={`https://t.me/oroedubot`} target="_blank" rel="noopener noreferrer">
                <Send className="mr-2 h-4 w-4" />
                {t('goToAtOroedubotButton')}
              </a>
            </Button>
             <p className="text-xs text-muted-foreground mt-2">{t('paymentReferenceNoteConfirmationPage', {bookingId: bookingId})}</p>
          </div>
        )}
         {showDormitoryPaymentInstructions && amount && !bankDetails && !isLoadingBankDetails && (
            <div className="mb-6 p-4 border border-dashed border-destructive/50 rounded-md bg-destructive/5">
                <h3 className="font-semibold text-destructive mb-2">{t('paymentInstructionsUnavailable')}</h3>
                <p className="text-sm text-destructive/80">{t('bankDetailsNotConfiguredContactAdmin')}</p>
            </div>
        )}


        <div className={showDormitoryPaymentInstructions ? "pt-4" : "border-t pt-4"}>
          <h3 className="font-semibold mb-2 text-lg">{t('bookingSummary')}</h3>
          <div className="flex justify-between">
            <span className="text-muted-foreground">{t('bookingId')}:</span>
            <span className="font-medium">{bookingId}</span>
          </div>
          <div className="flex justify-between">
            <span className="text-muted-foreground">{t('itemBooked')}:</span>
            <span className="font-medium">{itemName}</span>
          </div>
          <div className="flex justify-between">
            <span className="text-muted-foreground">{t('category')}:</span>
            <span className="font-medium capitalize">{t(category)}</span>
          </div>
          {amount && !showDormitoryPaymentInstructions && ( 
            <div className="flex justify-between">
                <span className="text-muted-foreground">{t('totalAmount')}:</span>
                <span className="font-medium text-primary">{amount} {t('currencySymbol')}</span>
            </div>
          )}
        </div>
      </CardContent>
      <CardFooter className="flex flex-col sm:flex-row gap-3 pt-6">
        <Link href={category === 'facility' && user?.role === 'company_representative' ? "/company/dashboard" : "/"} passHref className="w-full sm:w-auto">
          <Button className="w-full">
            <Home className="mr-2 h-4 w-4" /> {category === 'facility' && user?.role === 'company_representative' ? t('backToCompanyDashboard') : t('goToHomepage')}
          </Button>
        </Link>
      </CardFooter>
    </Card>
  );
}


export default function BookingConfirmationPage() {
  const { t } = useLanguage();
  return (
    <PublicLayout>
      <div className="container mx-auto py-12 px-4 flex justify-center items-center min-h-[calc(100vh-8rem)]">
        <Suspense fallback={<div className="flex flex-col items-center"><Loader2 className="h-12 w-12 animate-spin text-primary mb-4" /> <p>{t('loadingConfirmation')}</p></div>}>
          <BookingConfirmationContent />
        </Suspense>
      </div>
    </PublicLayout>
  );
}

