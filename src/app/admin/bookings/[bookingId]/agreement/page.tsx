
'use client';

import React, { useState, useEffect, useCallback } from 'react';
import { useParams, useRouter } from 'next/navigation';
import type { Booking } from '@/types';
import { db } from '@/lib/firebase';
import { doc, getDoc, updateDoc, Timestamp } from 'firebase/firestore';
import { useToast } from '@/hooks/use-toast';
import { useLanguage } from '@/hooks/use-language';
import { AgreementTemplate } from '@/components/shared/agreement-template';
import { Textarea } from '@/components/ui/textarea';
import { Button } from '@/components/ui/button';
import { Loader2, AlertTriangle, ArrowLeft, Save, Printer, FileDown, ExternalLink, Download } from 'lucide-react';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import Image from 'next/image';

const DEFAULT_TERMS_KEYS = [
  'termsPlaceholder1',
  'termsPlaceholder2',
  'termsPlaceholder3',
  'termsPlaceholder4',
];

export default function AdminBookingAgreementPage() {
  const params = useParams();
  const router = useRouter();
  const bookingId = params.bookingId as string;
  const { toast } = useToast();
  const { t } = useLanguage();

  const [booking, setBooking] = useState<Booking | null>(null);
  const [editableTerms, setEditableTerms] = useState<string>('');
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const defaultTermsText = useCallback(() => {
    return DEFAULT_TERMS_KEYS.map(key => t(key)).join('\n\n');
  }, [t]);

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
        
        if (fetchedBooking.bookingCategory !== 'facility' || fetchedBooking.approvalStatus !== 'approved') {
            setError(t('agreementNotAvailableForBooking')); 
            setBooking(null);
        } else {
            setBooking(fetchedBooking);
            setEditableTerms(fetchedBooking.customAgreementTerms || defaultTermsText());
        }
      } else {
        setError(t('bookingNotFound')); 
      }
    } catch (err) {
      console.error("Error fetching booking details for agreement:", err);
      setError(t('errorFetchingBookingDetails')); 
      toast({ variant: "destructive", title: t('error'), description: t('errorFetchingBookingDetails') });
    } finally {
      setIsLoading(false);
    }
  }, [t, toast, defaultTermsText]);

  useEffect(() => {
    if (bookingId) {
      fetchBookingDetails(bookingId);
    } else {
      setError(t('noBookingIdProvided')); 
      setIsLoading(false);
    }
  }, [bookingId, fetchBookingDetails]);

  const handleSaveTerms = async () => {
    if (!booking) return;
    if (!db) {
        toast({ variant: "destructive", title: t('error'), description: t('databaseConnectionError') });
        return;
    }
    setIsSaving(true);
    try {
      const bookingRef = doc(db, "bookings", booking.id);
      await updateDoc(bookingRef, {
        customAgreementTerms: editableTerms,
      });
      setBooking(prev => prev ? { ...prev, customAgreementTerms: editableTerms } : null);
      toast({ title: t('success'), description: t('agreementTermsSaved') });
    } catch (err) {
      console.error("Error saving agreement terms:", err);
      toast({ variant: "destructive", title: t('error'), description: t('errorSavingTerms') });
    } finally {
      setIsSaving(false);
    }
  };

  const isImageFile = (url: string = '') => {
    return /\.(jpg|jpeg|png|webp|gif)$/i.test(url);
  };
  
  if (isLoading) {
    return (
      <div className="flex flex-col items-center justify-center min-h-screen p-4 bg-slate-100">
        <Loader2 className="h-12 w-12 animate-spin text-primary mb-4" />
        <p className="text-lg text-slate-600">{t('loadingAgreementDetails')}</p> 
      </div>
    );
  }

  if (error) {
    return (
      <div className="flex flex-col items-center justify-center min-h-screen p-4 bg-slate-100 text-center">
        <AlertTriangle className="h-12 w-12 text-destructive mb-4" />
        <p className="text-lg text-destructive mb-6">{error}</p>
        <Button onClick={() => router.back()} variant="outline">
            <ArrowLeft className="mr-2 h-4 w-4" /> {t('goBack')}
        </Button>
      </div>
    );
  }
  
  return (
    <div className="bg-slate-100 min-h-screen py-8 px-2 print:bg-white">
        <div className="max-w-4xl mx-auto mb-6 no-print">
            <div className="flex justify-between items-center mb-4">
                <Button onClick={() => router.back()} variant="outline" size="sm">
                    <ArrowLeft className="mr-2 h-4 w-4" /> {t('backToBookings')}
                </Button>
                <div className="space-x-2">
                    <Button onClick={handleSaveTerms} variant="default" size="sm" disabled={isSaving}>
                        {isSaving ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Save className="mr-2 h-4 w-4" />}
                        {t('saveTerms')}
                    </Button>
                    <Button onClick={() => window.print()} variant="outline" size="sm">
                        <Printer className="mr-2 h-4 w-4" /> {t('printAgreement')}
                    </Button>
                </div>
            </div>

            {booking?.signedAgreementUrl && (
                <div className="mb-6 p-4 border border-green-500 rounded-md bg-green-50">
                    <h3 className="text-md font-semibold text-green-700 mb-2">{t('clientSignedAgreementUploaded')}</h3>
                    <p className="text-sm text-green-600 mb-3">
                        {t('clientSignedAgreementUploadedDescAdmin')}
                    </p>
                    <Dialog>
                        <DialogTrigger asChild>
                            <Button variant="outline" size="sm" className="border-green-600 text-green-700 hover:bg-green-100">
                                <ExternalLink className="mr-2 h-4 w-4" /> {t('viewClientSignedAgreement')}
                            </Button>
                        </DialogTrigger>
                        <DialogContent className="max-w-4xl max-h-[90vh] flex flex-col">
                            <DialogHeader>
                                <DialogTitle>{t('signedAgreementPreview')}</DialogTitle>
                                <DialogDescription>{t('previewOfUploadedFile')}</DialogDescription>
                            </DialogHeader>
                            <div className="flex-grow overflow-auto p-4 flex items-center justify-center bg-muted/50 rounded-md">
                                {isImageFile(booking.signedAgreementUrl) ? (
                                    <Image src={booking.signedAgreementUrl} alt={t('signedAgreementPreview')} width={800} height={1100} className="max-w-full h-auto object-contain" />
                                ) : (
                                    <div className="text-center">
                                        <FileDown className="mx-auto h-16 w-16 text-muted-foreground mb-4" />
                                        <p className="font-semibold">{t('previewNotAvailable')}</p>
                                        <p className="text-sm text-muted-foreground">{t('downloadToViewFile')}</p>
                                    </div>
                                )}
                            </div>
                            <DialogFooter>
                                <Button asChild variant="default">
                                    <a href={booking.signedAgreementUrl} target="_blank" rel="noopener noreferrer" download>
                                        <Download className="mr-2 h-4 w-4" /> {t('downloadFile')}
                                    </a>
                                </Button>
                            </DialogFooter>
                        </DialogContent>
                    </Dialog>
                </div>
            )}

            <div className="space-y-2 mb-6 p-4 border rounded-md bg-background">
                <label htmlFor="editableTerms" className="block text-sm font-medium text-foreground">
                {t('editAgreementTerms')}:
                </label>
                <Textarea
                    id="editableTerms"
                    value={editableTerms}
                    onChange={(e) => setEditableTerms(e.target.value)}
                    rows={10}
                    className="w-full text-xs"
                    placeholder={t('enterCustomTermsHere')}
                />
                <p className="text-xs text-muted-foreground">{t('editTermsNote')}</p>
            </div>
        </div>
        <AgreementTemplate booking={booking} customTerms={editableTerms} />
    </div>
  );
}
