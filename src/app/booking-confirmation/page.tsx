
"use client";

import { Suspense } from 'react';
import Link from 'next/link';
import { useSearchParams, useRouter } from 'next/navigation';
import { PublicLayout } from '@/components/layout/public-layout';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '@/components/ui/card';
import { CheckCircle, Download, Home, FileText, Loader2 } from 'lucide-react';
import { useLanguage } from '@/hooks/use-language';
import { useToast } from '@/hooks/use-toast';

function BookingConfirmationContent() {
  const { t } = useLanguage();
  const searchParams = useSearchParams();
  const router = useRouter();
  const { toast } = useToast();

  const bookingId = searchParams.get('bookingId');
  const status = searchParams.get('status');
  const itemName = searchParams.get('itemName');
  const amount = searchParams.get('amount');
  const category = searchParams.get('category');

  if (!bookingId || !status || !itemName || !amount || !category) {
    return (
      <Card className="w-full max-w-lg text-center">
        <CardHeader>
          <CardTitle className="text-destructive">{t('error')}</CardTitle>
        </CardHeader>
        <CardContent>
          <p>{t('incompleteBookingConfirmationDetails')}</p> {/* Add to JSON */}
          <Button onClick={() => router.push('/')} className="mt-4">{t('goToHomepage')}</Button>
        </CardContent>
      </Card>
    );
  }

  const handleDownloadPdf = () => {
    // Placeholder for PDF download logic
    console.log(`Attempting to download PDF for booking ID: ${bookingId}`);
    toast({
      title: t('downloadInitiated'), // Add to JSON
      description: `${t('pdfForBooking')} ${bookingId} ${t('willDownloadShortly')}`, // Add to JSON
    });
    // In a real app, you would trigger a PDF generation and download here.
  };

  return (
    <Card className="w-full max-w-lg text-center shadow-xl">
      <CardHeader>
        <div className="mx-auto bg-green-100 p-4 rounded-full w-fit mb-4">
          <CheckCircle className="w-16 h-16 text-green-600" />
        </div>
        <CardTitle className="text-2xl sm:text-3xl text-primary">
          {category === 'dormitory' ? t('dormitoryBookingConfirmed') : t('facilityBookingReceived')}
        </CardTitle> {/* Add 'dormitoryBookingConfirmed', 'facilityBookingReceived' to JSON */}
        <CardDescription className="text-base">
          {category === 'dormitory' 
            ? t('thankYouForPaymentDormitory') // Add to JSON
            : t('thankYouFacilityBookingWillBeReviewed')} {/* Add to JSON */}
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-3 text-left">
        <div className="border-t pt-4">
          <h3 className="font-semibold mb-2 text-lg">{t('bookingSummary')}</h3> {/* Add to JSON */}
          <div className="flex justify-between">
            <span className="text-muted-foreground">{t('bookingId')}:</span>
            <span className="font-medium">{bookingId}</span>
          </div>
          <div className="flex justify-between">
            <span className="text-muted-foreground">{t('itemBooked')}:</span> {/* Add 'itemBooked' to JSON */}
            <span className="font-medium">{itemName}</span>
          </div>
          <div className="flex justify-between">
            <span className="text-muted-foreground">{t('category')}:</span>
            <span className="font-medium capitalize">{t(category)}</span>
          </div>
          <div className="flex justify-between">
            <span className="text-muted-foreground">{t('totalAmountPaid')}:</span> {/* Add 'totalAmountPaid' to JSON */}
            <span className="font-medium text-primary">{amount} ETB</span>
          </div>
          <div className="flex justify-between">
            <span className="text-muted-foreground">{t('paymentStatus')}:</span>
            <span className="font-medium capitalize text-green-600">{t(status)}</span>
          </div>
           {category === 'facility' && (
             <div className="flex justify-between">
                <span className="text-muted-foreground">{t('approvalStatus')}:</span>
                <span className="font-medium capitalize text-orange-500">{t('pending')}</span>
            </div>
           )}
        </div>
      </CardContent>
      <CardFooter className="flex flex-col sm:flex-row gap-3 pt-6">
        <Button onClick={handleDownloadPdf} variant="outline" className="w-full sm:w-auto">
          <Download className="mr-2 h-4 w-4" /> {t('downloadReceipt')} {/* Add to JSON */}
        </Button>
        <Link href="/" passHref className="w-full sm:w-auto">
          <Button className="w-full">
            <Home className="mr-2 h-4 w-4" /> {t('goToHomepage')}
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
        <Suspense fallback={<div className="flex flex-col items-center"><Loader2 className="h-12 w-12 animate-spin text-primary mb-4" /> <p>{t('loadingConfirmation')}</p></div>}> {/* Add 'loadingConfirmation' to JSON */}
          <BookingConfirmationContent />
        </Suspense>
      </div>
    </PublicLayout>
  );
}
