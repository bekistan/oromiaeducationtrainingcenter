
"use client";

import { Suspense, useEffect, useState, useRef } from 'react';
import Link from 'next/link';
import { useSearchParams, useRouter } from 'next/navigation';
import { PublicLayout } from '@/components/layout/public-layout';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '@/components/ui/card';
import { CheckCircle, Home, Loader2, Hourglass, MessageSquare, Send, AlertCircle, UploadCloud, FileIcon } from 'lucide-react';
import { useLanguage } from '@/hooks/use-language';
import { useAuth } from '@/hooks/use-auth';
import { SITE_NAME } from '@/constants';
import { db } from '@/lib/firebase';
import { doc, getDoc } from 'firebase/firestore';
import type { BankAccountDetails } from '@/types';
import { useQuery } from '@tanstack/react-query';
import { Input } from '@/components/ui/input';
import { useToast } from '@/hooks/use-toast';

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
  const { toast } = useToast();

  const bookingId = searchParams.get('bookingId');
  const status = searchParams.get('status');
  const itemName = searchParams.get('itemName');
  const amount = searchParams.get('amount');
  const category = searchParams.get('category');
  const telegramBotUsername = "oromiaeducationtrainingcenterbot";

  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [isUploading, setIsUploading] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const { data: bankDetails, isLoading: isLoadingBankDetails, error: bankDetailsError } = useQuery<BankAccountDetails | null, Error>({
    queryKey: [BANK_DETAILS_QUERY_KEY],
    queryFn: fetchBankDetailsPublic,
    enabled: !!(status === 'booking_pending_approval' && category === 'dormitory'),
  });

  const handleFileChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    if (event.target.files && event.target.files[0]) {
      const file = event.target.files[0];
      const allowedTypes = ['image/png', 'image/jpeg', 'image/jpg', 'application/pdf'];
      const maxSize = 5 * 1024 * 1024; // 5MB

      if (!allowedTypes.includes(file.type)) {
        toast({
          variant: "destructive",
          title: t('error'),
          description: t('invalidFileTypeForScreenshot'),
        });
        setSelectedFile(null);
        if (fileInputRef.current) fileInputRef.current.value = "";
        return;
      }

      if (file.size > maxSize) {
        toast({
          variant: "destructive",
          title: t('error'),
          description: t('fileTooLargeForScreenshot', { maxSize: '5MB' }),
        });
        setSelectedFile(null);
        if (fileInputRef.current) fileInputRef.current.value = "";
        return;
      }
      setSelectedFile(file);
    } else {
      setSelectedFile(null);
    }
  };

  const handleUploadPaymentScreenshot = async () => {
    if (!selectedFile) {
      toast({
        variant: "destructive",
        title: t('error'),
        description: t('pleaseSelectFileToUpload'),
      });
      return;
    }
    if (!bookingId) {
        toast({ variant: "destructive", title: t('error'), description: t('bookingIdMissingForUpload') });
        return;
    }

    setIsUploading(true);
    const formData = new FormData();
    formData.append('file', selectedFile);
    formData.append('bookingId', bookingId);

    try {
      const response = await fetch('/api/upload-payment-screenshot-to-airtable', {
        method: 'POST',
        body: formData,
      });

      if (!response.ok) {
        const contentType = response.headers.get("content-type");
        let errorDetailMessage;
        if (contentType && contentType.includes("application/json")) {
          try {
            const errorData = await response.json();
            errorDetailMessage = errorData.error || errorData.details || t('uploadApiJsonErrorNoDetails', { status: response.status });
          } catch (jsonError) {
            console.error("Failed to parse JSON error response:", jsonError);
            errorDetailMessage = t('uploadApiJsonErrorNoDetails', { status: response.status });
          }
        } else {
          const textResponse = await response.text();
          console.error("Raw non-JSON error response from server for /api/upload-payment-screenshot-to-airtable:", textResponse);
          if (textResponse.toLowerCase().includes("<!doctype html>")) {
             errorDetailMessage = t('apiReturnedHtmlError');
          } else {
             errorDetailMessage = t('uploadApiNonJsonError', { statusText: response.statusText || `Status ${response.status}` });
          }
        }
        throw new Error(errorDetailMessage);
      }

      const result = await response.json(); // Assuming success means JSON response with details
      toast({ title: t('success'), description: t('paymentScreenshotUploadedSuccessfullyAirtable') });
      setSelectedFile(null);
      if (fileInputRef.current) {
        fileInputRef.current.value = "";
      }
    } catch (uploadError: any) {
      toast({
        variant: "destructive",
        title: t('uploadFailedTitle'),
        description: uploadError.message || t('failedToUploadScreenshotAirtable')
      });
    } finally {
      setIsUploading(false);
    }
  };


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
            <p className="text-xs text-muted-foreground mt-2">{t('paymentReferenceNoteConfirmationPage', {bookingId: bookingId})}</p>

            <div className="mt-4 space-y-3">
                <h4 className="font-medium text-sm text-primary">{t('submitPaymentProof')}</h4>
                <Input
                    id="paymentScreenshot"
                    type="file"
                    ref={fileInputRef}
                    onChange={handleFileChange}
                    className="text-sm"
                    accept="image/png, image/jpeg, image/jpg, application/pdf"
                />
                {selectedFile && (
                    <div className="text-xs text-muted-foreground flex items-center">
                        <FileIcon className="w-3 h-3 mr-1" />
                        {selectedFile.name} ({(selectedFile.size / 1024).toFixed(1)} KB)
                    </div>
                )}
                <Button
                    onClick={handleUploadPaymentScreenshot}
                    disabled={isUploading || !selectedFile}
                    className="w-full"
                    variant="outline"
                >
                    {isUploading ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <UploadCloud className="mr-2 h-4 w-4" />}
                    {t('uploadPaymentScreenshotButton')}
                </Button>
                 <p className="text-xs text-muted-foreground">{t('fileUploadLimitNote', { maxSize: '5MB'})}</p>
            </div>
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
    
