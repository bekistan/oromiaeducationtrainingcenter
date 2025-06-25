
"use client";

import React, { useState, useEffect, useMemo } from 'react';
import Link from 'next/link';
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Input } from "@/components/ui/input";
import { useLanguage } from "@/hooks/use-language";
import type { Booking, AgreementStatus } from "@/types";
import { Trash2, Filter, MoreHorizontal, Loader2, FileText, ChevronLeft, ChevronRight, Send, FileSignature, CheckCircle, AlertTriangle, ArrowUpDown, CreditCard, Phone, CalendarClock } from "lucide-react";
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
import { db } from '@/lib/firebase';
import { collection, getDocs, doc, updateDoc, deleteDoc, Timestamp, getDoc as getFirestoreDoc, query, orderBy } from 'firebase/firestore';
import { useToast } from '@/hooks/use-toast';
import { useSimpleTable } from '@/hooks/use-simple-table';
import { toDateObject, formatDualDate } from '@/lib/date-utils';
import { useQuery, useMutation, useQueryClient, type QueryClient } from '@tanstack/react-query';

type ApprovalStatusFilter = "all" | Booking['approvalStatus'];
type PaymentStatusFilter = "all" | Booking['paymentStatus'];

const BOOKINGS_QUERY_KEY = "bookings";

const DEFAULT_TERMS_KEYS = [
  'termsPlaceholder1',
  'termsPlaceholder2',
  'termsPlaceholder3',
  'termsPlaceholder4',
];

const fetchBookingsFromDb = async (): Promise<Booking[]> => {
  const q = query(collection(db, "bookings"), orderBy("bookedAt", "desc"));
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

export default function AdminBookingsPage() {
  const { t } = useLanguage();
  const { toast } = useToast();
  const queryClient: QueryClient = useQueryClient();

  const [approvalFilter, setApprovalFilter] = useState<ApprovalStatusFilter>("all");
  const [paymentFilter, setPaymentFilter] = useState<PaymentStatusFilter>("all");
  const [isDeleteDialogOpen, setIsDeleteDialogOpen] = useState(false);
  const [bookingToDeleteId, setBookingToDeleteId] = useState<string | null>(null);

  const { data: allBookings = [], isLoading: isLoadingBookings, error: bookingsError } = useQuery<Booking[], Error>({
    queryKey: [BOOKINGS_QUERY_KEY],
    queryFn: fetchBookingsFromDb,
  });

  const updateBookingMutation = useMutation<void, Error, { bookingId: string; updateData: Partial<Booking>; successMessage: string }>({
    mutationFn: async ({ bookingId, updateData }) => {
      const bookingRef = doc(db, "bookings", bookingId);
      await updateDoc(bookingRef, updateData);
    },
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: [BOOKINGS_QUERY_KEY] });
      toast({ title: t('success'), description: variables.successMessage });
    },
    onError: (error) => {
      toast({ variant: "destructive", title: t('error'), description: error.message || t('errorUpdatingBookingStatus') });
    },
  });

  const deleteBookingMutation = useMutation<void, Error, string>({
    mutationFn: async (bookingId) => {
      await deleteDoc(doc(db, "bookings", bookingId));
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: [BOOKINGS_QUERY_KEY] });
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

    return allBookings.filter(booking => {
      const approvalMatch = approvalFilter === "all" || booking.approvalStatus === approvalFilter;
      const paymentMatch = paymentFilter === "all" || booking.paymentStatus === paymentFilter;
      
      const bookingEndDate = toDateObject(booking.endDate);
      if (!bookingEndDate) return false; 
      bookingEndDate.setHours(23, 59, 59, 999); 

      const isActiveBooking = bookingEndDate >= today;

      return approvalMatch && paymentMatch && isActiveBooking;
    });
  }, [allBookings, approvalFilter, paymentFilter]);

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
      searchKeys: ['id', 'guestName', 'companyName', 'bookingCategory', 'email', 'phone'], // ID kept for searchability
      initialSort: { key: 'bookedAt', direction: 'descending' },
  });

  const getSortIndicator = (columnKey: keyof Booking | 'bookedAt') => {
    if (sortConfig?.key === columnKey) {
      return sortConfig.direction === 'ascending' ? ' ▲' : ' ▼';
    }
    return <ArrowUpDown className="ml-1 h-3 w-3 inline opacity-50 group-hover:opacity-100" />;
  };

  const handleApprovalChange = (bookingId: string, newStatus: 'pending' | 'approved' | 'rejected') => {
    const currentBooking = allBookings.find(b => b.id === bookingId);
    const updateData: Partial<Booking> = { approvalStatus: newStatus };

    if (newStatus === 'approved' && currentBooking?.bookingCategory === 'facility') {
      updateData.agreementStatus = 'pending_admin_action';
      const defaultTerms = DEFAULT_TERMS_KEYS.map(key => t(key)).join('\n\n');
      updateData.customAgreementTerms = defaultTerms;
    } else if (newStatus === 'rejected' && currentBooking?.bookingCategory === 'facility') {
      updateData.paymentStatus = 'failed';
    } else if (newStatus === 'rejected' && currentBooking?.bookingCategory === 'dormitory') {
       updateData.paymentStatus = 'failed'; 
    }
    updateBookingMutation.mutate({ bookingId, updateData, successMessage: t('bookingStatusUpdated') });
  };

  const handleDormitoryPaymentVerification = (bookingId: string, newPaymentStatus: 'paid' | 'failed') => {
    const updateData: Partial<Booking> = { paymentStatus: newPaymentStatus };
    if (newPaymentStatus === 'paid') {
      updateData.approvalStatus = 'approved';
    } else { 
      updateData.approvalStatus = 'rejected';
    }
    updateBookingMutation.mutate({ bookingId, updateData, successMessage: t('paymentStatusUpdated') });
  };
  
  const handleFacilityPaymentStatusChange = async (bookingId: string, newPaymentStatus: 'paid') => {
    const bookingRef = doc(db, "bookings", bookingId);
    const bookingSnap = await getFirestoreDoc(bookingRef); 
    if (!bookingSnap.exists()) {
      toast({ variant: "destructive", title: t('error'), description: t('bookingNotFound') });
      return;
    }
    const currentBooking = bookingSnap.data() as Booking;
    const updateData: Partial<Booking> = { paymentStatus: newPaymentStatus };

    let newApprovalStatus = currentBooking.approvalStatus;
    if (currentBooking.approvalStatus === 'pending') {
      updateData.approvalStatus = 'approved';
      newApprovalStatus = 'approved';
    }
    
    if (newApprovalStatus === 'approved' && currentBooking.bookingCategory === 'facility') {
      const agreementPrecedence: AgreementStatus[] = ['pending_admin_action', 'sent_to_client', 'signed_by_client', 'completed'];
      const currentAgreementIndex = currentBooking.agreementStatus ? agreementPrecedence.indexOf(currentBooking.agreementStatus) : -1;
      if (currentAgreementIndex < agreementPrecedence.indexOf('pending_admin_action')) {
          updateData.agreementStatus = 'pending_admin_action';
      }
    }
    updateBookingMutation.mutate({ bookingId, updateData, successMessage: t('paymentStatusMarkedAsPaid') });
  };

  const handleAgreementStatusChange = (bookingId: string, newStatus: AgreementStatus) => {
    const updateData: Partial<Booking> = { agreementStatus: newStatus };
    if (newStatus === 'sent_to_client') {
      updateData.agreementSentAt = Timestamp.now();
    } else if (newStatus === 'signed_by_client') {
      updateData.agreementSignedAt = Timestamp.now(); 
    }
    updateBookingMutation.mutate({ bookingId, updateData, successMessage: t('agreementStatusUpdated') });
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
      case 'pending_transfer':
        return <Badge className="bg-amber-100 text-amber-700 border-amber-300 hover:bg-amber-200">{t(status)}</Badge>;
      case 'awaiting_verification':
        return <Badge className="bg-sky-100 text-sky-700 border-sky-300 hover:bg-sky-200">{t(status)}</Badge>;
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
      <div className="space-y-6">
        <div className="flex items-center justify-between">
          <h1 className="text-3xl font-bold text-foreground">{t('manageBookings')}</h1>
          <div className="flex items-center space-x-2">
            <Input
              placeholder={t('searchBookings')}
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
                {(['all', 'pending', 'pending_transfer', 'awaiting_verification', 'paid', 'failed'] as PaymentStatusFilter[]).map(status => (
                  <DropdownMenuCheckboxItem key={status} checked={paymentFilter === status} onCheckedChange={() => setPaymentFilter(status)}>
                    {t(status)}
                  </DropdownMenuCheckboxItem>
                ))}
              </DropdownMenuContent>
            </DropdownMenu>
          </div>
        </div>

        {isLoadingBookings && <div className="flex justify-center items-center h-40"><Loader2 className="h-8 w-8 animate-spin" /></div>}

        {!isLoadingBookings && displayedBookings.length === 0 && (
          <Card>
            <CardContent className="pt-6 text-center">
              <p className="mb-4">{searchTerm || approvalFilter !== 'all' || paymentFilter !== 'all' ? t('noBookingsMatchFilters') : t('noActiveBookingsFoundAdmin')}</p>
            </CardContent>
          </Card>
        )}

        {!isLoadingBookings && displayedBookings.length > 0 && (
          <Card>
            <CardHeader>
              <div className="flex items-center justify-between">
                <CardTitle>{t('activeBookingList')}</CardTitle>
                 {(updateBookingMutation.isPending || deleteBookingMutation.isPending) && <Loader2 className="h-5 w-5 animate-spin text-primary" />}
              </div>
              <CardDescription>{t('viewAndManageActiveBookings')}</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="overflow-x-auto">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead onClick={() => requestSort('bookedAt')} className="cursor-pointer group"><CalendarClock className="mr-1 h-4 w-4 inline-block"/>{t('bookedAt')}{getSortIndicator('bookedAt')}</TableHead>
                      <TableHead onClick={() => requestSort('bookingCategory')} className="cursor-pointer group">{t('category')}{getSortIndicator('bookingCategory')}</TableHead>
                      <TableHead>{t('itemsBooked')}</TableHead>
                      <TableHead onClick={() => requestSort('guestName')} className="cursor-pointer group">{t('customer')}{getSortIndicator('guestName')}</TableHead>
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
                        <TableCell className="text-xs whitespace-nowrap">{formatDualDate(booking.bookedAt, 'MMM d, yy HH:mm', 'MMM D, YY HH:mm')}</TableCell>
                        <TableCell className="capitalize whitespace-nowrap">{t(booking.bookingCategory)}</TableCell>
                        <TableCell className="min-w-[150px]">{booking.items.map(item => item.name).join(', ')} ({booking.items.length})</TableCell>
                        <TableCell className="min-w-[150px]">{booking.bookingCategory === 'dormitory' ? booking.guestName : booking.companyName}{booking.userId && <span className="text-xs text-muted-foreground block whitespace-nowrap"> ({t('userIdAbbr')}: {booking.userId ? booking.userId.substring(0,6) : 'N/A'}...)</span>}</TableCell>
                        <TableCell className="whitespace-nowrap text-xs">
                          {formatDualDate(booking.startDate, 'MMM d, yy', 'MMM D, YY')} - {formatDualDate(booking.endDate, 'MMM d, yy', 'MMM D, YY')}
                        </TableCell>
                        <TableCell className="whitespace-nowrap">{booking.totalCost} {t('currencySymbol')}</TableCell>
                        <TableCell>{getPaymentStatusBadge(booking.paymentStatus)}</TableCell>
                        <TableCell>{getApprovalStatusBadge(booking.approvalStatus)}</TableCell>
                        <TableCell>{booking.bookingCategory === 'facility' ? getAgreementStatusBadge(booking.agreementStatus) : getAgreementStatusBadge()}</TableCell>
                        <TableCell className="text-right space-x-1">
                          <DropdownMenu>
                              <DropdownMenuTrigger asChild>
                                  <Button variant="ghost" size="icon" title={t('moreActions')} disabled={updateBookingMutation.isPending || deleteBookingMutation.isPending}>
                                      <MoreHorizontal className="h-4 w-4" />
                                      <span className="sr-only">{t('moreActions')}</span>
                                  </Button>
                              </DropdownMenuTrigger>
                              <DropdownMenuContent align="end">
                                  {booking.bookingCategory === 'facility' && (
                                    <>
                                      <DropdownMenuLabel>{t('setApprovalStatus')}</DropdownMenuLabel>
                                      <DropdownMenuItem onClick={() => handleApprovalChange(booking.id, 'approved')} disabled={booking.approvalStatus === 'approved'}>
                                          <CheckCircle className="mr-2 h-4 w-4" /> {t('approveBooking')}
                                      </DropdownMenuItem>
                                      <DropdownMenuItem onClick={() => handleApprovalChange(booking.id, 'pending')} disabled={booking.approvalStatus === 'pending'}>
                                          {t('setAsPending')}
                                      </DropdownMenuItem>
                                      <DropdownMenuItem onClick={() => handleApprovalChange(booking.id, 'rejected')} disabled={booking.approvalStatus === 'rejected'} className="text-destructive focus:bg-destructive focus:text-destructive-foreground">
                                          {t('rejectBooking')}
                                      </DropdownMenuItem>
                                      <DropdownMenuSeparator />
                                      <DropdownMenuLabel>{t('paymentActions')}</DropdownMenuLabel>
                                      <DropdownMenuItem onClick={() => handleFacilityPaymentStatusChange(booking.id, 'paid')} disabled={booking.paymentStatus === 'paid'}>
                                          <CreditCard className="mr-2 h-4 w-4" /> {t('markAsPaid')}
                                      </DropdownMenuItem>
                                      <DropdownMenuSeparator />
                                      <DropdownMenuLabel>{t('agreementActions')}</DropdownMenuLabel>
                                      <DropdownMenuItem asChild>
                                        <Link href={`/admin/bookings/${booking.id}/agreement`} target="_blank" rel="noopener noreferrer">
                                          <FileText className="mr-2 h-4 w-4" /> {t('viewAgreement')}
                                        </Link>
                                      </DropdownMenuItem>
                                      <DropdownMenuItem
                                        onClick={() => handleAgreementStatusChange(booking.id, 'sent_to_client')}
                                        disabled={!(!booking.agreementStatus || booking.agreementStatus === 'pending_admin_action')}
                                      >
                                        <Send className="mr-2 h-4 w-4" /> {t('markAgreementSent')}
                                      </DropdownMenuItem>
                                      <DropdownMenuItem
                                        onClick={() => handleAgreementStatusChange(booking.id, 'signed_by_client')}
                                        disabled={booking.agreementStatus !== 'sent_to_client'}
                                      >
                                        <FileSignature className="mr-2 h-4 w-4" /> {t('confirmAgreementSigned')}
                                      </DropdownMenuItem>
                                       <DropdownMenuItem
                                        onClick={() => handleAgreementStatusChange(booking.id, 'completed')}
                                        disabled={booking.agreementStatus !== 'signed_by_client'}
                                      >
                                        <CheckCircle className="mr-2 h-4 w-4" /> {t('markAgreementCompleted')}
                                      </DropdownMenuItem>
                                    </>
                                  )}

                                  {booking.bookingCategory === 'dormitory' && (booking.paymentStatus === 'awaiting_verification' || booking.paymentStatus === 'pending_transfer') && (
                                    <>
                                      <DropdownMenuLabel>{t('paymentVerification')}</DropdownMenuLabel>
                                      <DropdownMenuItem>
                                        <div className='flex items-center text-xs text-muted-foreground'>
                                            <Phone className="mr-2 h-3 w-3" /> {t('verifyOnTelegramUsing')}: {booking.phone || t('notProvided')}
                                        </div>
                                      </DropdownMenuItem>
                                      <DropdownMenuItem onClick={() => handleDormitoryPaymentVerification(booking.id, 'paid')} className="text-green-600 focus:bg-green-100 focus:text-green-700">
                                        <CheckCircle className="mr-2 h-4 w-4" /> {t('markAsPaid')}
                                      </DropdownMenuItem>
                                      <DropdownMenuItem onClick={() => handleDormitoryPaymentVerification(booking.id, 'failed')} className="text-destructive focus:bg-destructive focus:text-destructive-foreground">
                                        <AlertTriangle className="mr-2 h-4 w-4" /> {t('rejectPayment')}
                                      </DropdownMenuItem>
                                    </>
                                  )}

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
              </div>
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
      </div>

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
    </>
  );
}
