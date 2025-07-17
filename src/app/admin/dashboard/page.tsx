
"use client";

import React, { useState, useEffect, useCallback, useMemo } from 'react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { useLanguage } from "@/hooks/use-language";
import { useAuth } from '@/hooks/use-auth';
import { db } from '@/lib/firebase';
import { collection, getDocs, query, where, orderBy, limit, Timestamp, getCountFromServer, DocumentData, doc, getDoc, onSnapshot } from 'firebase/firestore';
import type { Booking, Dormitory, Hall, BankAccountDetails } from '@/types';
import { DollarSign, Users, Bed, Building, PackageCheck, ClipboardList, Loader2, ChevronLeft, ChevronRight, Landmark, ArrowUpDown, Settings as SettingsIcon, CalendarClock } from "lucide-react";
import { useToast } from '@/hooks/use-toast';
import { useSimpleTable } from '@/hooks/use-simple-table';
import { Button } from '@/components/ui/button';
import { useQuery } from '@tanstack/react-query';
import { formatDate } from '@/lib/date-utils';
import { ScrollAnimate } from '@/components/shared/scroll-animate';

const BANK_DETAILS_DOC_PATH = "site_configuration/bank_account_details";
const BANK_DETAILS_QUERY_KEY = "bankAccountDetails";

interface DashboardStats {
  totalBookings: number;
  totalRevenue: number;
  totalUsers: number;
  availableBedsStat: { available: number; total: number };
  availableHalls: { available: number; total: number };
}

export default function AdminDashboardPage() {
  const { t } = useLanguage();
  const { user } = useAuth();
  const { toast } = useToast();

  const [stats, setStats] = useState<DashboardStats>({
    totalBookings: 0,
    totalRevenue: 0,
    totalUsers: 0,
    availableBedsStat: { available: 0, total: 0 },
    availableHalls: { available: 0, total: 0 },
  });
  const [allRecentBookings, setAllRecentBookings] = useState<Booking[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  const { data: bankDetails } = useQuery<BankAccountDetails | null, Error>({
    queryKey: [BANK_DETAILS_QUERY_KEY],
    queryFn: async (): Promise<BankAccountDetails | null> => {
      const docRef = doc(db, BANK_DETAILS_DOC_PATH);
      const docSnap = await getDoc(docRef);
      return docSnap.exists() ? { id: docSnap.id, ...docSnap.data() } as BankAccountDetails : null;
    },
  });

  useEffect(() => {
    if (!user || !db) return;

    const isBuildingAdmin = user.role === 'admin' && !!user.buildingAssignment;
    const isSuperOrGeneralAdmin = user.role === 'superadmin' || (user.role === 'admin' && !user.buildingAssignment);

    // Real-time listener for bookings
    const bookingsQuery = query(collection(db, "bookings"), orderBy("bookedAt", "desc"));
    const unsubscribeBookings = onSnapshot(bookingsQuery, async (snapshot) => {
      setIsLoading(true);
      const allBookingsFromDb = snapshot.docs.map(docSnap => ({
        id: docSnap.id,
        ...docSnap.data(),
        bookedAt: docSnap.data().bookedAt instanceof Timestamp ? docSnap.data().bookedAt.toDate().toISOString() : docSnap.data().bookedAt,
      } as Booking));
      
      let bookingsForStats = allBookingsFromDb;
      if (isBuildingAdmin) {
        const dormsSnapshot = await getDocs(query(collection(db, "dormitories"), where("buildingName", "==", user.buildingAssignment)));
        const buildingDormIds = new Set(dormsSnapshot.docs.map(d => d.id));
        bookingsForStats = allBookingsFromDb.filter(b => b.items.some(item => buildingDormIds.has(item.id)));
      }
      
      const totalBookings = bookingsForStats.length;
      const totalRevenue = bookingsForStats.reduce((acc, b) => b.paymentStatus === 'paid' ? acc + b.totalCost : acc, 0);

      let recentBookingsForTable = allBookingsFromDb;
      if (isBuildingAdmin) {
        const dormsSnapshot = await getDocs(query(collection(db, "dormitories"), where("buildingName", "==", user.buildingAssignment)));
        const buildingDormIds = new Set(dormsSnapshot.docs.map(d => d.id));
        recentBookingsForTable = allBookingsFromDb.filter(b => b.bookingCategory === 'dormitory' && b.items.some(item => buildingDormIds.has(item.id)));
      }
      setAllRecentBookings(recentBookingsForTable.slice(0, 25));

      setStats(prev => ({ ...prev, totalBookings, totalRevenue }));
      setIsLoading(false);
    }, (error) => {
      console.error("Error with bookings listener:", error);
      toast({ variant: "destructive", title: t('error'), description: t('errorFetchingDashboardStats') });
      setIsLoading(false);
    });

    // One-time fetches for less dynamic data
    const fetchOtherStats = async () => {
      let totalUsers = 0;
      if (isSuperOrGeneralAdmin) {
        const usersAggregateSnapshot = await getCountFromServer(collection(db, "users"));
        totalUsers = usersAggregateSnapshot.data().count;
      }
      
      const dormsQuery = isBuildingAdmin ? query(collection(db, "dormitories"), where("buildingName", "==", user.buildingAssignment)) : query(collection(db, "dormitories"));
      const dormsSnapshot = await getDocs(dormsQuery);
      const dormsData = dormsSnapshot.docs.map(d => d.data() as Dormitory);
      const totalBedCount = dormsData.reduce((acc, d) => acc + (d.capacity || 0), 0);
      const availableBedCount = dormsData.reduce((acc, d) => d.isAvailable ? acc + (d.capacity || 0) : acc, 0);
      
      let availableHalls = { available: 0, total: 0 };
      if (isSuperOrGeneralAdmin) {
        const hallsSnapshot = await getDocs(collection(db, "halls"));
        const hallsData = hallsSnapshot.docs.map(d => d.data() as Hall);
        availableHalls = {
          available: hallsData.filter(h => h.isAvailable).length,
          total: hallsData.length,
        };
      }
      
      setStats(prev => ({ ...prev, totalUsers, availableBedsStat: { available: availableBedCount, total: totalBedCount }, availableHalls }));
    };

    fetchOtherStats().catch(console.error);

    return () => {
      unsubscribeBookings();
    };
  }, [user, t, toast]);


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
      { titleKey: "totalBookings", value: stats.totalBookings, icon: <PackageCheck className="h-6 w-6 text-primary" />, detailsKey: "allTime", roles: ['superadmin', 'admin'] }, 
      { titleKey: "totalRevenue", value: stats.totalRevenue !== null ? `${t('currencySymbol')} ${stats.totalRevenue.toLocaleString()}` : null, icon: <DollarSign className="h-6 w-6 text-primary" />, detailsKey: "fromPaidBookings", roles: ['superadmin', 'admin'] }, 
      { titleKey: "totalUsers", value: stats.totalUsers, icon: <Users className="h-6 w-6 text-primary" />, detailsKey: "registeredUsers", roles: ['superadmin', 'admin'] }, 
      { titleKey: "availableBedsDashboard", value: stats.availableBedsStat ? `${stats.availableBedsStat.available} / ${stats.availableBedsStat.total}` : null, icon: <Bed className="h-6 w-6 text-primary" />, detailsKey: "totalBedsInSystem", roles: ['superadmin', 'admin'] }, 
      { titleKey: "availableHalls", value: stats.availableHalls ? `${stats.availableHalls.available} / ${stats.availableHalls.total}` : null, icon: <Building className="h-6 w-6 text-primary" />, detailsKey: "hallsAndSections", roles: ['superadmin', 'admin'] }, 
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
  }, [stats, t, user]);


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
    <ScrollAnimate className="space-y-6">
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
              {isLoading ? (
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
            {isLoading && !allRecentBookings.length ? (
              <div className="flex justify-center items-center h-40"><Loader2 className="h-8 w-8 animate-spin text-primary" /></div>
            ) : displayedRecentBookings.length === 0 ? (
              <p className="text-muted-foreground">{searchTerm ? t('noBookingsMatchSearch') : t('noRecentBookings')}</p>
            ) : (
              <>
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
                        <TableCell className="text-xs whitespace-nowrap">{formatDate(booking.bookedAt, 'MMM d, yy HH:mm')}</TableCell>
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
            {isLoading ? (
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
    </ScrollAnimate>
  );
}
