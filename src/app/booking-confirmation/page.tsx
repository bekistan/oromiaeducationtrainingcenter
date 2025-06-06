
"use client";

import { Suspense } from 'react';
import Link from 'next/link';
import { useSearchParams, useRouter } from 'next/navigation';
import { PublicLayout } from '@/components/layout/public-layout';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '@/components/ui/card';
import { CheckCircle, Home, Loader2, Hourglass, MessageSquare, Send } from 'lucide-react';
import { useLanguage } from '@/hooks/use-language';
import { useAuth } from '@/hooks/use-auth';
import { BANK_NAME_VALUE, SITE_NAME, BANK_ACCOUNT_NUMBER_VALUE } from '@/constants';

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
      descriptionText = t('dormitoryBookingPendingApproval'); // Updated key
      showDormitoryPaymentInstructions = true;
    }
    icon = <Hourglass className="w-16 h-16 text-amber-500" />;
  } else { 
    titleText = t('bookingProcessedTitle');
    descriptionText = t('yourBookingRequestHasBeenProcessed');
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
        {showDormitoryPaymentInstructions && amount && (
          <div className="mb-6 p-4 border border-dashed border-primary/50 rounded-md bg-primary/5">
            <h3 className="font-semibold text-primary mb-2">{t('paymentInstructionsTitle')}</h3>
            <p className="text-sm text-foreground/80 mb-1"><strong>{t('bankNameLabel')}:</strong> {BANK_NAME_VALUE}</p>
            <p className="text-sm text-foreground/80 mb-1"><strong>{t('accountNameLabel')}:</strong> {SITE_NAME}</p>
            <p className="text-sm text-foreground/80 mb-1"><strong>{t('accountNumberLabel')}:</strong> {BANK_ACCOUNT_NUMBER_VALUE}</p>
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
          {amount && !showDormitoryPaymentInstructions && ( // Hide amount here if shown in payment instructions
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

