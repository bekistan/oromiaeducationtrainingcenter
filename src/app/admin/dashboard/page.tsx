
"use client";

import React, { useState, useEffect, useCallback, useMemo } from 'react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { useLanguage } from "@/hooks/use-language";
import { db } from '@/lib/firebase';
import { collection, getDocs, query, where, orderBy, limit, Timestamp, getCountFromServer, DocumentData } from 'firebase/firestore';
import type { Booking, Dormitory, Hall } from '@/types';
import { DollarSign, Users, Bed, Building, PackageCheck, ClipboardList, Loader2, ChevronLeft, ChevronRight } from "lucide-react";
import { useToast } from '@/hooks/use-toast';
import { useSimpleTable } from '@/hooks/use-simple-table';
import { Button } from '@/components/ui/button';


interface DashboardStats {
  totalBookings: number | null;
  totalRevenue: number | null;
  totalUsers: number | null;
  availableBedsStat: { available: number; total: number } | null;
  availableHalls: { available: number; total: number } | null;
}

export default function AdminDashboardPage() {
  const { t } = useLanguage();
  const { toast } = useToast();
  const [stats, setStats] = useState<DashboardStats>({
    totalBookings: null,
    totalRevenue: null,
    totalUsers: null,
    availableBedsStat: null,
    availableHalls: null,
  });
  const [allRecentBookings, setAllRecentBookings] = useState<Booking[]>([]);
  const [isLoadingStats, setIsLoadingStats] = useState(true);
  const [isLoadingRecentBookings, setIsLoadingRecentBookings] = useState(true);

  const fetchDashboardData = useCallback(async () => {
    setIsLoadingStats(true);
    try {
      const bookingsCol = collection(db, "bookings");
      const bookingsAggregateSnapshot = await getCountFromServer(bookingsCol);
      const totalBookings = bookingsAggregateSnapshot.data().count;

      const paidBookingsQuery = query(bookingsCol, where("paymentStatus", "==", "paid"));
      const paidBookingsSnapshot = await getDocs(paidBookingsQuery);
      let totalRevenue = 0;
      paidBookingsSnapshot.forEach(doc => {
        totalRevenue += (doc.data() as Booking).totalCost;
      });

      const usersCol = collection(db, "users");
      const usersAggregateSnapshot = await getCountFromServer(usersCol);
      const totalUsers = usersAggregateSnapshot.data().count;
      
      const dormsCol = collection(db, "dormitories");
      const dormsSnapshot = await getDocs(dormsCol);
      let availableBedCount = 0;
      let totalBedCount = 0;
      dormsSnapshot.forEach(docSnap => {
        const dormData = docSnap.data() as DocumentData as Dormitory; 
        totalBedCount += dormData.capacity || 0;
        // For available beds, sum capacity only if room is available AND there are beds
        if (dormData.isAvailable && dormData.capacity > 0) {
          // This logic might need refinement if 'availableBeds' field is different from 'capacity' when 'isAvailable'
          availableBedCount += dormData.capacity || 0; 
        }
      });
      const availableBedsStat = { available: availableBedCount, total: totalBedCount };

      const hallsCol = collection(db, "halls");
      const hallsSnapshot = await getDocs(hallsCol);
      let availableHallCount = 0;
      hallsSnapshot.forEach(docSnap => {
        if ((docSnap.data() as DocumentData as Hall).isAvailable) { 
          availableHallCount++;
        }
      });
      const availableHalls = { available: availableHallCount, total: hallsSnapshot.size };

      setStats({
        totalBookings,
        totalRevenue,
        totalUsers,
        availableBedsStat,
        availableHalls,
      });

    } catch (error) {
      console.error("Error fetching dashboard stats: ", error);
      toast({ variant: "destructive", title: t('error'), description: t('errorFetchingDashboardStats') });
    } finally {
      setIsLoadingStats(false);
    }
  }, [t, toast]);

  const fetchRecentBookings = useCallback(async () => {
    setIsLoadingRecentBookings(true);
    try {
      const bookingsQuery = query(collection(db, "bookings"), orderBy("bookedAt", "desc"), limit(25)); // Fetch more for pagination
      const querySnapshot = await getDocs(bookingsQuery);
      const bookingsData = querySnapshot.docs.map(docSnap => {
        const data = docSnap.data();
        
        const bookedAt = data.bookedAt instanceof Timestamp 
          ? data.bookedAt.toDate().toISOString() 
          : (typeof data.bookedAt === 'string' ? data.bookedAt : new Date().toISOString());
        
        const startDate = data.startDate instanceof Timestamp 
          ? data.startDate.toDate().toISOString().split('T')[0] 
          : (typeof data.startDate === 'string' ? data.startDate : new Date().toISOString().split('T')[0]);
        
        const endDate = data.endDate instanceof Timestamp 
          ? data.endDate.toDate().toISOString().split('T')[0] 
          : (typeof data.endDate === 'string' ? data.endDate : new Date().toISOString().split('T')[0]);
        
        return {
          id: docSnap.id,
          ...data,
          bookedAt,
          startDate,
          endDate,
        } as Booking;
      });
      setAllRecentBookings(bookingsData);
    } catch (error) {
      console.error("Error fetching recent bookings: ", error);
      toast({ variant: "destructive", title: t('error'), description: t('errorFetchingRecentBookings') });
    } finally {
      setIsLoadingRecentBookings(false);
    }
  }, [t, toast]);

  useEffect(() => {
    fetchDashboardData();
    fetchRecentBookings();
  }, [fetchDashboardData, fetchRecentBookings]);

  const {
    paginatedData: displayedRecentBookings,
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
    initialData: allRecentBookings,
    rowsPerPage: 5,
    searchKeys: ['id', 'guestName', 'companyName'], // Add more if needed
  });

  const statCards = [
    { titleKey: "totalBookings", value: stats.totalBookings, icon: <PackageCheck className="h-6 w-6 text-primary" />, detailsKey: "allTime", isLoading: isLoadingStats },
    { titleKey: "totalRevenue", value: stats.totalRevenue !== null ? `ETB ${stats.totalRevenue.toLocaleString()}` : null, icon: <DollarSign className="h-6 w-6 text-primary" />, detailsKey: "fromPaidBookings", isLoading: isLoadingStats },
    { titleKey: "totalUsers", value: stats.totalUsers, icon: <Users className="h-6 w-6 text-primary" />, detailsKey: "registeredUsers", isLoading: isLoadingStats },
    { titleKey: "availableBedsDashboard", value: stats.availableBedsStat ? `${stats.availableBedsStat.available} / ${stats.availableBedsStat.total}` : null, icon: <Bed className="h-6 w-6 text-primary" />, detailsKey: "totalBedsInSystem", isLoading: isLoadingStats },
    { titleKey: "availableHalls", value: stats.availableHalls ? `${stats.availableHalls.available} / ${stats.availableHalls.total}` : null, icon: <Building className="h-6 w-6 text-primary" />, detailsKey: "hallsAndSections", isLoading: isLoadingStats },
  ];

  const getStatusBadge = (status: string, type: 'payment' | 'approval') => {
    const baseClasses = "text-xs font-semibold px-2 py-0.5 rounded-full";
    if (type === 'payment') {
      switch (status) {
        case 'paid': return <Badge className={`${baseClasses} bg-green-100 text-green-700 border-green-300`}>{t(status)}</Badge>;
        case 'pending': return <Badge className={`${baseClasses} bg-yellow-100 text-yellow-700 border-yellow-300`}>{t(status)}</Badge>;
        case 'failed': return <Badge className={`${baseClasses} bg-red-100 text-red-700 border-red-300`}>{t(status)}</Badge>;
        default: return <Badge variant="secondary" className={baseClasses}>{t(status)}</Badge>;
      }
    } else { // approval
      switch (status) {
        case 'approved': return <Badge className={`${baseClasses} bg-blue-100 text-blue-700 border-blue-300`}>{t(status)}</Badge>;
        case 'pending': return <Badge className={`${baseClasses} bg-orange-100 text-orange-700 border-orange-300`}>{t(status)}</Badge>;
        case 'rejected': return <Badge className={`${baseClasses} bg-gray-100 text-gray-700 border-gray-300`}>{t(status)}</Badge>;
        default: return <Badge variant="secondary" className={baseClasses}>{t(status)}</Badge>;
      }
    }
  };

  return (
    <div className="space-y-6">
      <h1 className="text-3xl font-bold text-foreground">{t('dashboard')}</h1>
      
      <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-5">
        {statCards.map(stat => (
          <Card key={stat.titleKey}>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium text-muted-foreground">
                {t(stat.titleKey)}
              </CardTitle>
              {stat.icon}
            </CardHeader>
            <CardContent>
              {stat.isLoading ? (
                <Loader2 className="h-6 w-6 animate-spin text-primary" />
              ) : (
                <div className="text-2xl font-bold text-foreground">{stat.value !== null ? stat.value : t('notAvailable')}</div>
              )}
              <p className="text-xs text-muted-foreground">{t(stat.detailsKey)}</p>
            </CardContent>
          </Card>
        ))}
      </div>

      <div className="grid gap-6 lg:grid-cols-2">
        <Card>
          <CardHeader>
            <div className="flex justify-between items-center">
                <CardTitle className="flex items-center">
                    <ClipboardList className="mr-2 h-5 w-5 text-primary" />
                    {t('recentBookings')}
                </CardTitle>
                <Input
                    placeholder={t('searchRecentBookings')}
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                    className="max-w-xs text-sm"
                />
            </div>
            <CardDescription>{t('lastNBookings', { count: totalItems })}</CardDescription>
          </CardHeader>
          <CardContent>
            {isLoadingRecentBookings && !allRecentBookings.length ? (
              <div className="flex justify-center items-center h-40"><Loader2 className="h-8 w-8 animate-spin text-primary" /></div>
            ) : displayedRecentBookings.length === 0 ? (
              <p className="text-muted-foreground">{searchTerm ? t('noBookingsMatchSearch') : t('noRecentBookings')}</p>
            ) : (
              <>
                <div className="overflow-x-auto">
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>{t('bookingId')}</TableHead>
                        <TableHead>{t('customer')}</TableHead>
                        <TableHead>{t('item')}</TableHead>
                        <TableHead>{t('cost')}</TableHead>
                        <TableHead>{t('status')}</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {displayedRecentBookings.map(booking => (
                        <TableRow key={booking.id}>
                          <TableCell className="font-mono text-xs">{booking.id.substring(0, 8)}...</TableCell>
                          <TableCell>{booking.companyName || booking.guestName || t('notAvailable')}</TableCell>
                          <TableCell>{booking.items.map(item => item.name).join(', ').substring(0,25)}{booking.items.map(item => item.name).join(', ').length > 25 ? '...' : ''}</TableCell>
                          <TableCell>ETB {booking.totalCost.toLocaleString()}</TableCell>
                          <TableCell className="space-x-1">
                            {getStatusBadge(booking.paymentStatus, 'payment')}
                            {getStatusBadge(booking.approvalStatus, 'approval')}
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </div>
                <div className="flex items-center justify-between pt-4">
                    <span className="text-sm text-muted-foreground">
                        {t('page')} {pageCount > 0 ? currentPage + 1: 0} {t('of')} {pageCount} ({totalItems} {t('itemsTotal')})
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
        <Card>
          <CardHeader>
            <CardTitle>{t('systemNotifications')}</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-muted-foreground">{t('placeholderNotifications')}</p>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
