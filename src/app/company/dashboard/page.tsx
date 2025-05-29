
"use client";

import React, { useState, useEffect, useCallback, useRef } from 'react';
import Link from 'next/link';
import { PublicLayout } from '@/components/layout/public-layout';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { useLanguage } from '@/hooks/use-language';
import { useAuth } from '@/hooks/use-auth';
import type { Booking, AgreementStatus } from '@/types';
import { AlertCircle, Building, ShoppingBag, Utensils, Coffee, Loader2, Info, ChevronLeft, ChevronRight, FileSignature, Hourglass, FileText, UploadCloud } from 'lucide-react';
import { db } from '@/lib/firebase';
import { collection, getDocs, query, where, Timestamp, doc, updateDoc } from 'firebase/firestore';
import { useToast } from '@/hooks/use-toast';
import { useRouter } from 'next/navigation';
import { useSimpleTable } from '@/hooks/use-simple-table';

export default function CompanyDashboardPage() {
  const { t } = useLanguage();
  const { user, loading: authLoading } = useAuth();
  const { toast } = useToast();
  const router = useRouter();
  const [allBookings, setAllBookings] = useState<Booking[]>([]);
  const [isLoadingBookings, setIsLoadingBookings] = useState(true);
  const [isSubmittingAgreement, setIsSubmittingAgreement] = useState<string | null>(null); // bookingId or null
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [currentBookingIdForUpload, setCurrentBookingIdForUpload] = useState<string | null>(null);


  const fetchBookings = useCallback(async (companyId: string) => {
    setIsLoadingBookings(true);
    try {
      const q = query(collection(db, "bookings"), where("companyId", "==", companyId));
      const querySnapshot = await getDocs(q);
      const bookingsData = querySnapshot.docs.map(docSnap => {
        const data = docSnap.data();
        return {
          id: docSnap.id,
          ...data,
          bookedAt: data.bookedAt instanceof Timestamp ? data.bookedAt.toDate().toISOString() : data.bookedAt,
          startDate: data.startDate instanceof Timestamp ? data.startDate.toDate().toISOString().split('T')[0] : data.startDate,
          endDate: data.endDate instanceof Timestamp ? data.endDate.toDate().toISOString().split('T')[0] : data.endDate,
          agreementSentAt: data.agreementSentAt instanceof Timestamp ? data.agreementSentAt.toDate().toISOString() : data.agreementSentAt,
          agreementSignedAt: data.agreementSignedAt instanceof Timestamp ? data.agreementSignedAt.toDate().toISOString() : data.agreementSignedAt,
        } as Booking;
      });
      setAllBookings(bookingsData.sort((a,b) => new Date(b.bookedAt as string).getTime() - new Date(a.bookedAt as string).getTime()));
    } catch (error) {
      console.error("Error fetching company bookings: ", error);
      toast({ variant: "destructive", title: t('error'), description: t('errorFetchingYourBookings') });
    } finally {
      setIsLoadingBookings(false);
    }
  }, [t, toast]);

  useEffect(() => {
    if (user && user.role === 'company_representative' && user.approvalStatus === 'approved' && user.companyId) {
      fetchBookings(user.companyId);
    } else if (user && user.role === 'company_representative' && user.approvalStatus !== 'approved') {
        setIsLoadingBookings(false); 
    } else if (!user && !authLoading) {
        setIsLoadingBookings(false); 
    }
  }, [user, authLoading, fetchBookings]);

  const {
    paginatedData: displayedBookings,
    setSearchTerm,
    searchTerm,
    currentPage,
    pageCount,
    nextPage,
    previousPage,
    canNextPage,
    canPreviousPage,
    totalItems,
  } = useSimpleTable<Booking>({
      initialData: allBookings,
      rowsPerPage: 10,
      searchKeys: ['id'], 
  });

  const handleTriggerFileUpload = (bookingId: string) => {
    setCurrentBookingIdForUpload(bookingId);
    fileInputRef.current?.click();
  };

  const handleFileSelectedAndConfirm = async (event: React.ChangeEvent<HTMLInputElement>) => {
    if (event.target.files && event.target.files.length > 0 && currentBookingIdForUpload) {
      const bookingId = currentBookingIdForUpload;
      setIsSubmittingAgreement(bookingId);
      try {
        const bookingRef = doc(db, "bookings", bookingId);
        await updateDoc(bookingRef, {
          agreementStatus: 'signed_by_client',
          agreementSignedAt: Timestamp.now(),
        });
        toast({ title: t('success'), description: t('agreementConfirmedAndMockUploaded') }); // Add to JSON
        if (user?.companyId) fetchBookings(user.companyId); 
      } catch (error) {
        console.error("Error confirming signed agreement:", error);
        toast({ variant: "destructive", title: t('error'), description: t('errorMockUploadingAgreement') }); // Add to JSON
      } finally {
        setIsSubmittingAgreement(null);
        setCurrentBookingIdForUpload(null);
        if (fileInputRef.current) {
          fileInputRef.current.value = ""; // Reset file input
        }
      }
    } else {
        // Handle case where no file was selected but input was triggered
        setCurrentBookingIdForUpload(null);
    }
  };


  if (authLoading) {
    return (
      <PublicLayout>
        <div className="container mx-auto py-12 px-4 flex justify-center items-center min-h-[calc(100vh-8rem)]">
          <Loader2 className="h-12 w-12 animate-spin text-primary" />
        </div>
      </PublicLayout>
    );
  }

  if (!user || user.role !== 'company_representative') {
    return (
      <PublicLayout>
        <div className="container mx-auto py-12 px-4 flex justify-center items-center min-h-[calc(100vh-8rem)]">
          <Card className="w-full max-w-md shadow-xl text-center">
            <CardHeader>
              <AlertCircle className="w-12 h-12 text-destructive mx-auto mb-4" />
              <CardTitle className="text-2xl text-destructive">{t('accessDenied')}</CardTitle>
            </CardHeader>
            <CardContent>
              <p className="mb-4">{t('mustBeLoggedInAsCompanyDashboard')}</p>
              <Button onClick={() => router.push('/auth/login?redirect=/company/dashboard')}>{t('login')}</Button>
            </CardContent>
          </Card>
        </div>
      </PublicLayout>
    );
  }

  const getStatusMessageAndIcon = () => {
    switch (user.approvalStatus) {
      case 'pending':
        return {
          icon: <Hourglass className="w-12 h-12 text-yellow-500 mx-auto mb-4" />,
          title: t('registrationPendingTitle'),
          message: t('registrationPendingMessage'),
          cardClass: "border-yellow-500 bg-yellow-50 dark:bg-yellow-900/20"
        };
      case 'rejected':
        return {
          icon: <AlertCircle className="w-12 h-12 text-destructive mx-auto mb-4" />,
          title: t('registrationRejectedTitle'),
          message: t('registrationRejectedMessage'),
          cardClass: "border-destructive bg-red-50 dark:bg-red-900/20"
        };
      default: 
        return {
          icon: <Info className="w-12 h-12 text-muted-foreground mx-auto mb-4" />,
          title: t('statusUnknownTitle'),
          message: t('statusUnknownMessage'),
          cardClass: "border-muted"
        };
    }
  };
  
  const getPaymentStatusBadge = (status: Booking['paymentStatus']) => {
    switch (status) {
      case 'paid':
        return <Badge className="bg-green-100 text-green-700 border-green-300 hover:bg-green-200 dark:bg-green-700/30 dark:text-green-200 dark:border-green-500">{t(status)}</Badge>;
      case 'pending':
        return <Badge className="bg-yellow-100 text-yellow-700 border-yellow-300 hover:bg-yellow-200 dark:bg-yellow-700/30 dark:text-yellow-200 dark:border-yellow-500">{t(status)}</Badge>;
      case 'failed':
        return <Badge className="bg-red-100 text-red-700 border-red-300 hover:bg-red-200 dark:bg-red-700/30 dark:text-red-200 dark:border-red-500">{t(status)}</Badge>;
      default:
        return <Badge variant="secondary">{t(status)}</Badge>;
    }
  };

  const getApprovalStatusBadge = (status: Booking['approvalStatus']) => {
    switch (status) {
      case 'approved':
        return <Badge className="bg-blue-100 text-blue-700 border-blue-300 hover:bg-blue-200 dark:bg-blue-700/30 dark:text-blue-200 dark:border-blue-500">{t(status)}</Badge>;
      case 'pending':
        return <Badge className="bg-orange-100 text-orange-700 border-orange-300 hover:bg-orange-200 dark:bg-orange-700/30 dark:text-orange-200 dark:border-orange-500">{t(status)}</Badge>;
      case 'rejected':
        return <Badge className="bg-gray-100 text-gray-700 border-gray-300 hover:bg-gray-200 dark:bg-gray-700/30 dark:text-gray-200 dark:border-gray-500">{t(status)}</Badge>;
      default:
        return <Badge variant="secondary">{t(status)}</Badge>;
    }
  };

  const getAgreementStatusBadge = (status?: AgreementStatus) => {
    if (!status) return <Badge variant="outline">{t('notApplicable')}</Badge>;
    switch (status) {
      case 'pending_admin_action':
        return <Badge className="bg-purple-100 text-purple-700 border-purple-300 hover:bg-purple-200">{t('pendingAdminAction')}</Badge>;
      case 'sent_to_client':
        return <Badge className="bg-cyan-100 text-cyan-700 border-cyan-300 hover:bg-cyan-200">{t('sentToClient')}</Badge>;
      case 'signed_by_client':
        return <Badge className="bg-teal-100 text-teal-700 border-teal-300 hover:bg-teal-200">{t('signedByClient')}</Badge>;
      case 'completed':
        return <Badge className="bg-green-100 text-green-700 border-green-300 hover:bg-green-200">{t('completed')}</Badge>;
      default:
        return <Badge variant="secondary">{t(status)}</Badge>;
    }
  };

  if (user.approvalStatus !== 'approved') {
    const { icon, title, message, cardClass } = getStatusMessageAndIcon();
    return (
      <PublicLayout>
        <div className="container mx-auto py-12 px-4 flex justify-center items-center min-h-[calc(100vh-8rem)]">
          <Card className={`w-full max-w-lg shadow-xl text-center ${cardClass}`}>
            <CardHeader>
              {icon}
              <CardTitle className="text-2xl">{title}</CardTitle>
            </CardHeader>
            <CardContent>
              <p>{message}</p>
              {user.approvalStatus === 'rejected' && (
                 <p className="mt-2 text-sm">{t('contactSupportForAssistance')}</p>
              )}
            </CardContent>
          </Card>
        </div>
      </PublicLayout>
    );
  }

  return (
    <PublicLayout>
      <div className="container mx-auto py-8 px-4 space-y-8">
        <input 
          type="file" 
          ref={fileInputRef} 
          style={{ display: 'none' }} 
          onChange={handleFileSelectedAndConfirm} 
          accept=".pdf,.doc,.docx,.jpg,.png" // Example accepted file types
        />
        <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
            <div>
                <h1 className="text-3xl font-bold text-primary">{t('companyDashboardTitle')}</h1>
                <p className="text-muted-foreground">{t('welcomeBack')}, {user.companyName || user.name}!</p>
            </div>
            <Link href="/halls" passHref>
                 <Button variant="outline">
                    <Building className="mr-2 h-4 w-4" /> {t('bookNewFacility')}
                 </Button>
            </Link>
        </div>
        
        <Card>
          <CardHeader>
            <div className="flex justify-between items-center">
                <CardTitle className="flex items-center">
                <ShoppingBag className="mr-2 h-6 w-6 text-primary" />
                {t('yourBookingsTitle')}
                </CardTitle>
                <Input
                    placeholder={t('searchYourBookings')}
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                    className="max-w-xs text-sm"
                />
            </div>
            <CardDescription>{t('yourBookingsDescription')}</CardDescription>
          </CardHeader>
          <CardContent>
            {isLoadingBookings && !allBookings.length ? (
              <div className="flex justify-center items-center h-40"><Loader2 className="h-8 w-8 animate-spin text-primary" /></div>
            ) : displayedBookings.length === 0 ? (
              <div className="text-center py-10">
                <Building className="w-12 h-12 text-muted-foreground mx-auto mb-4" />
                <p className="text-lg text-muted-foreground">{searchTerm ? t('noBookingsMatchSearch') : t('noBookingsFound')}</p>
                <Link href="/halls" passHref>
                    <Button className="mt-4">{t('makeYourFirstBooking')}</Button>
                </Link>
              </div>
            ) : (
              <>
                <div className="overflow-x-auto">
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>{t('bookingId')}</TableHead>
                        <TableHead>{t('itemsBooked')}</TableHead>
                        <TableHead>{t('dates')}</TableHead>
                        <TableHead>{t('services')}</TableHead>
                        <TableHead>{t('totalCost')}</TableHead>
                        <TableHead>{t('payment')}</TableHead>
                        <TableHead>{t('status')}</TableHead>
                        <TableHead>{t('agreementStatus')}</TableHead>
                        <TableHead className="text-right">{t('actions')}</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {displayedBookings.map((booking) => (
                        <TableRow key={booking.id}>
                          <TableCell className="font-mono text-xs whitespace-nowrap">{booking.id.substring(0, 8)}...</TableCell>
                          <TableCell className="min-w-[150px]">{booking.items.map(item => item.name).join(', ')}</TableCell>
                          <TableCell className="whitespace-nowrap">
                            {new Date(booking.startDate as string).toLocaleDateString()} - {new Date(booking.endDate as string).toLocaleDateString()}
                          </TableCell>
                          <TableCell className="min-w-[120px]">
                            <div className="flex flex-col text-xs">
                              {booking.serviceDetails?.lunch && (
                                <span className="flex items-center">
                                  <Utensils className="w-3 h-3 mr-1 text-muted-foreground" /> {t('lunch')}: {t(booking.serviceDetails.lunch)}
                                </span>
                              )}
                              {booking.serviceDetails?.refreshment && (
                                <span className="flex items-center">
                                  <Coffee className="w-3 h-3 mr-1 text-muted-foreground" /> {t('refreshment')}: {t(booking.serviceDetails.refreshment)}
                                </span>
                              )}
                              {(!booking.serviceDetails || (Object.keys(booking.serviceDetails).length === 0)) && (
                                  <span className="text-muted-foreground italic text-xs">{t('serviceLevelNone')}</span>
                              )}
                            </div>
                          </TableCell>
                          <TableCell className="font-semibold whitespace-nowrap">{booking.totalCost} ETB</TableCell>
                          <TableCell>{getPaymentStatusBadge(booking.paymentStatus)}</TableCell>
                          <TableCell>{getApprovalStatusBadge(booking.approvalStatus)}</TableCell>
                          <TableCell>
                            {booking.bookingCategory === 'facility' ? getAgreementStatusBadge(booking.agreementStatus) : getAgreementStatusBadge()}
                          </TableCell>
                          <TableCell className="text-right space-x-1">
                            {booking.bookingCategory === 'facility' && booking.approvalStatus === 'approved' && booking.agreementStatus === 'sent_to_client' && (
                              <>
                                <Link href={`/company/bookings/${booking.id}/agreement`} passHref legacyBehavior>
                                  <Button size="sm" variant="outline" asChild>
                                      <a><FileText className="mr-2 h-4 w-4" />{t('viewDownloadAgreement')}</a>
                                  </Button>
                                </Link>
                                <Button 
                                  size="sm" 
                                  variant="outline"
                                  onClick={() => handleTriggerFileUpload(booking.id)}
                                  disabled={isSubmittingAgreement === booking.id}
                                  className="border-green-500 text-green-600 hover:bg-green-50 hover:text-green-700"
                                >
                                  {isSubmittingAgreement === booking.id ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <UploadCloud className="mr-2 h-4 w-4" /> }
                                  {t('uploadAndConfirmSignedAgreement')} {/* Add to JSON */}
                                </Button>
                              </>
                            )}
                             {booking.bookingCategory === 'facility' && booking.approvalStatus === 'approved' && (!booking.agreementStatus || booking.agreementStatus === 'pending_admin_action') && (
                               <span className="text-xs text-muted-foreground italic flex items-center justify-end">
                                 <Hourglass className="mr-1 h-3 w-3"/> {t('agreementPreparationPending')}
                               </span>
                            )}
                             {booking.bookingCategory === 'facility' && (booking.agreementStatus === 'signed_by_client' || booking.agreementStatus === 'completed') && (
                                <Link href={`/company/bookings/${booking.id}/agreement`} passHref legacyBehavior>
                                  <Button size="sm" variant="ghost" className="text-muted-foreground" asChild>
                                      <a><FileText className="mr-2 h-4 w-4" />{t('viewAgreement')}</a>
                                  </Button>
                                </Link>
                            )}
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </div>
                <div className="flex items-center justify-between pt-4">
                    <span className="text-sm text-muted-foreground">
                        {t('page')} {pageCount > 0 ? currentPage + 1 : 0} {t('of')} {pageCount} ({totalItems} {t('itemsTotal')})
                    </span>
                    <div className="space-x-2">
                        <Button
                            variant="outline"
                            size="sm"
                            onClick={previousPage}
                            disabled={!canPreviousPage}
                        >
                             <ChevronLeft className="h-4 w-4 mr-1" /> {t('previous')}
                        </Button>
                        <Button
                            variant="outline"
                            size="sm"
                            onClick={nextPage}
                            disabled={!canNextPage}
                        >
                            {t('next')} <ChevronRight className="h-4 w-4 ml-1" />
                        </Button>
                    </div>
                </div>
              </>
            )}
          </CardContent>
        </Card>
      </div>
    </PublicLayout>
  );
}


    