

"use client";

import React, { useState, useEffect, useCallback, useMemo } from 'react';
import Link from 'next/link';
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Input } from "@/components/ui/input";
import { useLanguage } from "@/hooks/use-language";
import { useAuth } from '@/hooks/use-auth';
import type { Booking, AgreementStatus, AgreementTemplateSettings } from "@/types";
import { Trash2, Filter, MoreHorizontal, Loader2, FileText, ChevronLeft, ChevronRight, Send, FileSignature, CheckCircle, AlertTriangle, ArrowUpDown, CreditCard, ShieldAlert, CalendarClock, Eye } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import {
  DropdownMenu,
  DropdownMenuCheckboxItem,
  DropdownMenuContent,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
  DropdownMenuItem,
} from "@/components/ui/dropdown-menu";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { db } from '@/lib/firebase';
import { collection, getDocs, doc, updateDoc, deleteDoc, Timestamp, query, where, getDoc as getFirestoreDoc, orderBy } from 'firebase/firestore';
import { useToast } from '@/hooks/use-toast';
import { useSimpleTable } from '@/hooks/use-simple-table';
import { useQuery, useMutation, useQueryClient, type QueryClient } from '@tanstack/react-query';
import { useRouter } from 'next/navigation';
import { formatEthiopianDate, toDateObject } from '@/lib/date-utils';
import { AGREEMENT_TEMPLATE_DOC_PATH, DEFAULT_AGREEMENT_TERMS } from '@/constants';
import { ScrollAnimate } from '@/components/shared/scroll-animate';
import { SignedAgreementPreviewDialog } from '@/components/shared/signed-agreement-preview';
import { notifyCompanyOfAgreement } from '@/actions/notification-actions';


type ApprovalStatusFilter = "all" | Booking['approvalStatus'];
type PaymentStatusFilter = "all" | Booking['paymentStatus'];
type BookingView = 'active' | 'due';

const FACILITY_BOOKINGS_QUERY_KEY = "adminFacilityBookings";

const fetchFacilityBookingsFromDb = async (): Promise<Booking[]> => {
  if (!db) return [];
  const q = query(
    collection(db, "bookings"), 
    where("bookingCategory", "==", "facility"),
    orderBy("bookedAt", "desc")
  );
  const querySnapshot = await getDocs(q);
  return querySnapshot.docs.map(docSnap => {
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
};

const fetchAgreementTemplate = async (): Promise<string> => {
    if (!db) return DEFAULT_AGREEMENT_TERMS;
    const docRef = doc(db, AGREEMENT_TEMPLATE_DOC_PATH);
    const docSnap = await getFirestoreDoc(docRef);
    if (docSnap.exists() && docSnap.data()?.defaultTerms) {
        return docSnap.data().defaultTerms;
    }
    return DEFAULT_AGREEMENT_TERMS;
};

const FormattedDate = ({ dateInput, format = 'default' }: { dateInput: any, format?: 'full' | 'default' }) => {
  const [formattedDate, setFormattedDate] = useState<string>('...');
  const { t } = useLanguage();

  useEffect(() => {
    const getFormattedDate = async () => {
      try {
        const result = await formatEthiopianDate(dateInput, format as any);
        setFormattedDate(result);
      } catch (e) {
        console.error("Failed to format date", e);
        setFormattedDate(t('notAvailable'));
      }
    };
    getFormattedDate();
  }, [dateInput, format, t]);

  return <>{formattedDate}</>;
}


export default function AdminManageFacilityBookingsPage() {
  const { t } = useLanguage();
  const { user, loading: authLoading } = useAuth();
  const router = useRouter();
  const { toast } = useToast();
  const queryClient: QueryClient = useQueryClient();

  const [approvalFilter, setApprovalFilter] = useState<ApprovalStatusFilter>("all");
  const [paymentFilter, setPaymentFilter] = useState<PaymentStatusFilter>("all");
  const [bookingView, setBookingView] = useState<BookingView>('active');
  const [isDeleteDialogOpen, setIsDeleteDialogOpen] = useState(false);
  const [bookingToDeleteId, setBookingToDeleteId] = useState<string | null>(null);
  const [previewFileUrl, setPreviewFileUrl] = useState<string | null>(null);

  const { data: allBookingsFromDb = [], isLoading: isLoadingBookings, error: bookingsError } = useQuery<Booking[], Error>({
    queryKey: [FACILITY_BOOKINGS_QUERY_KEY],
    queryFn: fetchFacilityBookingsFromDb,
    enabled: !authLoading && user != null && (user.role === 'superadmin' || (user.role === 'admin' && !user.buildingAssignment)),
  });

  const updateBookingMutation = useMutation<void, Error, { bookingId: string; updateData: Partial<Booking>; successMessageKey: string, bookingToNotify?: Booking }>({
    mutationFn: async ({ bookingId, updateData }) => {
      if (!db) throw new Error("Database not configured.");
      const bookingRef = doc(db, "bookings", bookingId);
      await updateDoc(bookingRef, updateData);
    },
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: [FACILITY_BOOKINGS_QUERY_KEY] });
      toast({ title: t('success'), description: t(variables.successMessageKey) });
      if (variables.bookingToNotify && variables.updateData.approvalStatus === 'approved') {
        notifyCompanyOfAgreement(variables.bookingToNotify).catch(err => {
            console.error("Web notification to company failed to dispatch:", err);
        });
      }
    },
    onError: (error) => {
      toast({ variant: "destructive", title: t('error'), description: error.message || t('errorUpdatingBookingStatus') });
    },
  });

  const deleteBookingMutation = useMutation<void, Error, string>({
    mutationFn: async (bookingId) => {
      if (!db) throw new Error("Database not configured.");
      await deleteDoc(doc(db, "bookings", bookingId));
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: [FACILITY_BOOKINGS_QUERY_KEY] });
      toast({ title: t('success'), description: t('bookingDeletedSuccessfully') });
      setIsDeleteDialogOpen(false);
      setBookingToDeleteId(null);
    },
    onError: (error) => {
      toast({ variant: "destructive", title: t('error'), description: error.message || t('errorDeletingBooking') });
    },
  });


  const filteredBookings = useMemo(() => {
    const today = new Date();
    today.setHours(0, 0, 0, 0); 

    return allBookingsFromDb.filter(booking => {
      const approvalMatch = approvalFilter === "all" || booking.approvalStatus === approvalFilter;
      const paymentMatch = paymentFilter === "all" || booking.paymentStatus === paymentFilter;

      const bookingEndDate = toDateObject(booking.endDate);
      if (!bookingEndDate) return false; 
      bookingEndDate.setHours(23, 59, 59, 999); 
      const viewMatch = bookingView === 'active' ? bookingEndDate >= today : bookingEndDate < today;

      return approvalMatch && paymentMatch && viewMatch;
    });
  }, [allBookingsFromDb, approvalFilter, paymentFilter, bookingView]);

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
    requestSort,
    sortConfig,
  } = useSimpleTable<Booking>({
      data: filteredBookings, 
      rowsPerPage: 10,
      searchKeys: ['id', 'companyName', 'email', 'phone'], // ID kept for search
      initialSort: { key: 'bookedAt', direction: 'descending' },
  });

  const getSortIndicator = (columnKey: keyof Booking | 'bookedAt') => {
    if (sortConfig?.key === columnKey) {
      return sortConfig.direction === 'ascending' ? ' ▲' : ' ▼';
    }
    return <ArrowUpDown className="ml-1 h-3 w-3 inline opacity-50 group-hover:opacity-100" />;
  };

  const handleApprovalChange = async (bookingId: string, newStatus: 'approved' | 'rejected') => {
    const updateData: Partial<Booking> = { approvalStatus: newStatus };
    const fullBookingDetails = allBookingsFromDb.find(b => b.id === bookingId);
    let bookingToNotify: Booking | undefined = undefined;

    if (newStatus === 'approved' && fullBookingDetails) {
      const defaultTerms = await fetchAgreementTemplate();
      updateData.agreementStatus = 'sent_to_client';
      updateData.agreementSentAt = Timestamp.now();
      updateData.customAgreementTerms = defaultTerms;
      bookingToNotify = { ...fullBookingDetails, ...updateData };
    } else if (newStatus === 'rejected') {
      updateData.paymentStatus = 'failed';
    }
    updateBookingMutation.mutate({ bookingId, updateData, successMessageKey: 'bookingStatusUpdated', bookingToNotify });
  };
  
  const handlePaymentStatusChange = (bookingId: string, newPaymentStatus: 'paid') => {
    const updateData: Partial<Booking> = { paymentStatus: newPaymentStatus };
    updateBookingMutation.mutate({ bookingId, updateData, successMessageKey: 'paymentStatusMarkedAsPaid' });
  };


  const handleAgreementStatusChange = (bookingId: string, newStatus: AgreementStatus) => {
    const updateData: Partial<Booking> = { agreementStatus: newStatus };
    if (newStatus === 'sent_to_client') {
      updateData.agreementSentAt = Timestamp.now();
    } else if (newStatus === 'signed_by_client') {
      updateData.agreementSignedAt = Timestamp.now(); 
    }
    updateBookingMutation.mutate({ bookingId, updateData, successMessageKey: 'agreementStatusUpdated' });
  };

  const confirmDeleteBooking = () => {
    if (!bookingToDeleteId) return;
    deleteBookingMutation.mutate(bookingToDeleteId);
  };

  const openDeleteDialog = (bookingId: string) => {
    setBookingToDeleteId(bookingId);
    setIsDeleteDialogOpen(true);
  };

  const getPaymentStatusBadge = (status: Booking['paymentStatus']) => {
    switch (status) {
      case 'paid':
        return <Badge className="bg-green-100 text-green-700 border-green-300 hover:bg-green-200">{t(status)}</Badge>;
      case 'pending':
        return <Badge className="bg-yellow-100 text-yellow-700 border-yellow-300 hover:bg-yellow-200">{t(status)}</Badge>;
      case 'failed':
        return <Badge className="bg-red-100 text-red-700 border-red-300 hover:bg-red-200">{t(status)}</Badge>;
      default:
        return <Badge variant="secondary">{t(status)}</Badge>;
    }
  };

  const getApprovalStatusBadge = (status: Booking['approvalStatus']) => {
    switch (status) {
      case 'approved':
        return <Badge className="bg-blue-100 text-blue-700 border-blue-300 hover:bg-blue-200">{t(status)}</Badge>;
      case 'pending':
        return <Badge className="bg-orange-100 text-orange-700 border-orange-300 hover:bg-orange-200">{t(status)}</Badge>;
      case 'rejected':
        return <Badge className="bg-gray-100 text-gray-700 border-gray-300 hover:bg-gray-200">{t(status)}</Badge>;
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

  if (authLoading) {
    return <div className="flex justify-center items-center h-screen"><Loader2 className="h-8 w-8 animate-spin text-primary" /><p className="ml-2">{t('loading')}...</p></div>;
  }

  if (user?.role === 'admin' && user.buildingAssignment) {
    return (
      <Card className="w-full max-w-md mx-auto my-8">
        <CardHeader>
          <CardTitle className="text-destructive flex items-center"><ShieldAlert className="mr-2"/>{t('accessDenied')}</CardTitle>
        </CardHeader>
        <CardContent>
          <p>{t('buildingAdminAccessFacilityBookingsDenied')}</p>
          <Button onClick={() => router.push('/admin/dashboard')} className="mt-4">{t('backToDashboard')}</Button>
        </CardContent>
      </Card>
    );
  }

  if (bookingsError) {
    return (
      <div className="flex flex-col items-center justify-center min-h-screen p-4">
        <AlertTriangle className="h-12 w-12 text-destructive mb-4" />
        <p className="text-lg text-destructive">{t('errorFetchingBookings')}: {bookingsError.message}</p>
      </div>
    );
  }

  return (
    <>
      <ScrollAnimate className="space-y-6">
        <div className="flex items-center justify-between">
          <h1 className="text-3xl font-bold text-foreground">{t('manageFacilityBookings')}</h1>
          <div className="flex items-center space-x-2">
            <Input
              placeholder={t('searchFacilityBookings')}
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="max-w-xs"
            />
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button variant="outline">
                  <Filter className="mr-2 h-4 w-4" /> {t('filterBookings')}
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent className="w-56">
                <DropdownMenuLabel>{t('approvalStatus')}</DropdownMenuLabel>
                <DropdownMenuSeparator />
                {(['all', 'pending', 'approved', 'rejected'] as ApprovalStatusFilter[]).map(status => (
                  <DropdownMenuCheckboxItem key={status} checked={approvalFilter === status} onCheckedChange={() => setApprovalFilter(status)}>
                    {t(status)}
                  </DropdownMenuCheckboxItem>
                ))}
                <DropdownMenuSeparator />
                <DropdownMenuLabel>{t('paymentStatus')}</DropdownMenuLabel>
                <DropdownMenuSeparator />
                {(['all', 'pending', 'paid', 'failed'] as PaymentStatusFilter[]).map(status => (
                  <DropdownMenuCheckboxItem key={status} checked={paymentFilter === status} onCheckedChange={() => setPaymentFilter(status)}>
                    {t(status)}
                  </DropdownMenuCheckboxItem>
                ))}
              </DropdownMenuContent>
            </DropdownMenu>
          </div>
        </div>

        <Tabs value={bookingView} onValueChange={(value) => setBookingView(value as BookingView)}>
          <TabsList>
            <TabsTrigger value="active">{t('activeBookings')}</TabsTrigger>
            <TabsTrigger value="due">{t('dueBookings')}</TabsTrigger>
          </TabsList>
        </Tabs>

        {isLoadingBookings && <div className="flex justify-center items-center h-40"><Loader2 className="h-8 w-8 animate-spin" /></div>}

        {!isLoadingBookings && displayedBookings.length === 0 && (
          <Card>
            <CardContent className="pt-6 text-center">
              <p className="mb-4">{searchTerm || approvalFilter !== 'all' || paymentFilter !== 'all' ? t('noFacilityBookingsMatchFilters') : t('noBookingsInView', { view: t(bookingView) })}</p>
            </CardContent>
          </Card>
        )}

        {!isLoadingBookings && displayedBookings.length > 0 && (
          <Card>
            <CardHeader>
              <div className="flex items-center justify-between">
                <CardTitle>{bookingView === 'active' ? t('facilityBookingList') : t('dueBookingList')}</CardTitle>
                {(updateBookingMutation.isPending || deleteBookingMutation.isPending) && <Loader2 className="h-5 w-5 animate-spin text-primary" />}
              </div>
              <CardDescription>{t('viewAndManageFacilityBookings')}</CardDescription>
            </CardHeader>
            <CardContent>
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead onClick={() => requestSort('bookedAt')} className="cursor-pointer group"><CalendarClock className="mr-1 h-4 w-4 inline-block"/>{t('bookedAt')}{getSortIndicator('bookedAt')}</TableHead>
                    <TableHead onClick={() => requestSort('companyName')} className="cursor-pointer group">{t('customer')}{getSortIndicator('companyName')}</TableHead>
                    <TableHead>{t('itemsBooked')}</TableHead>
                    <TableHead onClick={() => requestSort('startDate')} className="cursor-pointer group">{t('dates')}{getSortIndicator('startDate')}</TableHead>
                    <TableHead onClick={() => requestSort('totalCost')} className="cursor-pointer group">{t('totalCost')}{getSortIndicator('totalCost')}</TableHead>
                    <TableHead onClick={() => requestSort('paymentStatus')} className="cursor-pointer group">{t('paymentStatus')}{getSortIndicator('paymentStatus')}</TableHead>
                    <TableHead onClick={() => requestSort('approvalStatus')} className="cursor-pointer group">{t('approvalStatus')}{getSortIndicator('approvalStatus')}</TableHead>
                    <TableHead onClick={() => requestSort('agreementStatus')} className="cursor-pointer group">{t('agreementStatus')}{getSortIndicator('agreementStatus')}</TableHead>
                    <TableHead className="text-right">{t('actions')}</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {displayedBookings.map((booking) => (
                    <TableRow key={booking.id}>
                      <TableCell className="text-xs whitespace-nowrap"><FormattedDate dateInput={booking.bookedAt} format="full" /></TableCell>
                      <TableCell className="min-w-[150px]">{booking.companyName}{booking.userId && <span className="text-xs text-muted-foreground block whitespace-nowrap"> ({t('userIdAbbr')}: {booking.userId.substring(0,6)}...)</span>}</TableCell>
                      <TableCell className="min-w-[150px]">{booking.items.map(item => item.name).join(', ')} ({booking.items.length})</TableCell>
                      <TableCell className="whitespace-nowrap text-xs"><FormattedDate dateInput={booking.startDate} format="full" /> - <FormattedDate dateInput={booking.endDate} format="full" /></TableCell>
                      <TableCell className="whitespace-nowrap">{booking.totalCost} {t('currencySymbol')}</TableCell>
                      <TableCell>{getPaymentStatusBadge(booking.paymentStatus)}</TableCell>
                      <TableCell>{getApprovalStatusBadge(booking.approvalStatus)}</TableCell>
                      <TableCell>{getAgreementStatusBadge(booking.agreementStatus)}</TableCell>
                      <TableCell className="text-right space-x-1">
                        {booking.signedAgreementUrl && (
                           <Button variant="outline" size="icon" title={t('viewClientSignedAgreement')} onClick={() => setPreviewFileUrl(booking.signedAgreementUrl!)}>
                               <Eye className="h-4 w-4"/>
                               <span className="sr-only">{t('viewClientSignedAgreement')}</span>
                           </Button>
                        )}
                        <DropdownMenu>
                            <DropdownMenuTrigger asChild>
                                <Button variant="ghost" size="icon" title={t('moreActions')} disabled={updateBookingMutation.isPending || deleteBookingMutation.isPending}>
                                    <MoreHorizontal className="h-4 w-4" />
                                    <span className="sr-only">{t('moreActions')}</span>
                                </Button>
                            </DropdownMenuTrigger>
                            <DropdownMenuContent align="end">
                                <DropdownMenuItem onClick={() => handleApprovalChange(booking.id, 'approved')} disabled={booking.approvalStatus === 'approved'}>
                                    <CheckCircle className="mr-2 h-4 w-4" /> {t('approveBooking')}
                                </DropdownMenuItem>
                                <DropdownMenuItem onClick={() => handleApprovalChange(booking.id, 'rejected')} disabled={booking.approvalStatus === 'rejected'} className="text-destructive focus:bg-destructive focus:text-destructive-foreground">
                                    {t('rejectBooking')}
                                </DropdownMenuItem>
                                <DropdownMenuSeparator />
                                <DropdownMenuLabel>{t('paymentActions')}</DropdownMenuLabel>
                                <DropdownMenuItem onClick={() => handlePaymentStatusChange(booking.id, 'paid')} disabled={booking.paymentStatus === 'paid'}>
                                    <CreditCard className="mr-2 h-4 w-4" /> {t('markAsPaid')}
                                </DropdownMenuItem>
                                <DropdownMenuSeparator />
                                <DropdownMenuLabel>{t('agreementActions')}</DropdownMenuLabel>
                                <DropdownMenuItem asChild>
                                  <Link href={`/admin/bookings/${booking.id}/agreement`} target="_blank" rel="noopener noreferrer">
                                    <FileText className="mr-2 h-4 w-4" /> {t('viewEditAgreement')}
                                  </Link>
                                </DropdownMenuItem>
                                <DropdownMenuItem
                                  onClick={() => handleAgreementStatusChange(booking.id, 'completed')}
                                  disabled={booking.agreementStatus !== 'signed_by_client'}
                                >
                                  <CheckCircle className="mr-2 h-4 w-4" /> {t('markAgreementCompleted')}
                                </DropdownMenuItem>
                                <DropdownMenuSeparator />
                                <DropdownMenuItem className="text-destructive focus:bg-destructive focus:text-destructive-foreground" onClick={() => openDeleteDialog(booking.id)}>
                                    <Trash2 className="mr-2 h-4 w-4" /> {t('delete')}
                                </DropdownMenuItem>
                            </DropdownMenuContent>
                        </DropdownMenu>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
              <div className="flex items-center justify-between py-4">
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
            </CardContent>
          </Card>
        )}
      </ScrollAnimate>

      <AlertDialog open={isDeleteDialogOpen} onOpenChange={setIsDeleteDialogOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle className="flex items-center">
                <AlertTriangle className="mr-2 h-5 w-5 text-destructive" />
                {t('confirmDeleteBookingTitle')}
            </AlertDialogTitle>
            <AlertDialogDescription>
              {t('confirmDeleteBookingMessage')}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel onClick={() => setBookingToDeleteId(null)}>{t('cancel')}</AlertDialogCancel>
            <AlertDialogAction
              onClick={confirmDeleteBooking}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
              disabled={deleteBookingMutation.isPending}
            >
              {deleteBookingMutation.isPending && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              {t('delete')}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
      
      {previewFileUrl && (
        <SignedAgreementPreviewDialog 
            isOpen={!!previewFileUrl}
            onClose={() => setPreviewFileUrl(null)}
            fileUrl={previewFileUrl}
            fileName={previewFileUrl.split('/').pop() || 'signed-agreement'}
        />
      )}
    </>
  );
}
