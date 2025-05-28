
"use client";

import React, { useState, useEffect, useCallback } from 'react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { useLanguage } from "@/hooks/use-language";
import { db } from '@/lib/firebase';
import { collection, getDocs, query, where, orderBy, limit, Timestamp, getCountFromServer } from 'firebase/firestore';
import type { Booking, Dormitory, Hall } from '@/types';
import { DollarSign, Users, Bed, Building, PackageCheck, ClipboardList, Loader2 } from "lucide-react";
import { useToast } from '@/hooks/use-toast';

interface DashboardStats {
  totalBookings: number | null;
  totalRevenue: number | null;
  totalUsers: number | null;
  availableDorms: { available: number; total: number } | null;
  availableHalls: { available: number; total: number } | null;
}

export default function AdminDashboardPage() {
  const { t } = useLanguage();
  const { toast } = useToast();
  const [stats, setStats] = useState<DashboardStats>({
    totalBookings: null,
    totalRevenue: null,
    totalUsers: null,
    availableDorms: null,
    availableHalls: null,
  });
  const [recentBookings, setRecentBookings] = useState<Booking[]>([]);
  const [isLoadingStats, setIsLoadingStats] = useState(true);
  const [isLoadingRecentBookings, setIsLoadingRecentBookings] = useState(true);

  const fetchDashboardData = useCallback(async () => {
    setIsLoadingStats(true);
    try {
      // Total Bookings
      const bookingsCol = collection(db, "bookings");
      const bookingsAggregateSnapshot = await getCountFromServer(bookingsCol);
      const totalBookings = bookingsAggregateSnapshot.data().count;

      // Total Revenue
      const paidBookingsQuery = query(bookingsCol, where("paymentStatus", "==", "paid"));
      const paidBookingsSnapshot = await getDocs(paidBookingsQuery);
      let totalRevenue = 0;
      paidBookingsSnapshot.forEach(doc => {
        totalRevenue += (doc.data() as Booking).totalCost;
      });

      // Total Users
      const usersCol = collection(db, "users");
      const usersAggregateSnapshot = await getCountFromServer(usersCol);
      const totalUsers = usersAggregateSnapshot.data().count;
      
      // Available Dorms
      const dormsCol = collection(db, "dormitories");
      const dormsSnapshot = await getDocs(dormsCol);
      let availableDormCount = 0;
      dormsSnapshot.forEach(doc => {
        if ((doc.data() as Dormitory).isAvailable) {
          availableDormCount++;
        }
      });
      const availableDorms = { available: availableDormCount, total: dormsSnapshot.size };

      // Available Halls/Sections
      const hallsCol = collection(db, "halls");
      const hallsSnapshot = await getDocs(hallsCol);
      let availableHallCount = 0;
      hallsSnapshot.forEach(doc => {
        if ((doc.data() as Hall).isAvailable) {
          availableHallCount++;
        }
      });
      const availableHalls = { available: availableHallCount, total: hallsSnapshot.size };

      setStats({
        totalBookings,
        totalRevenue,
        totalUsers,
        availableDorms,
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
      const bookingsQuery = query(collection(db, "bookings"), orderBy("bookedAt", "desc"), limit(5));
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
      setRecentBookings(bookingsData);
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

  const statCards = [
    { titleKey: "totalBookings", value: stats.totalBookings, icon: <PackageCheck className="h-6 w-6 text-primary" />, detailsKey: "allTime", isLoading: isLoadingStats },
    { titleKey: "totalRevenue", value: stats.totalRevenue !== null ? `ETB ${stats.totalRevenue.toLocaleString()}` : null, icon: <DollarSign className="h-6 w-6 text-primary" />, detailsKey: "fromPaidBookings", isLoading: isLoadingStats },
    { titleKey: "totalUsers", value: stats.totalUsers, icon: <Users className="h-6 w-6 text-primary" />, detailsKey: "registeredUsers", isLoading: isLoadingStats },
    { titleKey: "availableDorms", value: stats.availableDorms ? `${stats.availableDorms.available} / ${stats.availableDorms.total}` : null, icon: <Bed className="h-6 w-6 text-primary" />, detailsKey: "dormitories", isLoading: isLoadingStats },
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
            <CardTitle className="flex items-center">
                <ClipboardList className="mr-2 h-5 w-5 text-primary" />
                {t('recentBookings')}
            </CardTitle>
            <CardDescription>{t('last5Bookings')}</CardDescription>
          </CardHeader>
          <CardContent>
            {isLoadingRecentBookings ? (
              <div className="flex justify-center items-center h-40"><Loader2 className="h-8 w-8 animate-spin text-primary" /></div>
            ) : recentBookings.length === 0 ? (
              <p className="text-muted-foreground">{t('noRecentBookings')}</p>
            ) : (
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
                  {recentBookings.map(booking => (
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
            )}
          </CardContent>
        </Card>
        <Card>
          <CardHeader>
            <CardTitle>{t('systemNotifications')}</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-muted-foreground">{t('placeholderNotifications')}</p>
            {/* Placeholder for system notifications */}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
