
"use client";

import { Suspense } from 'react';
import Link from 'next/link';
import { useSearchParams, useRouter } from 'next/navigation';
import { PublicLayout } from '@/components/layout/public-layout';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '@/components/ui/card';
import { CheckCircle, Download, Home, FileText, Loader2, Hourglass } from 'lucide-react';
import { useLanguage } from '@/hooks/use-language';
import { useToast } from '@/hooks/use-toast';

function BookingConfirmationContent() {
  const { t } = useLanguage();
  const searchParams = useSearchParams();
  const router = useRouter();
  const { toast } = useToast();

  const bookingId = searchParams.get('bookingId');
  const status = searchParams.get('status'); // e.g., 'proof_submitted', 'booking_pending_approval'
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

  if (status === 'proof_submitted') {
    titleText = t('paymentProofSubmittedTitle'); // Add to JSON
    descriptionText = t('paymentProofSubmittedDesc'); // Add to JSON
  } else if (status === 'booking_pending_approval' && category === 'facility') {
    titleText = t('facilityBookingReceived');
    descriptionText = t('thankYouFacilityBookingWillBeReviewed');
    icon = <Hourglass className="w-16 h-16 text-amber-500" />;
  } else { // Default or unknown status
    titleText = t('bookingProcessedTitle'); // Add to JSON
    descriptionText = t('yourBookingRequestHasBeenProcessed'); // Add to JSON
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
        <div className="border-t pt-4">
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
          {amount && (
            <div className="flex justify-between">
                <span className="text-muted-foreground">{t('totalAmount')}:</span> 
                <span className="font-medium text-primary">{amount} {t('currencySymbol')}</span>
            </div>
          )}
          {/* More details can be added here if needed */}
        </div>
      </CardContent>
      <CardFooter className="flex flex-col sm:flex-row gap-3 pt-6">
        {/* PDF Download could be re-enabled if a receipt is generated after payment verification */}
        {/* <Button onClick={handleDownloadPdf} variant="outline" className="w-full sm:w-auto">
          <Download className="mr-2 h-4 w-4" /> {t('downloadDetails')}
        </Button> */}
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
  // User needed for conditional redirect in footer. This page doesn't enforce auth itself.
  // const { user } = useAuth(); // Removed useAuth here as it's not strictly needed and can cause suspense issues if not handled well
  // If specific user data is needed for content, pass it via query params or fetch within BookingConfirmationContent with its own loading state.

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
