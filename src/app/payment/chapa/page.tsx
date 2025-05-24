
"use client";

import { Suspense } from 'react'; // Import Suspense
import { PublicLayout } from "@/components/layout/public-layout";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { useLanguage } from "@/hooks/use-language";
import { CreditCard, Loader2 } from "lucide-react";
import { useSearchParams, useRouter } from 'next/navigation';
import { useToast } from "@/hooks/use-toast";

function ChapaPaymentContent() {
  const { t } = useLanguage();
  const searchParams = useSearchParams();
  const router = useRouter();
  const { toast } = useToast();

  const bookingId = searchParams.get('bookingId');
  const amount = searchParams.get('amount');
  const itemName = searchParams.get('itemName');
  const bookingCategory = searchParams.get('bookingCategory');

  if (!bookingId || !amount || !itemName || !bookingCategory) {
    return (
      <Card className="w-full max-w-md shadow-xl">
        <CardHeader>
          <CardTitle className="text-center text-destructive">{t('error')}</CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-center">{t('missingBookingDetails')}</p> {/* Add to JSON */}
          <Button onClick={() => router.push('/')} className="w-full mt-4">{t('goToHomepage')}</Button>
        </CardContent>
      </Card>
    );
  }

  const handlePayment = () => {
    // This is where Chapa SDK integration would happen
    // Simulate successful payment
    console.log(`Simulating Chapa payment for booking ID: ${bookingId}, Amount: ${amount}`);
    
    toast({
      title: t('paymentSuccessful'), // Add to JSON
      description: `${t('paymentFor')} ${itemName} ${t('processed')}`, // Add to JSON 'paymentFor', 'processed'
    });

    // Redirect to a booking success/confirmation page
    const queryParams = new URLSearchParams({
      bookingId,
      status: 'paid',
      itemName,
      amount,
      category: bookingCategory,
    });
    router.push(`/booking-confirmation?${queryParams.toString()}`);
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
          <div className="flex justify-between">
            <span className="font-medium">{t('bookingId')}:</span>
            <span>{bookingId}</span>
          </div>
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
        <Button className="w-full" onClick={handlePayment}>
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
        <Suspense fallback={<div className="flex flex-col items-center"><Loader2 className="h-12 w-12 animate-spin text-primary mb-4" /> <p>{t('loadingPaymentDetails')}</p></div>}> {/* Add 'loadingPaymentDetails' to JSON */}
          <ChapaPaymentContent />
        </Suspense>
      </div>
    </PublicLayout>
  );
}
