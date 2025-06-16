
"use client";

import React, { useState, useEffect, useCallback, useMemo } from 'react';
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Input } from "@/components/ui/input";
import { useLanguage } from "@/hooks/use-language";
import { useAuth } from '@/hooks/use-auth';
import type { Booking, Dormitory, KeyStatus } from "@/types";
import { Trash2, Filter, MoreHorizontal, Loader2, ChevronLeft, ChevronRight, AlertTriangle, CheckCircle, Phone, ArrowUpDown, KeyRound } from "lucide-react";
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
import { collection, getDocs, doc, updateDoc, deleteDoc, Timestamp, query, where, orderBy } from 'firebase/firestore';
import { useToast } from '@/hooks/use-toast';
import { useSimpleTable } from '@/hooks/use-simple-table';
import { useQuery, useMutation, useQueryClient, type QueryClient } from '@tanstack/react-query';

type ApprovalStatusFilter = "all" | Booking['approvalStatus'];
type PaymentStatusFilter = "all" | Booking['paymentStatus'];

const DORMITORY_BOOKINGS_QUERY_KEY = "dormitoryBookings";
const ALL_DORMITORIES_QUERY_KEY_FOR_FILTERING = "allDormitoriesForBookingFiltering";

const fetchAllDormitoriesForFiltering = async (): Promise<Dormitory[]> => {
  const querySnapshot = await getDocs(collection(db, "dormitories"));
  return querySnapshot.docs.map(docSnap => ({ id: docSnap.id, ...docSnap.data() } as Dormitory));
};

const fetchDormitoryBookingsFromDb = async (): Promise<Booking[]> => {
  const q = query(collection(db, "bookings"), where("bookingCategory", "==", "dormitory"), orderBy("bookedAt", "desc"));
  const querySnapshot = await getDocs(q);
  return querySnapshot.docs.map(docSnap => {
    const data = docSnap.data();
    return {
      id: docSnap.id,
      ...data,
      bookedAt: data.bookedAt instanceof Timestamp ? data.bookedAt.toDate().toISOString() : data.bookedAt,
      startDate: data.startDate instanceof Timestamp ? data.startDate.toDate().toISOString().split('T')[0] : data.startDate,
      endDate: data.endDate instanceof Timestamp ? data.endDate.toDate().toISOString().split('T')[0] : data.endDate,
    } as Booking;
  });
};

export default function AdminManageDormitoryBookingsPage() {
  const { t } = useLanguage();
  const { user } = useAuth();
  const { toast } = useToast();
  const queryClient: QueryClient = useQueryClient();

  const [approvalFilter, setApprovalFilter] = useState<ApprovalStatusFilter>("all");
  const [paymentFilter, setPaymentFilter] = useState<PaymentStatusFilter>("all");
  const [isDeleteDialogOpen, setIsDeleteDialogOpen] = useState(false);
  const [bookingToDeleteId, setBookingToDeleteId] = useState<string | null>(null);

  const { data: allDormitories, isLoading: isLoadingDormsForFilter } = useQuery<Dormitory[], Error>({
    queryKey: [ALL_DORMITORIES_QUERY_KEY_FOR_FILTERING],
    queryFn: fetchAllDormitoriesForFiltering,
  });

  const dormIdToBuildingMap = useMemo(() => {
    if (!allDormitories) return new Map<string, string>();
    return new Map(allDormitories.map(dorm => [dorm.id, dorm.buildingName]));
  }, [allDormitories]);

  const { data: allBookingsFromDb = [], isLoading: isLoadingBookings, error: bookingsError } = useQuery<Booking[], Error>({
    queryKey: [DORMITORY_BOOKINGS_QUERY_KEY],
    queryFn: fetchDormitoryBookingsFromDb,
  });

  const updateBookingMutation = useMutation<void, Error, { bookingId: string; updateData: Partial<Booking>; successMessageKey: string }>({
    mutationFn: async ({ bookingId, updateData }) => {
      const bookingRef = doc(db, "bookings", bookingId);
      await updateDoc(bookingRef, updateData);
    },
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: [DORMITORY_BOOKINGS_QUERY_KEY] });
      toast({ title: t('success'), description: t(variables.successMessageKey) });
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
      queryClient.invalidateQueries({ queryKey: [DORMITORY_BOOKINGS_QUERY_KEY] });
      toast({ title: t('success'), description: t('bookingDeletedSuccessfully') });
      setIsDeleteDialogOpen(false);
      setBookingToDeleteId(null);
    },
    onError: (error) => {
      toast({ variant: "destructive", title: t('error'), description: error.message || t('errorDeletingBooking') });
    },
  });

  const filteredBookingsForAdmin = useMemo(() => {
    if (isLoadingDormsForFilter || !user || !allBookingsFromDb) return [];
    let bookingsToFilter = allBookingsFromDb;

    if (user.role === 'admin' && user.buildingAssignment) {
      bookingsToFilter = allBookingsFromDb.filter(booking => {
        const firstItemId = booking.items[0]?.id;
        if (!firstItemId) return false;
        const buildingOfBooking = dormIdToBuildingMap.get(firstItemId);
        return buildingOfBooking === user.buildingAssignment;
      });
    }
    // Superadmin sees all, no building filter needed for them.

    return bookingsToFilter.filter(booking => {
      const approvalMatch = approvalFilter === "all" || booking.approvalStatus === approvalFilter;
      const paymentMatch = paymentFilter === "all" || booking.paymentStatus === paymentFilter;
      return approvalMatch && paymentMatch;
    });
  }, [allBookingsFromDb, approvalFilter, paymentFilter, user, dormIdToBuildingMap, isLoadingDormsForFilter]);

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
      data: filteredBookingsForAdmin,
      rowsPerPage: 10,
      searchKeys: ['id', 'guestName', 'email', 'phone', 'payerBankName', 'payerAccountNumber'],
      initialSort: { key: 'bookedAt', direction: 'descending' },
  });


  const getSortIndicator = (columnKey: keyof Booking | 'keyStatus') => {
    if (sortConfig?.key === columnKey) {
      return sortConfig.direction === 'ascending' ? ' ▲' : ' ▼';
    }
    return <ArrowUpDown className="ml-1 h-3 w-3 inline opacity-50 group-hover:opacity-100" />;
  };

  const handlePaymentVerification = (bookingId: string, newPaymentStatus: 'paid' | 'failed') => {
    const updateData: Partial<Booking> = { paymentStatus: newPaymentStatus };
    if (newPaymentStatus === 'paid') {
      updateData.approvalStatus = 'approved';
    } else {
      updateData.approvalStatus = 'rejected';
    }
    updateBookingMutation.mutate({ bookingId, updateData, successMessageKey: 'paymentStatusUpdated' });
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

  const getKeyStatusBadge = (status?: KeyStatus) => {
    if (!status || status === 'not_issued') {
      return <Badge variant="outline" className="border-amber-500 text-amber-600">{t('keyNotIssued')}</Badge>;
    }
    switch (status) {
      case 'issued':
        return <Badge className="bg-green-100 text-green-700 border-green-300">{t('keyIssued')}</Badge>;
      case 'returned':
        return <Badge className="bg-blue-100 text-blue-700 border-blue-300">{t('keyReturned')}</Badge>;
      default:
        return <Badge variant="secondary">{t(status)}</Badge>;
    }
  };


  if (bookingsError) {
    return <div className="flex flex-col items-center justify-center min-h-screen p-4"><AlertTriangle className="h-12 w-12 text-destructive mb-4" /><p className="text-lg text-destructive">{t('errorFetchingBookings')}: {bookingsError.message}</p></div>;
  }

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
                {(['all', 'pending', 'pending_transfer', 'awaiting_verification', 'paid', 'failed'] as PaymentStatusFilter[]).map(status => (
                  <DropdownMenuCheckboxItem key={status} checked={paymentFilter === status} onCheckedChange={() => setPaymentFilter(status)}>
                    {t(status)}
                  </DropdownMenuCheckboxItem>
                ))}
              </DropdownMenuContent>
            </DropdownMenu>
          </div>
        </div>

        {(isLoadingBookings || isLoadingDormsForFilter) && <div className="flex justify-center items-center h-40"><Loader2 className="h-8 w-8 animate-spin" /></div>}

        {!(isLoadingBookings || isLoadingDormsForFilter) && displayedBookings.length === 0 && (
          <Card>
            <CardContent className="pt-6 text-center">
              <p className="mb-4">{searchTerm || approvalFilter !== 'all' || paymentFilter !== 'all' ? t('noDormitoryBookingsMatchFilters') : (user?.role === 'admin' && !user.buildingAssignment) ? t('adminNoBuildingAssignmentDormBookings') : t('noDormitoryBookingsFoundAdminCta')}</p>
            </CardContent>
          </Card>
        )}

        {!(isLoadingBookings || isLoadingDormsForFilter) && displayedBookings.length > 0 && (
          <Card>
            <CardHeader>
              <div className="flex items-center justify-between">
                <CardTitle>{t('dormitoryBookingList')}</CardTitle>
                {(updateBookingMutation.isPending || deleteBookingMutation.isPending) && <Loader2 className="h-5 w-5 animate-spin text-primary" />}
              </div>
              <CardDescription>{t('viewAndManageDormitoryBookings')}</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="overflow-x-auto">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead onClick={() => requestSort('id')} className="cursor-pointer group">{t('bookingId')}{getSortIndicator('id')}</TableHead>
                      <TableHead onClick={() => requestSort('guestName')} className="cursor-pointer group">{t('guestName')}{getSortIndicator('guestName')}</TableHead>
                      <TableHead onClick={() => requestSort('phone')} className="cursor-pointer group">{t('phone')}{getSortIndicator('phone')}</TableHead>
                      <TableHead>{t('itemsBooked')}</TableHead>
                      <TableHead onClick={() => requestSort('startDate')} className="cursor-pointer group">{t('dates')}{getSortIndicator('startDate')}</TableHead>
                      <TableHead onClick={() => requestSort('payerBankName')} className="cursor-pointer group">{t('payerBankName')}{getSortIndicator('payerBankName')}</TableHead>
                      <TableHead onClick={() => requestSort('payerAccountNumber')} className="cursor-pointer group">{t('payerAccountNumber')}{getSortIndicator('payerAccountNumber')}</TableHead>
                      <TableHead onClick={() => requestSort('totalCost')} className="cursor-pointer group">{t('totalCost')}{getSortIndicator('totalCost')}</TableHead>
                      <TableHead onClick={() => requestSort('paymentStatus')} className="cursor-pointer group">{t('paymentStatus')}{getSortIndicator('paymentStatus')}</TableHead>
                      <TableHead onClick={() => requestSort('approvalStatus')} className="cursor-pointer group">{t('approvalStatus')}{getSortIndicator('approvalStatus')}</TableHead>
                      <TableHead onClick={() => requestSort('keyStatus' as any)} className="cursor-pointer group">{t('keyStatusColumn')}{getSortIndicator('keyStatus' as any)}</TableHead>
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
                        <TableCell>{getKeyStatusBadge(booking.keyStatus)}</TableCell>
                        <TableCell className="text-right space-x-1">
                          <DropdownMenu>
                              <DropdownMenuTrigger asChild>
                                  <Button variant="ghost" size="icon" title={t('moreActions')} disabled={updateBookingMutation.isPending || deleteBookingMutation.isPending}>
                                      <MoreHorizontal className="h-4 w-4" />
                                      <span className="sr-only">{t('moreActions')}</span>
                                  </Button>
                              </DropdownMenuTrigger>
                              <DropdownMenuContent align="end">
                                  {(booking.paymentStatus === 'awaiting_verification' || booking.paymentStatus === 'pending_transfer') && (
                                    <>
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
                                      <DropdownMenuSeparator />
                                    </>
                                  )}
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
    
