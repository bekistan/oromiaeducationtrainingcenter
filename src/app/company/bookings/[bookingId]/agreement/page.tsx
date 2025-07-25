
'use client';

import React, { useState, useEffect, useCallback, useRef } from 'react';
import { useParams, useRouter } from 'next/navigation';
import type { Booking } from '@/types';
import { db } from '@/lib/firebase';
import { doc, getDoc, Timestamp, updateDoc, serverTimestamp } from 'firebase/firestore';
import { useToast } from '@/hooks/use-toast';
import { useLanguage } from '@/hooks/use-language';
import { useAuth } from '@/hooks/use-auth'; 
import { AgreementTemplate } from '@/components/shared/agreement-template';
import { Button } from '@/components/ui/button';
import { Loader2, AlertTriangle, ArrowLeft, Printer, UploadCloud, Hourglass, CheckCircle, ExternalLink, FileDown, Download } from 'lucide-react';
import { PublicLayout } from '@/components/layout/public-layout';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { SignedAgreementPreviewDialog } from '@/components/shared/signed-agreement-preview';
import { notifyAdminsOfSignedAgreement } from '@/actions/notification-actions';

export default function CompanyBookingAgreementViewPage() {
  const params = useParams();
  const router = useRouter();
  const bookingId = params.bookingId as string;
  const { toast } = useToast();
  const { t } = useLanguage();
  const { user, loading: authLoading } = useAuth();

  const [booking, setBooking] = useState<Booking | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [isUploading, setIsUploading] = useState(false);
  const [isPreviewOpen, setIsPreviewOpen] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const fetchBookingDetails = useCallback(async (id: string) => {
    if (!id) {
      setError(t('invalidBookingId'));
      setIsLoading(false);
      return;
    }
    if (!db) {
      setError(t('databaseConnectionError'));
      setIsLoading(false);
      return;
    }
    setIsLoading(true);
    setError(null);
    try {
      const bookingRef = doc(db, "bookings", id);
      const docSnap = await getDoc(bookingRef);

      if (docSnap.exists()) {
        const data = docSnap.data();
        const fetchedBooking = {
          id: docSnap.id,
          ...data,
          bookedAt: data.bookedAt instanceof Timestamp ? data.bookedAt.toDate().toISOString() : (typeof data.bookedAt === 'string' ? data.bookedAt : new Date().toISOString()),
          startDate: data.startDate instanceof Timestamp ? data.startDate.toDate().toISOString().split('T')[0] : (typeof data.startDate === 'string' ? data.startDate : new Date().toISOString().split('T')[0]),
          endDate: data.endDate instanceof Timestamp ? data.endDate.toDate().toISOString().split('T')[0] : (typeof data.endDate === 'string' ? data.endDate : new Date().toISOString().split('T')[0]),
        } as Booking;
        
        if (user && user.role === 'company_representative' && fetchedBooking.companyId !== user.companyId) {
            setError(t('accessDeniedViewAgreement')); 
            setBooking(null);
        } else if (fetchedBooking.bookingCategory !== 'facility' || fetchedBooking.approvalStatus !== 'approved') {
            setError(t('agreementNotAvailableForBooking'));
            setBooking(null);
        } else {
            setBooking(fetchedBooking);
        }
      } else {
        setError(t('bookingNotFound')); 
      }
    } catch (err) {
      console.error("Error fetching booking details for agreement view:", err);
      setError(t('errorFetchingBookingDetails')); 
      toast({ variant: "destructive", title: t('error'), description: t('errorFetchingBookingDetails') });
    } finally {
      setIsLoading(false);
    }
  }, [t, toast, user]);

  useEffect(() => {
    if (authLoading) return; 

    if (!user || user.role !== 'company_representative') {
      setError(t('mustBeLoggedInAsCompanyToViewAgreement')); 
      setIsLoading(false);
      return;
    }

    if (bookingId) {
      fetchBookingDetails(bookingId);
    } else {
      setError(t('noBookingIdProvided')); 
      setIsLoading(false);
    }
  }, [bookingId, fetchBookingDetails, user, authLoading]);
  
  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      setSelectedFile(file);
    }
  };

  const handleUpload = async () => {
    if (!selectedFile || !bookingId || !booking?.companyId) {
        toast({ variant: 'destructive', title: t('error'), description: t('fileOrBookingInfoMissing') });
        return;
    }
    if (!db) {
        toast({ variant: 'destructive', title: t('error'), description: t('databaseConnectionError') });
        return;
    }
    setIsUploading(true);
    const formData = new FormData();
    formData.append('file', selectedFile);
    formData.append('bookingId', bookingId);
    formData.append('companyId', booking.companyId);

    try {
      const response = await fetch('/api/upload-agreement', {
        method: 'POST',
        body: formData,
      });

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({ error: 'Upload failed with a non-JSON response.' }));
        throw new Error(errorData.details || errorData.error || t('failedToUploadAgreement'));
      }
      const result = await response.json();
      const cloudinaryUrl = result.url;
      
      if (!cloudinaryUrl) {
          throw new Error('API did not return a valid URL.');
      }

      const bookingRef = doc(db, "bookings", bookingId);
      await updateDoc(bookingRef, {
        signedAgreementUrl: cloudinaryUrl,
        agreementStatus: 'signed_by_client',
        agreementSignedAt: serverTimestamp(),
      });
      
      const updatedBookingForNotification = { ...booking, signedAgreementUrl: cloudinaryUrl, agreementStatus: 'signed_by_client' as const };
      
      notifyAdminsOfSignedAgreement(updatedBookingForNotification);

      toast({ title: t('success'), description: t('agreementUploadedSuccessfully') });
      setBooking(updatedBookingForNotification);
      setSelectedFile(null);

    } catch (err) {
      toast({ variant: 'destructive', title: t('error'), description: (err as Error).message || t('failedToUploadAgreement') });
    } finally {
      setIsUploading(false);
    }
  };

  if (isLoading || authLoading) {
    return (
      <PublicLayout>
        <div className="flex flex-col items-center justify-center min-h-[calc(100vh-8rem)] p-4">
            <Loader2 className="h-12 w-12 animate-spin text-primary mb-4" />
            <p className="text-lg text-muted-foreground">{t('loadingAgreementDetails')}</p> 
        </div>
      </PublicLayout>
    );
  }

  if (error) {
    return (
      <PublicLayout>
        <div className="flex flex-col items-center justify-center min-h-[calc(100vh-8rem)] p-4 text-center">
            <AlertTriangle className="h-12 w-12 text-destructive mb-4" />
            <p className="text-lg text-destructive mb-6">{error}</p>
            <Button onClick={() => router.push('/company/dashboard')} variant="outline">
                <ArrowLeft className="mr-2 h-4 w-4" /> {t('backToCompanyDashboard')}
            </Button>
        </div>
      </PublicLayout>
    );
  }
  
  const renderUploadCard = () => {
    return (
        <Card className="my-6">
            <CardHeader>
                <CardTitle>{t('uploadYourSignedAgreement')}</CardTitle>
                <CardDescription>{t('uploadSignedAgreementDesc')}</CardDescription>
            </CardHeader>
            <CardContent className="flex flex-col sm:flex-row items-center gap-4">
                <Input type="file" ref={fileInputRef} onChange={handleFileChange} accept=".pdf,.png,.jpg,.jpeg" className="flex-grow" />
                <Button onClick={handleUpload} disabled={isUploading || !selectedFile} className="w-full sm:w-auto">
                    {isUploading ? <Loader2 className="mr-2 h-4 w-4 animate-spin"/> : <UploadCloud className="mr-2 h-4 w-4"/>}
                    {t('uploadFile')}
                </Button>
            </CardContent>
        </Card>
    );
  };
  
  const renderViewSignedCard = () => {
      if (!booking?.signedAgreementUrl) return null;
      return (
           <Card className="my-6 bg-green-50 border-green-200">
              <CardHeader>
                  <CardTitle className="text-green-700 flex items-center"><CheckCircle className="mr-2 h-5 w-5" />{t('agreementSubmittedTitle')}</CardTitle>
                  <CardDescription className="text-green-600">{t('agreementSubmittedDesc')}</CardDescription>
              </CardHeader>
               <CardContent>
                  <Button onClick={() => setIsPreviewOpen(true)} variant="outline" className="border-green-600 text-green-700 hover:bg-green-100">
                    <ExternalLink className="mr-2 h-4 w-4"/>
                    {t('viewYourUploadedAgreement')}
                  </Button>
              </CardContent>
          </Card>
      );
  }

  return (
    <>
    <PublicLayout usePrintLayout={true}>
        <div className="bg-slate-50 min-h-[calc(100vh-8rem)] py-8 px-2 print:bg-white print:p-0">
            <div className="max-w-4xl mx-auto mb-4 no-print">
                <div className="flex justify-between items-center mb-4">
                    <Button onClick={() => router.push('/company/dashboard')} variant="outline" size="sm">
                        <ArrowLeft className="mr-2 h-4 w-4" /> {t('backToCompanyDashboard')}
                    </Button>
                    {booking?.agreementStatus === 'sent_to_client' && !booking?.signedAgreementUrl && (
                        <Button onClick={() => window.print()} variant="default" size="sm">
                            <Printer className="mr-2 h-4 w-4" /> {t('printDownloadAgreement')}
                        </Button>
                    )}
                </div>
                {booking?.signedAgreementUrl ? renderViewSignedCard() : renderUploadCard()}
            </div>
            {booking && <AgreementTemplate booking={booking} customTerms={booking?.customAgreementTerms} />}
        </div>
    </PublicLayout>
    {booking?.signedAgreementUrl && (
      <SignedAgreementPreviewDialog
        isOpen={isPreviewOpen}
        onClose={() => setIsPreviewOpen(false)}
        fileUrl={booking.signedAgreementUrl}
        fileName={booking.signedAgreementUrl.split('/').pop() || 'signed-agreement'}
      />
    )}
    </>
  );
}
