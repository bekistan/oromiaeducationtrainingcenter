
'use client';

import React, { useState, useEffect, useCallback, useRef } from 'react';
import { useParams, useRouter } from 'next/navigation';
import type { Booking } from '@/types';
import { db } from '@/lib/firebase';
import { doc, getDoc, Timestamp, updateDoc } from 'firebase/firestore';
import { useToast } from '@/hooks/use-toast';
import { useLanguage } from '@/hooks/use-language';
import { useAuth } from '@/hooks/use-auth'; 
import { AgreementTemplate } from '@/components/shared/agreement-template';
import { Button } from '@/components/ui/button';
import { Loader2, AlertTriangle, ArrowLeft, Printer, FileDown, ExternalLink, UploadCloud } from 'lucide-react';
import { PublicLayout } from '@/components/layout/public-layout';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';

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
  const fileInputRef = useRef<HTMLInputElement>(null);

  const fetchBookingDetails = useCallback(async (id: string) => {
    if (!id) {
      setError(t('invalidBookingId'));
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
        } else if (fetchedBooking.bookingCategory !== 'facility' || fetchedBooking.approvalStatus !== 'approved' || (fetchedBooking.agreementStatus !== 'sent_to_client' && fetchedBooking.agreementStatus !== 'signed_by_client' && fetchedBooking.agreementStatus !== 'completed')) {
            setError(t('agreementNotReadyForViewing')); 
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
    if (!selectedFile || !bookingId) return;
    setIsUploading(true);
    const formData = new FormData();
    formData.append('file', selectedFile);
    formData.append('bookingId', bookingId);
    try {
      const response = await fetch('/api/upload-agreement', {
        method: 'POST',
        body: formData,
      });
      if (!response.ok) throw new Error('Upload failed');
      const result = await response.json();
      toast({ title: t('success'), description: t('agreementUploadedSuccessfully') });
      setBooking(prev => prev ? { ...prev, signedAgreementUrl: result.cloudinaryUrl, agreementStatus: 'signed_by_client' } : null);
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
  
  return (
    <PublicLayout>
        <div className="bg-slate-50 min-h-[calc(100vh-8rem)] py-8 px-2 print:bg-white">
            <div className="max-w-4xl mx-auto mb-4 no-print">
                <div className="flex justify-between items-center mb-4">
                    <Button onClick={() => router.push('/company/dashboard')} variant="outline" size="sm">
                        <ArrowLeft className="mr-2 h-4 w-4" /> {t('backToCompanyDashboard')}
                    </Button>
                    <Button onClick={() => window.print()} variant="default" size="sm">
                        <Printer className="mr-2 h-4 w-4" /> {t('printDownloadAgreement')}
                    </Button>
                </div>
                 {booking?.agreementStatus === 'sent_to_client' && (
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
                )}
                 {booking?.signedAgreementUrl && (booking.agreementStatus === 'signed_by_client' || booking.agreementStatus === 'completed') && (
                    <div className="mb-6 p-4 border border-green-500 rounded-md bg-green-50">
                        <h3 className="text-md font-semibold text-green-700 mb-2">{t('yourSignedAgreementUploaded')}</h3>
                        <Button asChild variant="outline" size="sm">
                            <a href={booking.signedAgreementUrl} target="_blank" rel="noopener noreferrer">
                                <ExternalLink className="mr-2 h-4 w-4" /> {t('viewYourSignedAgreement')}
                            </a>
                        </Button>
                    </div>
                )}
            </div>
            <AgreementTemplate booking={booking} customTerms={booking?.customAgreementTerms} />
        </div>
    </PublicLayout>
  );
}
