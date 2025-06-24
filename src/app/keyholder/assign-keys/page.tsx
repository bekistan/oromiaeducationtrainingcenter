
"use client";

import React, { useState, useEffect, useCallback } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { useLanguage } from "@/hooks/use-language";
import { useAuth } from '@/hooks/use-auth';
import type { Booking, KeyStatus } from "@/types";
import { KeyRound, CheckCircle, RotateCcw, Loader2, Search, ShieldAlert, ChevronLeft, ChevronRight } from "lucide-react";
import { db } from '@/lib/firebase'; 
import { collection, getDocs, query, where, doc, updateDoc, Timestamp } from 'firebase/firestore';
import { useToast } from '@/hooks/use-toast';
import { useRouter } from 'next/navigation';
import { useSimpleTable } from '@/hooks/use-simple-table';
import { formatDualDate, toDateObject } from '@/lib/date-utils';

export default function KeyholderAssignKeysPage() {
  const { t } = useLanguage();
  const { user, loading: authLoading } = useAuth();
  const router = useRouter();
  const { toast } = useToast();
  const [allPaidBookings, setAllPaidBookings] = useState<Booking[]>([]);
  const [isLoadingBookings, setIsLoadingBookings] = useState(true);
  const [isUpdatingKeyStatus, setIsUpdatingKeyStatus] = useState<string | null>(null);

  const fetchPaidDormitoryBookings = useCallback(async () => {
    setIsLoadingBookings(true);
    try {
      const q = query(
        collection(db, "bookings"), 
        where("bookingCategory", "==", "dormitory"),
        where("paymentStatus", "==", "paid"),
        where("approvalStatus", "==", "approved")
      );
      const querySnapshot = await getDocs(q);
      
      const today = new Date();
      today.setHours(0, 0, 0, 0);

      const bookingsData = querySnapshot.docs
        .map(docSnap => {
          const data = docSnap.data();
          return {
            id: docSnap.id,
            ...data,
            bookedAt: data.bookedAt instanceof Timestamp ? data.bookedAt.toDate().toISOString() : data.bookedAt,
            startDate: data.startDate instanceof Timestamp ? data.startDate.toDate().toISOString().split('T')[0] : data.startDate,
            endDate: data.endDate instanceof Timestamp ? data.endDate.toDate().toISOString().split('T')[0] : data.endDate,
          } as Booking;
        })
        .filter(booking => {
            const bookingEndDate = toDateObject(booking.endDate);
            if (!bookingEndDate) return false;
            bookingEndDate.setHours(23, 59, 59, 999);
            return bookingEndDate >= today; 
        })
        .sort((a,b) => {
            const dateA = toDateObject(a.startDate);
            const dateB = toDateObject(b.startDate);
            if (!dateA || !dateB) return 0;
            return dateA.getTime() - dateB.getTime(); 
        });

      setAllPaidBookings(bookingsData);
    } catch (error) {
      console.error("Error fetching paid dormitory bookings: ", error);
      toast({ variant: "destructive", title: t('error'), description: t('errorFetchingDormBookingsForKeyholder') });
    } finally {
      setIsLoadingBookings(false);
    }
  }, [t, toast]);

  useEffect(() => {
    if (user?.role === 'keyholder') {
      fetchPaidDormitoryBookings();
    } else if (!authLoading) {
      setIsLoadingBookings(false); 
    }
  }, [user, authLoading, fetchPaidDormitoryBookings]);

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
      data: allPaidBookings,
      rowsPerPage: 10,
      searchKeys: ['guestName', 'phone', 'id'], 
  });

  const handleKeyStatusChange = async (bookingId: string, newStatus: KeyStatus) => {
    setIsUpdatingKeyStatus(bookingId);
    try {
      const bookingRef = doc(db, "bookings", bookingId);
      await updateDoc(bookingRef, { keyStatus: newStatus });
      toast({ title: t('success'), description: t('keyStatusUpdatedTo', { status: t(newStatus) }) });
      fetchPaidDormitoryBookings(); 
    } catch (error) {
      console.error("Error updating key status: ", error);
      toast({ variant: "destructive", title: t('error'), description: t('failedToUpdateKeyStatus') });
    } finally {
      setIsUpdatingKeyStatus(null);
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

  if (authLoading) {
    return <div className="flex justify-center items-center h-screen"><Loader2 className="h-8 w-8 animate-spin text-primary" /><p className="ml-2">{t('loading')}...</p></div>;
  }

  if (user?.role !== 'keyholder') {
    return (
      <div className="flex flex-col items-center justify-center h-screen text-center p-4">
        <ShieldAlert className="w-16 h-16 text-destructive mb-4" />
        <h1 className="text-2xl font-bold text-destructive mb-2">{t('accessDenied')}</h1>
        <p className="text-muted-foreground">{t('keyholderOnlyPage')}</p>
        <Button onClick={() => router.push('/auth/login')} className="mt-4">{t('login')}</Button>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <h1 className="text-3xl font-bold text-foreground">{t('assignDormitoryKeys')}</h1>
      <Input
        placeholder={t('searchByNamePhoneId')}
        value={searchTerm}
        onChange={(e) => setSearchTerm(e.target.value)}
        className="max-w-sm"
      />

      {isLoadingBookings && <div className="flex justify-center items-center h-40"><Loader2 className="h-8 w-8 animate-spin" /></div>}
      
      {!isLoadingBookings && displayedBookings.length === 0 && (
        <Card>
          <CardContent className="pt-6 text-center">
            <p>{searchTerm ? t('noBookingsMatchKeyholderSearch') : t('noPaidDormBookingsForKeyAssignment')}</p>
          </CardContent>
        </Card>
      )}

      {!isLoadingBookings && displayedBookings.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle>{t('paidDormitoryBookingsList')}</CardTitle>
            <CardDescription>{t('manageKeyAssignmentsForGuests')}</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>{t('guestName')}</TableHead>
                    <TableHead>{t('phone')}</TableHead>
                    <TableHead>{t('roomBooked')}</TableHead>
                    <TableHead>{t('bookedAt')}</TableHead>
                    <TableHead>{t('bookingDates')}</TableHead>
                    <TableHead>{t('keyStatus')}</TableHead>
                    <TableHead className="text-right">{t('actions')}</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {displayedBookings.map((booking) => (
                    <TableRow key={booking.id}>
                      <TableCell className="font-medium">{booking.guestName || t('notAvailable')}</TableCell>
                      <TableCell>{booking.phone || t('notAvailable')}</TableCell>
                      <TableCell>{booking.items.map(item => item.name).join(', ')}</TableCell>
                      <TableCell className="text-xs">{formatDualDate(booking.bookedAt, 'MMM d, yy HH:mm', 'MMM D, YY HH:mm')}</TableCell>
                      <TableCell className="text-xs">{formatDualDate(booking.startDate, 'MMM d, yy', 'MMM D, YY')} - {formatDualDate(booking.endDate, 'MMM d, yy', 'MMM D, YY')}</TableCell>
                      <TableCell>{getKeyStatusBadge(booking.keyStatus)}</TableCell>
                      <TableCell className="text-right space-x-2">
                        <Button 
                          variant="outline" 
                          size="sm" 
                          onClick={() => handleKeyStatusChange(booking.id, 'issued')}
                          disabled={isUpdatingKeyStatus === booking.id || booking.keyStatus === 'issued'}
                          className="text-green-600 border-green-600 hover:bg-green-50 hover:text-green-700"
                        >
                          {isUpdatingKeyStatus === booking.id && booking.keyStatus !== 'issued' ? <Loader2 className="mr-1 h-4 w-4 animate-spin" /> : <KeyRound className="mr-1 h-4 w-4" />}
                          {t('issueKey')}
                        </Button>
                        <Button 
                          variant="outline" 
                          size="sm" 
                          onClick={() => handleKeyStatusChange(booking.id, 'returned')}
                          disabled={isUpdatingKeyStatus === booking.id || booking.keyStatus === 'returned' || booking.keyStatus === 'not_issued'}
                          className="text-blue-600 border-blue-600 hover:bg-blue-50 hover:text-blue-700"
                        >
                          {isUpdatingKeyStatus === booking.id && booking.keyStatus !== 'returned' ? <Loader2 className="mr-1 h-4 w-4 animate-spin" /> : <RotateCcw className="mr-1 h-4 w-4" />}
                          {t('markReturned')}
                        </Button>
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
  );
}
