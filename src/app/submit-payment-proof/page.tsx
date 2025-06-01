
"use client";

import React, { Suspense, useState, useEffect } from 'react';
import { PublicLayout } from "@/components/layout/public-layout";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { useLanguage } from "@/hooks/use-language";
import { Banknote, Loader2, AlertCircle, UploadCloud } from "lucide-react";
import { useSearchParams, useRouter } from 'next/navigation';
import { useToast } from "@/hooks/use-toast";
import { db } from '@/lib/firebase';
import { doc, getDoc, updateDoc, Timestamp } from 'firebase/firestore';
import type { Booking } from '@/types';

function SubmitPaymentProofContent() {
  const { t } = useLanguage();
  const searchParams = useSearchParams();
  const router = useRouter();
  const { toast } = useToast();
  
  const [bookingId, setBookingId] = useState<string | null>(null);
  const [bookingDetails, setBookingDetails] = useState<Booking | null>(null);
  const [isLoadingBooking, setIsLoadingBooking] = useState(true);
  const [isSubmittingProof, setIsSubmittingProof] = useState(false);
  const [transactionDetails, setTransactionDetails] = useState('');
  const [error, setError] = useState<string | null>(null);

  // Passed through query params for display
  const itemName = searchParams.get('itemName');
  const amount = searchParams.get('amount');
  const category = searchParams.get('category');

  useEffect(() => {
    const id = searchParams.get('bookingId');
    if (id) {
      setBookingId(id);
    } else {
      setError(t('missingBookingId')); // Add to JSON
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
          if (data.paymentStatus !== 'pending_transfer') {
            setError(t('paymentProofNotExpected')); // Add to JSON: "Payment proof is not currently expected for this booking."
            setBookingDetails(null);
          } else {
            setBookingDetails(data);
          }
        } else {
          setError(t('bookingNotFound'));
        }
      } catch (err) {
        console.error("Error fetching booking for payment proof:", err);
        setError(t('errorFetchingBookingDetails'));
      } finally {
        setIsLoadingBooking(false);
      }
    };
    fetchBooking();
  }, [bookingId, t]);

  const handleSubmitProof = async (event: React.FormEvent) => {
    event.preventDefault();
    if (!bookingId || !transactionDetails.trim()) {
      toast({ variant: "destructive", title: t('error'), description: t('transactionDetailsRequired') }); // Add to JSON
      return;
    }
    setIsSubmittingProof(true);
    try {
      const bookingRef = doc(db, "bookings", bookingId);
      await updateDoc(bookingRef, {
        paymentStatus: 'awaiting_verification',
        transactionProofDetails: transactionDetails.trim(),
        // We could also add a timestamp for when proof was submitted
        // paymentProofSubmittedAt: Timestamp.now(), 
      });
      toast({ title: t('success'), description: t('paymentProofSubmittedSuccessfully') }); // Add to JSON

      // Redirect to a generic confirmation page
      const queryParams = new URLSearchParams({
        status: 'proof_submitted',
        bookingId: bookingId,
        itemName: bookingDetails?.items.map(i => i.name).join(', ') || itemName || '',
        amount: bookingDetails?.totalCost.toString() || amount || '',
        category: bookingDetails?.bookingCategory || category || ''
      });
      router.push(`/booking-confirmation?${queryParams.toString()}`);

    } catch (err) {
      console.error("Error submitting payment proof:", err);
      toast({ variant: "destructive", title: t('error'), description: t('errorSubmittingPaymentProof') }); // Add to JSON
    } finally {
      setIsSubmittingProof(false);
    }
  };

  if (isLoadingBooking) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[300px]">
        <Loader2 className="h-12 w-12 animate-spin text-primary mb-4" />
        <p>{t('loadingBookingDetails')}</p>
      </div>
    );
  }

  if (error) {
    return (
      <Card className="w-full max-w-lg text-center shadow-xl">
        <CardHeader>
          <AlertCircle className="w-12 h-12 text-destructive mx-auto mb-4" />
          <CardTitle className="text-2xl text-destructive">{t('error')}</CardTitle>
        </CardHeader>
        <CardContent>
          <p>{error}</p>
          <Button onClick={() => router.push('/')} className="mt-4">{t('goToHomepage')}</Button>
        </CardContent>
      </Card>
    );
  }
  
  // Use query param details if bookingDetails are not yet loaded or if bookingId was initially missing
  const displayItemName = bookingDetails?.items.map(i => i.name).join(', ') || itemName;
  const displayAmount = (bookingDetails?.totalCost ?? amount)?.toString();
  const displayCategory = bookingDetails?.bookingCategory || category;

  return (
    <Card className="w-full max-w-lg shadow-xl">
      <CardHeader className="text-center">
        <Banknote className="w-12 h-12 text-primary mx-auto mb-4" />
        <CardTitle className="text-2xl">{t('submitPaymentProofTitle')}</CardTitle> {/* Add to JSON */}
        <CardDescription>{t('submitPaymentProofDescription')}</CardDescription> {/* Add to JSON */}
      </CardHeader>
      <CardContent>
        <div className="mb-6 p-4 border border-dashed border-primary/50 rounded-md bg-primary/5">
          <h3 className="font-semibold text-primary mb-2">{t('paymentInstructionsTitle')}</h3> {/* Add to JSON */}
          <p className="text-sm text-foreground/80 mb-1"><strong>{t('bankNameLabel')}:</strong> {t('bankNameValue')}</p> {/* Add to JSON */}
          <p className="text-sm text-foreground/80 mb-1"><strong>{t('accountNumberLabel')}:</strong> {t('accountNumberValue')}</p> {/* Add to JSON */}
          <p className="text-sm text-foreground/80 mb-1"><strong>{t('accountNameLabel')}:</strong> {SITE_NAME}</p>
          <p className="text-sm text-foreground/80"><strong>{t('amountToPayLabel')}:</strong> {displayAmount} {t('currencySymbol')}</p>
          <p className="text-xs text-muted-foreground mt-2">{t('paymentReferenceNote', {bookingId: bookingId || 'N/A'})}</p> {/* Add to JSON */}
        </div>

        <div className="mb-4 space-y-1 text-sm">
            <p><strong>{t('bookingId')}:</strong> {bookingId}</p>
            {displayItemName && <p><strong>{t('item')}:</strong> {displayItemName}</p>}
            {displayCategory && <p><strong>{t('category')}:</strong> <span className="capitalize">{t(displayCategory)}</span></p>}
        </div>

        <form onSubmit={handleSubmitProof} className="space-y-4">
          <div>
            <Label htmlFor="transactionDetails" className="text-sm font-medium">{t('transactionReferenceLabel')}</Label> {/* Add to JSON */}
            <Textarea
              id="transactionDetails"
              value={transactionDetails}
              onChange={(e) => setTransactionDetails(e.target.value)}
              placeholder={t('transactionReferencePlaceholder')} /* Add to JSON. Ex: "E.g., Transaction ID, Bank Slip No., or link to your uploaded receipt" */
              required
              rows={3}
              className="mt-1"
            />
            <p className="text-xs text-muted-foreground mt-1">{t('provideTransactionDetailsNote')}</p> {/* Add to JSON */}
          </div>
          {/* Actual file upload input can be added here in a future iteration */}
          {/* <div className="space-y-1">
            <Label htmlFor="payment-proof-file">{t('uploadDocumentOptional')}</Label>
            <Input id="payment-proof-file" type="file" accept=".pdf,.jpg,.jpeg,.png" />
            <p className="text-xs text-muted-foreground">{t('supportedFileTypes')}</p>
          </div> */}
          <Button type="submit" className="w-full" disabled={isSubmittingProof}>
            {isSubmittingProof && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
            {t('submitProofButton')} {/* Add to JSON */}
          </Button>
        </form>
      </CardContent>
      <CardFooter>
        <p className="text-xs text-muted-foreground text-center w-full">{t('paymentVerificationTimeNote')}</p> {/* Add to JSON */}
      </CardFooter>
    </Card>
  );
}


export default function SubmitPaymentProofPage() {
  const { t } = useLanguage();
  return (
    <PublicLayout>
      <div className="container mx-auto py-12 px-4 flex justify-center items-center min-h-[calc(100vh-8rem)]">
        <Suspense fallback={<div className="flex flex-col items-center"><Loader2 className="h-12 w-12 animate-spin text-primary mb-4" /> <p>{t('loading')}</p></div>}>
          <SubmitPaymentProofContent />
        </Suspense>
      </div>
    </PublicLayout>
  );
}
