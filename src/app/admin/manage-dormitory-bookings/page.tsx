
"use client";

import React, { useState, useEffect, useCallback, useMemo } from 'react';
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Input } from "@/components/ui/input";
import { useLanguage } from "@/hooks/use-language";
import type { Booking } from "@/types";
import { Eye, Trash2, Filter, MoreHorizontal, Loader2, ChevronLeft, ChevronRight, AlertTriangle, CheckCircle, Phone } from "lucide-react";
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
import { collection, getDocs, doc, updateDoc, deleteDoc, Timestamp, query, where } from 'firebase/firestore';
import { useToast } from '@/hooks/use-toast';
import { useSimpleTable } from '@/hooks/use-simple-table';

type ApprovalStatusFilter = "all" | Booking['approvalStatus'];
type PaymentStatusFilter = "all" | Booking['paymentStatus'];

export default function AdminManageDormitoryBookingsPage() {
  const { t } = useLanguage();
  const { toast } = useToast();
  const [allBookings, setAllBookings] = useState<Booking[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [approvalFilter, setApprovalFilter] = useState<ApprovalStatusFilter>("all");
  const [paymentFilter, setPaymentFilter] = useState<PaymentStatusFilter>("all");
  const [isDeleteDialogOpen, setIsDeleteDialogOpen] = useState(false);
  const [bookingToDeleteId, setBookingToDeleteId] = useState<string | null>(null);

  const fetchBookings = useCallback(async () => {
    setIsLoading(true);
    try {
      const q = query(collection(db, "bookings"), where("bookingCategory", "==", "dormitory"));
      const querySnapshot = await getDocs(q);
      const bookingsData = querySnapshot.docs.map(docSnap => {
        const data = docSnap.data();
        return {
          id: docSnap.id,
          ...data,
          bookedAt: data.bookedAt instanceof Timestamp ? data.bookedAt.toDate().toISOString() : data.bookedAt,
          startDate: data.startDate instanceof Timestamp ? data.startDate.toDate().toISOString().split('T')[0] : data.startDate,
          endDate: data.endDate instanceof Timestamp ? data.endDate.toDate().toISOString().split('T')[0] : data.endDate,
        } as Booking;
      });
      setAllBookings(bookingsData.sort((a,b) => new Date(b.bookedAt as string).getTime() - new Date(a.bookedAt as string).getTime()));
    } catch (error) {
      console.error("Error fetching dormitory bookings: ", error);
      toast({ variant: "destructive", title: t('error'), description: t('errorFetchingBookings') });
    } finally {
      setIsLoading(false);
    }
  }, [t, toast]);

  useEffect(() => {
    fetchBookings();
  }, [fetchBookings]);

  const filteredBookings = useMemo(() => {
    return allBookings.filter(booking => {
      const approvalMatch = approvalFilter === "all" || booking.approvalStatus === approvalFilter;
      const paymentMatch = paymentFilter === "all" || booking.paymentStatus === paymentFilter;
      return approvalMatch && paymentMatch;
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
    setDataSource,
  } = useSimpleTable<Booking>({
      initialData: filteredBookings,
      rowsPerPage: 10,
      searchKeys: ['id', 'guestName', 'email', 'phone', 'payerBankName', 'payerAccountNumber'],
  });

  useEffect(() => {
    setDataSource(filteredBookings);
  }, [filteredBookings, setDataSource]);

  const handleApprovalChange = async (bookingId: string, newStatus: 'pending' | 'approved' | 'rejected') => {
    try {
      const bookingRef = doc(db, "bookings", bookingId);
      const updateData: Partial<Booking> = { approvalStatus: newStatus };
      await updateDoc(bookingRef, updateData);
      toast({ title: t('success'), description: t('bookingStatusUpdated') });
      fetchBookings();
    } catch (error) {
      console.error("Error updating booking status: ", error);
      toast({ variant: "destructive", title: t('error'), description: t('errorUpdatingBookingStatus') });
    }
  };

  const handlePaymentVerification = async (bookingId: string, newStatus: 'paid' | 'failed') => {
    try {
      const bookingRef = doc(db, "bookings", bookingId);
      await updateDoc(bookingRef, { paymentStatus: newStatus });
      toast({ title: t('success'), description: t('paymentStatusUpdated') });
      fetchBookings();
    } catch (error) {
      console.error("Error updating payment status: ", error);
      toast({ variant: "destructive", title: t('error'), description: t('errorUpdatingPaymentStatus') });
    }
  };

  const confirmDeleteBooking = async () => {
    if (!bookingToDeleteId) return;
    try {
      await deleteDoc(doc(db, "bookings", bookingToDeleteId));
      toast({ title: t('success'), description: t('bookingDeletedSuccessfully') });
      fetchBookings();
    } catch (error) {
      console.error("Error deleting booking: ", error);
      toast({ variant: "destructive", title: t('error'), description: t('errorDeletingBooking') });
    } finally {
      setIsDeleteDialogOpen(false);
      setBookingToDeleteId(null);
    }
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

  return (
    <>
      <div className="space-y-6">
        <div className="flex items-center justify-between">
          <h1 className="text-3xl font-bold text-foreground">{t('manageDormitoryBookings')}</h1>
          <div className="flex items-center space-x-2">
            <Input
              placeholder={t('searchDormitoryBookings')}
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
                {(['all', 'pending_transfer', 'awaiting_verification', 'paid', 'failed'] as PaymentStatusFilter[]).map(status => (
                  <DropdownMenuCheckboxItem key={status} checked={paymentFilter === status} onCheckedChange={() => setPaymentFilter(status)}>
                    {t(status)}
                  </DropdownMenuCheckboxItem>
                ))}
              </DropdownMenuContent>
            </DropdownMenu>
          </div>
        </div>

        {isLoading && <div className="flex justify-center items-center h-40"><Loader2 className="h-8 w-8 animate-spin" /></div>}

        {!isLoading && displayedBookings.length === 0 && (
          <Card>
            <CardContent className="pt-6 text-center">
              <p className="mb-4">{searchTerm || approvalFilter !== 'all' || paymentFilter !== 'all' ? t('noDormitoryBookingsMatchFilters') : t('noDormitoryBookingsFoundAdminCta')}</p>
            </CardContent>
          </Card>
        )}

        {!isLoading && displayedBookings.length > 0 && (
          <Card>
            <CardHeader>
              <CardTitle>{t('dormitoryBookingList')}</CardTitle>
              <CardDescription>{t('viewAndManageDormitoryBookings')}</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="overflow-x-auto">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>{t('bookingId')}</TableHead>
                      <TableHead>{t('guestName')}</TableHead>
                      <TableHead>{t('phone')}</TableHead>
                      <TableHead>{t('itemsBooked')}</TableHead>
                      <TableHead>{t('dates')}</TableHead>
                      <TableHead>{t('payerBankName')}</TableHead>
                      <TableHead>{t('payerAccountNumber')}</TableHead>
                      <TableHead>{t('totalCost')}</TableHead>
                      <TableHead>{t('paymentStatus')}</TableHead>
                      <TableHead>{t('approvalStatus')}</TableHead>
                      <TableHead className="text-right">{t('actions')}</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {displayedBookings.map((booking) => (
                      <TableRow key={booking.id}>
                        <TableCell className="font-mono text-xs whitespace-nowrap">{booking.id.substring(0,8)}...</TableCell>
                        <TableCell className="min-w-[150px]">{booking.guestName}{booking.userId && <span className="text-xs text-muted-foreground block whitespace-nowrap"> ({t('userIdAbbr')}: {booking.userId.substring(0,6)}...)</span>}</TableCell>
                        <TableCell className="whitespace-nowrap">{booking.phone || t('notProvided')}</TableCell>
                        <TableCell className="min-w-[150px]">{booking.items.map(item => item.name).join(', ')} ({booking.items.length})</TableCell>
                        <TableCell className="whitespace-nowrap">{new Date(booking.startDate as string).toLocaleDateString()} - {new Date(booking.endDate as string).toLocaleDateString()}</TableCell>
                        <TableCell className="whitespace-nowrap">{booking.payerBankName || t('notProvided')}</TableCell>
                        <TableCell className="whitespace-nowrap">{booking.payerAccountNumber || t('notProvided')}</TableCell>
                        <TableCell className="whitespace-nowrap">{booking.totalCost} {t('currencySymbol')}</TableCell>
                        <TableCell>{getPaymentStatusBadge(booking.paymentStatus)}</TableCell>
                        <TableCell>{getApprovalStatusBadge(booking.approvalStatus)}</TableCell>
                        <TableCell className="text-right space-x-1">
                          <Button variant="ghost" size="icon" title={t('viewDetails')}>
                            <Eye className="h-4 w-4" />
                            <span className="sr-only">{t('viewDetails')}</span>
                          </Button>
                          <DropdownMenu>
                              <DropdownMenuTrigger asChild>
                                  <Button variant="ghost" size="icon" title={t('moreActions')}>
                                      <MoreHorizontal className="h-4 w-4" />
                                      <span className="sr-only">{t('moreActions')}</span>
                                  </Button>
                              </DropdownMenuTrigger>
                              <DropdownMenuContent align="end">
                                  <DropdownMenuLabel>{t('setApprovalStatus')}</DropdownMenuLabel>
                                  <DropdownMenuSeparator />
                                  <DropdownMenuItem onClick={() => handleApprovalChange(booking.id, 'approved')} disabled={booking.approvalStatus === 'approved'}>
                                      <CheckCircle className="mr-2 h-4 w-4" /> {t('approveBooking')}
                                  </DropdownMenuItem>
                                  <DropdownMenuItem onClick={() => handleApprovalChange(booking.id, 'pending')} disabled={booking.approvalStatus === 'pending'}>
                                      {t('setAsPending')}
                                  </DropdownMenuItem>
                                  <DropdownMenuItem onClick={() => handleApprovalChange(booking.id, 'rejected')} disabled={booking.approvalStatus === 'rejected'} className="text-destructive focus:bg-destructive focus:text-destructive-foreground">
                                      {t('rejectBooking')}
                                  </DropdownMenuItem>

                                  {booking.paymentStatus === 'awaiting_verification' && (
                                    <>
                                      <DropdownMenuSeparator />
                                      <DropdownMenuLabel>{t('paymentVerification')}</DropdownMenuLabel>
                                      <DropdownMenuSeparator />
                                      <DropdownMenuItem>
                                        <div className='flex items-center text-xs text-muted-foreground'>
                                            <Phone className="mr-2 h-3 w-3" /> {t('verifyOnTelegramUsing')}: {booking.phone || t('notProvided')}
                                        </div>
                                      </DropdownMenuItem>
                                      <DropdownMenuItem onClick={() => handlePaymentVerification(booking.id, 'paid')} className="text-green-600 focus:bg-green-100 focus:text-green-700">
                                        <CheckCircle className="mr-2 h-4 w-4" /> {t('markAsPaid')}
                                      </DropdownMenuItem>
                                      <DropdownMenuItem onClick={() => handlePaymentVerification(booking.id, 'failed')} className="text-destructive focus:bg-destructive focus:text-destructive-foreground">
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
            >
              {t('delete')}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
}
