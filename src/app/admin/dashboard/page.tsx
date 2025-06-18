
"use client";

import React, { useState, useEffect, useCallback, useMemo } from 'react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { useLanguage } from "@/hooks/use-language";
import { useAuth } from '@/hooks/use-auth';
import { db } from '@/lib/firebase';
import { collection, getDocs, query, where, orderBy, limit, Timestamp, getCountFromServer, DocumentData, doc, getDoc } from 'firebase/firestore';
import type { Booking, Dormitory, Hall, BankAccountDetails } from '@/types';
import { DollarSign, Users, Bed, Building, PackageCheck, ClipboardList, Loader2, ChevronLeft, ChevronRight, Landmark, ArrowUpDown, Settings as SettingsIcon, CalendarClock } from "lucide-react";
import { useToast } from '@/hooks/use-toast';
import { useSimpleTable } from '@/hooks/use-simple-table';
import { Button } from '@/components/ui/button';
import { useQuery } from '@tanstack/react-query';
import { formatDualDate } from '@/lib/date-utils';

const BANK_DETAILS_DOC_PATH = "site_configuration/bank_account_details";
const BANK_DETAILS_QUERY_KEY = "bankAccountDetails";
const DORMITORIES_FOR_DASHBOARD_QUERY_KEY = "dormitoriesForDashboard";
const HALLS_FOR_DASHBOARD_QUERY_KEY = "hallsForDashboard";

interface DashboardStats {
  totalBookings: number | null;
  totalRevenue: number | null;
  totalUsers: number | null;
  availableBedsStat: { available: number; total: number } | null;
  availableHalls: { available: number; total: number } | null;
}

const fetchBankDetailsForDashboard = async (): Promise<BankAccountDetails | null> => {
  const docRef = doc(db, BANK_DETAILS_DOC_PATH);
  const docSnap = await getDoc(docRef);
  if (docSnap.exists()) {
    const data = docSnap.data();
    return {
      bankName: data.bankName || "",
      accountName: data.accountName || "",
      accountNumber: data.accountNumber || "",
    } as BankAccountDetails;
  }
  return null;
};

const fetchAllDormitories = async (): Promise<Dormitory[]> => {
  const querySnapshot = await getDocs(collection(db, "dormitories"));
  return querySnapshot.docs.map(docSnap => ({ id: docSnap.id, ...docSnap.data() } as Dormitory));
};
const fetchAllHalls = async (): Promise<Hall[]> => {
  const querySnapshot = await getDocs(collection(db, "halls"));
  return querySnapshot.docs.map(docSnap => ({ id: docSnap.id, ...docSnap.data() } as Hall));
};


export default function AdminDashboardPage() {
  const { t } = useLanguage();
  const { user } = useAuth();
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

  const { data: bankDetails, isLoading: isLoadingBankDetails } = useQuery<BankAccountDetails | null, Error>({
    queryKey: [BANK_DETAILS_QUERY_KEY],
    queryFn: fetchBankDetailsForDashboard,
  });

  const { data: dormitoriesFromDb } = useQuery<Dormitory[], Error>({
    queryKey: [DORMITORIES_FOR_DASHBOARD_QUERY_KEY],
    queryFn: fetchAllDormitories,
  });

  const { data: hallsFromDb } = useQuery<Hall[], Error>({
    queryKey: [HALLS_FOR_DASHBOARD_QUERY_KEY],
    queryFn: fetchAllHalls,
  });
  
  const dormIdToBuildingMap = useMemo(() => {
    if (!dormitoriesFromDb) return new Map<string, string>();
    return new Map(dormitoriesFromDb.map(dorm => [dorm.id, dorm.buildingName]));
  }, [dormitoriesFromDb]);

  const fetchDashboardData = useCallback(async () => {
    setIsLoadingStats(true);
    try {
      const bookingsCol = collection(db, "bookings");
      const bookingsAggregateSnapshot = await getCountFromServer(bookingsCol);
      let totalBookings = bookingsAggregateSnapshot.data().count;

      const paidBookingsQuery = query(bookingsCol, where("paymentStatus", "==", "paid"));
      const paidBookingsSnapshot = await getDocs(paidBookingsQuery);
      let totalRevenue = 0;
      paidBookingsSnapshot.forEach(doc => {
        totalRevenue += (doc.data() as Booking).totalCost;
      });

      let totalUsers: number | null = null;
      let availableBedsStat: { available: number; total: number } | null = null;
      let availableHalls: { available: number; total: number } | null = null;

      if (user?.role === 'superadmin' || (user?.role === 'admin' && !user.buildingAssignment)) {
        const usersCol = collection(db, "users");
        const usersAggregateSnapshot = await getCountFromServer(usersCol);
        totalUsers = usersAggregateSnapshot.data().count;
      }
      
      const dormsCol = collection(db, "dormitories");
      let dormsQuery = query(dormsCol);
      if (user?.role === 'admin' && user.buildingAssignment) {
        dormsQuery = query(dormsCol, where("buildingName", "==", user.buildingAssignment));
      }
      const dormsSnapshot = await getDocs(dormsQuery);
      let availableBedCount = 0;
      let totalBedCount = 0;
      dormsSnapshot.forEach(docSnap => {
        const dormData = docSnap.data() as DocumentData as Dormitory; 
        totalBedCount += dormData.capacity || 0;
        if (dormData.isAvailable && dormData.capacity > 0) {
          availableBedCount += dormData.capacity || 0; 
        }
      });
      availableBedsStat = { available: availableBedCount, total: totalBedCount };

      if (user?.role === 'superadmin' || (user?.role === 'admin' && !user.buildingAssignment)) {
        const hallsCol = collection(db, "halls");
        const hallsSnapshot = await getDocs(hallsCol);
        let availableHallCount = 0;
        hallsSnapshot.forEach(docSnap => {
          if ((docSnap.data() as DocumentData as Hall).isAvailable) { 
            availableHallCount++;
          }
        });
        availableHalls = { available: availableHallCount, total: hallsSnapshot.size };
      } else {
        availableHalls = { available: 0, total: 0}; 
      }

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
  }, [t, toast, user]);

  const fetchRecentBookings = useCallback(async () => {
    setIsLoadingRecentBookings(true);
    try {
      let bookingsQuery = query(collection(db, "bookings"), orderBy("bookedAt", "desc"), limit(25));
      
      const querySnapshot = await getDocs(bookingsQuery);
      let bookingsData = querySnapshot.docs.map(docSnap => {
        const data = docSnap.data();
        return {
          id: docSnap.id,
          ...data,
          bookedAt: data.bookedAt instanceof Timestamp ? data.bookedAt.toDate().toISOString() : (typeof data.bookedAt === 'string' ? data.bookedAt : new Date().toISOString()),
          startDate: data.startDate instanceof Timestamp ? data.startDate.toDate().toISOString().split('T')[0] : (typeof data.startDate === 'string' ? data.startDate : new Date().toISOString().split('T')[0]),
          endDate: data.endDate instanceof Timestamp ? data.endDate.toDate().toISOString().split('T')[0] : (typeof data.endDate === 'string' ? data.endDate : new Date().toISOString().split('T')[0]),
        } as Booking;
      });

      if (user?.role === 'admin' && user.buildingAssignment && dormIdToBuildingMap.size > 0) {
        bookingsData = bookingsData.filter(booking => {
          if (booking.bookingCategory === 'facility') return false; 
          if (booking.bookingCategory === 'dormitory' && booking.items.length > 0) {
            const firstItemId = booking.items[0]?.id;
            if (!firstItemId) return false;
            const buildingOfBooking = dormIdToBuildingMap.get(firstItemId);
            return buildingOfBooking === user.buildingAssignment;
          }
          return false;
        });
      } else if (user?.role === 'admin' && user.buildingAssignment && dormIdToBuildingMap.size === 0 && !isLoadingStats) {
        bookingsData = [];
      }


      setAllRecentBookings(bookingsData);
    } catch (error) {
      console.error("Error fetching recent bookings: ", error);
      toast({ variant: "destructive", title: t('error'), description: t('errorFetchingRecentBookings') });
    } finally {
      setIsLoadingRecentBookings(false);
    }
  }, [t, toast, user, dormIdToBuildingMap, isLoadingStats]);

  useEffect(() => {
    fetchDashboardData();
    if (dormitoriesFromDb) { 
        fetchRecentBookings();
    } else if (!user?.buildingAssignment) { 
        fetchRecentBookings();
    }
  }, [fetchDashboardData, fetchRecentBookings, dormitoriesFromDb, user]);

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
    requestSort,
    sortConfig,
  } = useSimpleTable<Booking>({
    data: allRecentBookings,
    rowsPerPage: 5,
    searchKeys: ['id', 'guestName', 'companyName', 'bookingCategory'],
    initialSort: { key: 'bookedAt', direction: 'descending' },
  });

  const statCards = useMemo(() => {
    const cards = [
      { titleKey: "totalBookings", value: stats.totalBookings, icon: <PackageCheck className="h-6 w-6 text-primary" />, detailsKey: "allTime", isLoading: isLoadingStats, roles: ['superadmin', 'admin'] }, 
      { titleKey: "totalRevenue", value: stats.totalRevenue !== null ? `${t('currencySymbol')} ${stats.totalRevenue.toLocaleString()}` : null, icon: <DollarSign className="h-6 w-6 text-primary" />, detailsKey: "fromPaidBookings", isLoading: isLoadingStats, roles: ['superadmin', 'admin'] }, 
      { titleKey: "totalUsers", value: stats.totalUsers, icon: <Users className="h-6 w-6 text-primary" />, detailsKey: "registeredUsers", isLoading: isLoadingStats, roles: ['superadmin', 'admin'] }, 
      { titleKey: "availableBedsDashboard", value: stats.availableBedsStat ? `${stats.availableBedsStat.available} / ${stats.availableBedsStat.total}` : null, icon: <Bed className="h-6 w-6 text-primary" />, detailsKey: "totalBedsInSystem", isLoading: isLoadingStats, roles: ['superadmin', 'admin'] }, 
      { titleKey: "availableHalls", value: stats.availableHalls ? `${stats.availableHalls.available} / ${stats.availableHalls.total}` : null, icon: <Building className="h-6 w-6 text-primary" />, detailsKey: "hallsAndSections", isLoading: isLoadingStats, roles: ['superadmin', 'admin'] }, 
    ];

    return cards.filter(card => {
        if (user?.role === 'superadmin') return true;
        if (user?.role === 'admin') {
            if (card.titleKey === 'totalUsers' && user.buildingAssignment) return false;
            if (card.titleKey === 'availableHalls' && user.buildingAssignment) return false;
            return true;
        }
        return false;
    });
  }, [stats, isLoadingStats, t, user]);


  const getSortIndicator = (columnKey: keyof Booking | 'bookedAt') => {
    if (sortConfig?.key === columnKey) {
      return sortConfig.direction === 'ascending' ? ' ▲' : ' ▼';
    }
    return <ArrowUpDown className="ml-1 h-3 w-3 inline opacity-50 group-hover:opacity-100" />;
  };

  const getStatusBadge = (status: string, type: 'payment' | 'approval') => {
    const baseClasses = "text-xs font-semibold px-2 py-0.5 rounded-full";
    if (type === 'payment') {
      switch (status) {
        case 'paid': return <Badge className={`${baseClasses} bg-green-100 text-green-700 border-green-300`}>{t(status)}</Badge>;
        case 'pending': return <Badge className={`${baseClasses} bg-yellow-100 text-yellow-700 border-yellow-300`}>{t(status)}</Badge>;
        case 'awaiting_verification': return <Badge className={`${baseClasses} bg-sky-100 text-sky-700 border-sky-300`}>{t(status)}</Badge>;
        case 'pending_transfer': return <Badge className={`${baseClasses} bg-amber-100 text-amber-700 border-amber-300`}>{t(status)}</Badge>;
        case 'failed': return <Badge className={`${baseClasses} bg-red-100 text-red-700 border-red-300`}>{t(status)}</Badge>;
        default: return <Badge variant="secondary" className={baseClasses}>{t(status)}</Badge>;
      }
    } else { 
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
      
      <div className={`grid gap-6 md:grid-cols-2 ${statCards.length === 5 ? 'lg:grid-cols-3 xl:grid-cols-5' : 'lg:grid-cols-2 xl:grid-cols-' + statCards.length}`}>
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

      <div className="grid gap-6 lg:grid-cols-3">
        <Card className="lg:col-span-2">
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
                        <TableHead onClick={() => requestSort('bookedAt')} className="cursor-pointer group"><CalendarClock className="mr-1 h-4 w-4 inline-block"/>{t('bookedAt')}{getSortIndicator('bookedAt')}</TableHead>
                        <TableHead onClick={() => requestSort('guestName')} className="cursor-pointer group">{t('customer')}{getSortIndicator('guestName')}</TableHead>
                        <TableHead>{t('item')}</TableHead>
                        <TableHead onClick={() => requestSort('totalCost')} className="cursor-pointer group">{t('cost')}{getSortIndicator('totalCost')}</TableHead>
                        <TableHead onClick={() => requestSort('paymentStatus')} className="cursor-pointer group">{t('status')}{getSortIndicator('paymentStatus')}</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {displayedRecentBookings.map(booking => (
                        <TableRow key={booking.id}>
                          <TableCell className="text-xs whitespace-nowrap">{formatDualDate(booking.bookedAt, 'MMM d, yy HH:mm', 'MMM D, YY HH:mm')}</TableCell>
                          <TableCell>{booking.companyName || booking.guestName || t('notAvailable')}</TableCell>
                          <TableCell>{booking.items.map(item => item.name).join(', ').substring(0,25)}{booking.items.map(item => item.name).join(', ').length > 25 ? '...' : ''}</TableCell>
                          <TableCell>{t('currencySymbol')} {booking.totalCost.toLocaleString()}</TableCell>
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
            <CardTitle className="flex items-center">
              <Landmark className="mr-2 h-5 w-5 text-primary" />
              {t('bankAccountInformation')}
            </CardTitle>
            <CardDescription>{t('bankDetailsForPaymentVerification')}</CardDescription>
          </CardHeader>
          <CardContent className="space-y-3">
            {isLoadingBankDetails ? (
              <div className="flex justify-center items-center h-20">
                <Loader2 className="h-6 w-6 animate-spin text-primary" />
              </div>
            ) : bankDetails ? (
              <>
                <div>
                  <p className="text-sm font-medium text-muted-foreground">{t('accountName')}</p>
                  <p className="text-lg font-semibold text-foreground">{bankDetails.accountName || t('notSet')}</p>
                </div>
                <div>
                  <p className="text-sm font-medium text-muted-foreground">{t('bankName')}</p>
                  <p className="text-lg font-semibold text-foreground">{bankDetails.bankName || t('notSet')}</p>
                </div>
                <div>
                  <p className="text-sm font-medium text-muted-foreground">{t('accountNumber')}</p>
                  <p className="text-lg font-semibold text-foreground">{bankDetails.accountNumber || t('notSet')}</p>
                </div>
              </>
            ) : (
              <p className="text-sm text-muted-foreground">{t('noBankDetailsConfiguredAdmin')}</p>
            )}
             <p className="text-xs text-muted-foreground pt-2">{t('adminPaymentReferenceNote')}</p>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}

