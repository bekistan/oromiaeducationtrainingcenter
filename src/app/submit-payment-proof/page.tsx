
"use client";

import React, { Suspense, useState, useEffect } from 'react';
import { PublicLayout } from "@/components/layout/public-layout";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import {
  Form,
  FormControl,
  FormDescription,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form";
import { useLanguage } from "@/hooks/use-language";
import { Banknote, Loader2, AlertCircle, FileCheck } from "lucide-react";
import { useSearchParams, useRouter } from 'next/navigation';
import { useToast } from "@/hooks/use-toast";
import { db } from '@/lib/firebase';
import { doc, getDoc, updateDoc, Timestamp } from 'firebase/firestore';
import type { Booking } from '@/types';
import { SITE_NAME } from '@/constants';
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { zodResolver } from "@hookform/resolvers/zod";
import { useForm } from "react-hook-form";
import * as z from "zod";

function SubmitPaymentProofContent() {
  const { t } = useLanguage();
  const searchParams = useSearchParams();
  const router = useRouter();
  const { toast } = useToast();
  
  const [bookingId, setBookingId] = useState<string | null>(null);
  const [bookingDetails, setBookingDetails] = useState<Booking | null>(null);
  const [isLoadingBooking, setIsLoadingBooking] = useState(true);
  const [isSubmittingProof, setIsSubmittingProof] = useState(false);
  const [paymentProofFilePreview, setPaymentProofFilePreview] = useState<File | null>(null); // For UI preview of selected file
  const [error, setError] = useState<string | null>(null);

  const itemName = searchParams.get('itemName');
  const amount = searchParams.get('amount');
  const category = searchParams.get('category');

  // Define Zod schema inside the component to use t() for messages
  const submitPaymentProofSchema = z.object({
    transactionDetails: z.string().min(1, { message: t('transactionDetailsRequired') }),
    paymentProofFile: z.custom<File | undefined>((v) => v === undefined || v instanceof File, { 
      message: t('invalidFileType') // Add to JSON: "Invalid file type."
    }).optional(),
  });
  type SubmitPaymentProofValues = z.infer<typeof submitPaymentProofSchema>;

  const form = useForm<SubmitPaymentProofValues>({
    resolver: zodResolver(submitPaymentProofSchema),
    defaultValues: {
      transactionDetails: "",
      paymentProofFile: undefined,
    },
  });

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
          let paymentExpected = false;
          if (data.bookingCategory === 'dormitory' && data.paymentStatus === 'pending_transfer') {
            paymentExpected = true;
          } else if (data.bookingCategory === 'facility' && data.approvalStatus === 'approved' && (data.paymentStatus === 'pending' || data.paymentStatus === 'pending_transfer')) {
            paymentExpected = true;
          }
          
          if (!paymentExpected) {
            setError(t('paymentProofNotExpected')); 
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

  const handleSubmitProof = async (data: SubmitPaymentProofValues) => {
    if (!bookingId) {
      toast({ variant: "destructive", title: t('error'), description: t('missingBookingId') }); 
      return;
    }
    setIsSubmittingProof(true);

    let proofReferenceText = data.transactionDetails.trim();
    const fileToUpload = data.paymentProofFile;

    if (fileToUpload) {
      console.log(`File selected: ${fileToUpload.name} (${fileToUpload.type}). Size: ${fileToUpload.size} bytes.`);
      console.log("In a real application, this file would be uploaded to Firebase Storage, and its URL would be stored.");
      // For now, we might append file info or store a mock reference if needed
      // Example: proofReferenceText += ` (File: ${fileToUpload.name})`; // Don't do this if file upload is separate
    }

    try {
      const bookingRef = doc(db, "bookings", bookingId);
      await updateDoc(bookingRef, {
        paymentStatus: 'awaiting_verification',
        transactionProofDetails: proofReferenceText, 
        // In a real app, after uploading `fileToUpload` to Firebase Storage:
        // paymentProofDocumentUrl: uploadedFileUrlFromServer, 
      });
      toast({ title: t('success'), description: t('paymentProofSubmittedSuccessfully') }); 

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
      toast({ variant: "destructive", title: t('error'), description: t('errorSubmittingPaymentProof') }); 
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

  if (error || !bookingDetails) {
    return (
      <Card className="w-full max-w-lg text-center shadow-xl">
        <CardHeader>
          <AlertCircle className="w-12 h-12 text-destructive mx-auto mb-4" />
          <CardTitle className="text-2xl text-destructive">{t('error')}</CardTitle>
        </CardHeader>
        <CardContent>
          <p>{error || t('bookingOrPaymentNotReady')}</p>
          <Button onClick={() => router.push('/')} className="mt-4">{t('goToHomepage')}</Button>
        </CardContent>
      </Card>
    );
  }
  
  const displayItemName = bookingDetails?.items.map(i => i.name).join(', ') || itemName;
  const displayAmount = (bookingDetails?.totalCost ?? amount)?.toString();
  const displayCategory = bookingDetails?.bookingCategory || category;

  return (
    <Card className="w-full max-w-lg shadow-xl">
      <CardHeader className="text-center">
        <Banknote className="w-12 h-12 text-primary mx-auto mb-4" />
        <CardTitle className="text-2xl">{t('submitPaymentProofTitle')}</CardTitle> 
        <CardDescription>{t('submitPaymentProofDescription')}</CardDescription> 
      </CardHeader>
      <CardContent>
        <div className="mb-6 p-4 border border-dashed border-primary/50 rounded-md bg-primary/5">
          <h3 className="font-semibold text-primary mb-2">{t('paymentInstructionsTitle')}</h3>
          <p className="text-sm text-foreground/80 mb-1"><strong>{t('bankNameLabel')}:</strong> {t('bankNameValue')}</p> 
          <p className="text-sm text-foreground/80 mb-1"><strong>{t('accountNumberLabel')}:</strong> {t('accountNumberValue')}</p> 
          <p className="text-sm text-foreground/80 mb-1"><strong>{t('accountNameLabel')}:</strong> {SITE_NAME}</p>
          <p className="text-sm text-foreground/80"><strong>{t('amountToPayLabel')}:</strong> {displayAmount} {t('currencySymbol')}</p>
          <p className="text-xs text-muted-foreground mt-2">{t('paymentReferenceNote', {bookingId: bookingId || 'N/A'})}</p> 
        </div>

        <div className="mb-4 space-y-1 text-sm">
            <p><strong>{t('bookingId')}:</strong> {bookingId}</p>
            {displayItemName && <p><strong>{t('item')}:</strong> {displayItemName}</p>}
            {displayCategory && <p><strong>{t('category')}:</strong> <span className="capitalize">{t(displayCategory)}</span></p>}
        </div>

        <Form {...form}>
          <form onSubmit={form.handleSubmit(handleSubmitProof)} className="space-y-6">
            <FormField
              control={form.control}
              name="transactionDetails"
              render={({ field }) => (
                <FormItem>
                  <FormLabel htmlFor="transactionDetails" className="text-sm font-medium">{t('transactionReferenceLabel')}</FormLabel>
                  <FormControl>
                    <Textarea
                      id="transactionDetails"
                      placeholder={t('transactionReferencePlaceholder')}
                      rows={3}
                      className="mt-1"
                      {...field}
                    />
                  </FormControl>
                  <FormDescription className="text-xs">{t('provideTransactionDetailsNote')}</FormDescription>
                  <FormMessage />
                </FormItem>
              )}
            />
            
            <FormField
              control={form.control}
              name="paymentProofFile"
              render={({ field: { onChange, value, ref, ...rest }}) => ( // Destructure field correctly
                <FormItem>
                  <FormLabel htmlFor="payment-proof-file" className="text-sm font-medium">{t('uploadScannedDocument')}</FormLabel>
                  <FormControl>
                    <Input 
                      id="payment-proof-file" 
                      type="file" 
                      accept=".pdf,.jpg,.jpeg,.png" 
                      className="file:text-primary file:font-medium"
                      onChange={(e) => {
                        const file = e.target.files?.[0];
                        onChange(file || undefined); // RHF's onChange for the File object
                        setPaymentProofFilePreview(file || null); // For UI preview
                      }}
                      ref={ref} // Pass ref to the input
                      {...rest} // Pass other field props like name, onBlur
                    />
                  </FormControl>
                  {paymentProofFilePreview && (
                    <div className="text-xs text-muted-foreground flex items-center">
                      <FileCheck className="w-4 h-4 mr-1 text-green-600" />
                      {t('fileSelected')}: {paymentProofFilePreview.name}
                    </div>
                  )}
                  <FormDescription className="text-xs">{t('supportedFileTypesProof')}</FormDescription> 
                  <FormMessage />
                </FormItem>
              )}
            />

            <Button type="submit" className="w-full" disabled={isSubmittingProof || !bookingId || isLoadingBooking}>
              {(isSubmittingProof || isLoadingBooking) && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              {t('submitProofButton')} 
            </Button>
          </form>
        </Form>
      </CardContent>
      <CardFooter>
        <p className="text-xs text-muted-foreground text-center w-full">{t('paymentVerificationTimeNote')}</p> 
      </CardFooter>
    </Card>
  );
}


export default function SubmitPaymentProofPage() {
  const { t } = useLanguage();
  return (
    <PublicLayout>
      <div className="container mx-auto py-12 px-4 flex justify-center items-center min-h-[calc(100vh-8rem)]">
        <Suspense fallback={
          <div className="flex flex-col items-center">
            <Loader2 className="h-12 w-12 animate-spin text-primary mb-4" /> 
            <p>{t('loading')}</p>
          </div>
        }>
          <SubmitPaymentProofContent />
        </Suspense>
      </div>
    </PublicLayout>
  );
}

