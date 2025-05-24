
"use client";

import React, { useState, useEffect, useCallback } from 'react';
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { useLanguage } from "@/hooks/use-language";
import type { Booking } from "@/types";
import { Eye, Edit, Trash2, Filter, MoreHorizontal, Loader2 } from "lucide-react";
import { Badge } from "@/components/ui/badge";
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
import { collection, getDocs, doc, updateDoc, deleteDoc, Timestamp, writeBatch } from 'firebase/firestore';
import { useToast } from '@/hooks/use-toast';

// Placeholder data for seeding
const sampleBookingsForSeed: Omit<Booking, 'id' | 'bookedAt' | 'startDate' | 'endDate'>[] & { startDate: string; endDate: string }[] = [
  { 
    bookingCategory: "dormitory", 
    items: [{ id: "d001_seeded", name: "Room 101A (Seeded)", itemType: "dormitory" }], 
    guestName: "John Doe (Seeded)", 
    startDate: "2024-08-01", 
    endDate: "2024-08-05", 
    totalCost: 2000, 
    paymentStatus: "paid", 
    approvalStatus: "approved", 
    userId: "indUser456_seeded" 
  },
  { 
    bookingCategory: "facility", 
    items: [{ id: "h001_seeded", name: "Grand Meeting Hall A (Seeded)", itemType: "hall" }], 
    companyName: "Tech Solutions Inc. (Seeded)", 
    contactPerson: "Jane Smith (Rep)",
    email: "jane@techsolutions.com",
    phone: "555-0101",
    startDate: "2024-09-10", 
    endDate: "2024-09-10", 
    totalCost: 5000, 
    paymentStatus: "pending", 
    approvalStatus: "pending", 
    userId: "compUser123_seeded",
    companyId: "comp001_seeded",
    numberOfAttendees: 50,
    serviceDetails: { lunch: 'level1' }
  },
];


export default function AdminBookingsPage() {
  const { t } = useLanguage();
  const { toast } = useToast();
  const [bookings, setBookings] = useState<Booking[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isSeeding, setIsSeeding] = useState(false);

  const fetchBookings = useCallback(async () => {
    setIsLoading(true);
    try {
      const querySnapshot = await getDocs(collection(db, "bookings"));
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
      setBookings(bookingsData);
    } catch (error) {
      console.error("Error fetching bookings: ", error);
      toast({ variant: "destructive", title: t('error'), description: t('errorFetchingBookings') });
    } finally {
      setIsLoading(false);
    }
  }, [t, toast]);

  useEffect(() => {
    fetchBookings();
  }, [fetchBookings]);

  const handleSeedData = async () => {
    setIsSeeding(true);
    try {
      const batch = writeBatch(db);
      sampleBookingsForSeed.forEach(booking => {
        const docRef = doc(collection(db, "bookings"));
        // Convert string dates to Timestamps for Firestore
        const { startDate, endDate, ...restOfBooking } = booking;
        const bookingWithTimestamps = {
          ...restOfBooking,
          startDate: Timestamp.fromDate(new Date(startDate)),
          endDate: Timestamp.fromDate(new Date(endDate)),
          bookedAt: Timestamp.now()
        };
        batch.set(docRef, bookingWithTimestamps);
      });
      await batch.commit();
      toast({ title: t('success'), description: t('bookingDataSeeded') });
      fetchBookings();
    } catch (error) {
      console.error("Error seeding bookings: ", error);
      toast({ variant: "destructive", title: t('error'), description: t('errorSeedingBookings') });
    } finally {
      setIsSeeding(false);
    }
  };

  const handleApprovalChange = async (bookingId: string, newStatus: 'pending' | 'approved' | 'rejected') => {
    try {
      const bookingRef = doc(db, "bookings", bookingId);
      await updateDoc(bookingRef, { approvalStatus: newStatus });
      toast({ title: t('success'), description: t('bookingStatusUpdated') });
      fetchBookings(); 
    } catch (error) {
      console.error("Error updating booking status: ", error);
      toast({ variant: "destructive", title: t('error'), description: t('errorUpdatingBookingStatus') });
    }
  };
  
  const handleDeleteBooking = async (bookingId: string) => {
    if (!confirm(t('confirmDeleteBooking'))) return;
    try {
      await deleteDoc(doc(db, "bookings", bookingId));
      toast({ title: t('success'), description: t('bookingDeletedSuccessfully') });
      fetchBookings();
    } catch (error) {
      console.error("Error deleting booking: ", error);
      toast({ variant: "destructive", title: t('error'), description: t('errorDeletingBooking') });
    }
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

  if (isLoading) {
    return <div className="flex justify-center items-center h-40"><Loader2 className="h-8 w-8 animate-spin" /></div>;
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-3xl font-bold text-foreground">{t('manageBookings')}</h1>
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button variant="outline">
              <Filter className="mr-2 h-4 w-4" /> {t('filterBookings')}
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent className="w-56">
            <DropdownMenuLabel>{t('bookingStatus')}</DropdownMenuLabel>
            <DropdownMenuSeparator />
            <DropdownMenuCheckboxItem checked>{t('all')}</DropdownMenuCheckboxItem>
            <DropdownMenuLabel>{t('paymentStatus')}</DropdownMenuLabel>
            <DropdownMenuCheckboxItem>{t('paid')}</DropdownMenuCheckboxItem>
            <DropdownMenuCheckboxItem>{t('pending')}</DropdownMenuCheckboxItem>
            <DropdownMenuCheckboxItem>{t('failed')}</DropdownMenuCheckboxItem>
            <DropdownMenuSeparator />
            <DropdownMenuLabel>{t('approvalStatus')}</DropdownMenuLabel>
            <DropdownMenuCheckboxItem>{t('approved')}</DropdownMenuCheckboxItem>
            <DropdownMenuCheckboxItem>{t('pending')}</DropdownMenuCheckboxItem>
            <DropdownMenuCheckboxItem>{t('rejected')}</DropdownMenuCheckboxItem>
          </DropdownMenuContent>
        </DropdownMenu>
      </div>

      {bookings.length === 0 && !isLoading && (
        <Card>
          <CardContent className="pt-6 text-center">
            <p className="mb-4">{t('noBookingsFoundCta')}</p>
            <Button onClick={handleSeedData} disabled={isSeeding}>
              {isSeeding && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              {t('seedInitialBookings')}
            </Button>
          </CardContent>
        </Card>
      )}

      <Card>
        <CardHeader>
          <CardTitle>{t('bookingList')}</CardTitle>
          <CardDescription>{t('viewAndManageAllBookings')}</CardDescription>
        </CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>{t('bookingId')}</TableHead>
                <TableHead>{t('category')}</TableHead>
                <TableHead>{t('itemsBooked')}</TableHead>
                <TableHead>{t('customer')}</TableHead>
                <TableHead>{t('dates')}</TableHead>
                <TableHead>{t('totalCost')}</TableHead>
                <TableHead>{t('paymentStatus')}</TableHead>
                <TableHead>{t('approvalStatus')}</TableHead>
                <TableHead className="text-right">{t('actions')}</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {bookings.map((booking) => (
                <TableRow key={booking.id}>
                  <TableCell className="font-medium">{booking.id.substring(0,8)}...</TableCell>
                  <TableCell className="capitalize">{t(booking.bookingCategory)}</TableCell>
                  <TableCell>
                    {booking.items.map(item => item.name).join(', ')} ({booking.items.length})
                  </TableCell>
                  <TableCell>
                    {booking.bookingCategory === 'dormitory' ? booking.guestName : booking.companyName}
                    {booking.userId && <span className="text-xs text-muted-foreground block"> (User ID: {booking.userId.substring(0,6)}...)</span>}
                  </TableCell>
                  <TableCell>{new Date(booking.startDate).toLocaleDateString()} - {new Date(booking.endDate).toLocaleDateString()}</TableCell>
                  <TableCell>{booking.totalCost} ETB</TableCell>
                  <TableCell>
                    {getPaymentStatusBadge(booking.paymentStatus)}
                  </TableCell>
                  <TableCell>
                    {getApprovalStatusBadge(booking.approvalStatus)}
                  </TableCell>
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
                                {t('approveBooking')}
                            </DropdownMenuItem>
                            <DropdownMenuItem onClick={() => handleApprovalChange(booking.id, 'pending')} disabled={booking.approvalStatus === 'pending'}>
                                {t('setAsPending')}
                            </DropdownMenuItem>
                            <DropdownMenuItem onClick={() => handleApprovalChange(booking.id, 'rejected')} disabled={booking.approvalStatus === 'rejected'} className="text-destructive focus:bg-destructive focus:text-destructive-foreground">
                                {t('rejectBooking')}
                            </DropdownMenuItem>
                            <DropdownMenuSeparator />
                            <DropdownMenuItem className="text-destructive focus:bg-destructive focus:text-destructive-foreground" onClick={() => handleDeleteBooking(booking.id)}>
                                <Trash2 className="mr-2 h-4 w-4" /> {t('delete')}
                            </DropdownMenuItem>
                        </DropdownMenuContent>
                    </DropdownMenu>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </CardContent>
      </Card>
    </div>
  );
}
