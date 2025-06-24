
"use client";

import React, { useMemo } from 'react';
import { useQuery } from '@tanstack/react-query';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { useLanguage } from "@/hooks/use-language";
import { useAuth } from '@/hooks/use-auth';
import type { Booking, KeyStatus } from "@/types";
import { LogIn, LogOut, Bed, Loader2, ShieldAlert, Calendar } from "lucide-react";
import { db } from '@/lib/firebase';
import { collection, query, where, getDocs, Timestamp } from 'firebase/firestore';
import { useRouter } from 'next/navigation';
import { formatDualDate, toDateObject } from '@/lib/date-utils';

const KEYHOLDER_REPORTS_QUERY_KEY = "keyholderDailyReports";

const fetchActiveAndApprovedDormBookings = async (): Promise<Booking[]> => {
    const today = new Date();
    today.setHours(0, 0, 0, 0);

    const q = query(
        collection(db, "bookings"),
        where("bookingCategory", "==", "dormitory"),
        where("approvalStatus", "==", "approved"),
        where("endDate", ">=", Timestamp.fromDate(today))
    );

    const querySnapshot = await getDocs(q);
    
    const bookingsData = querySnapshot.docs.map(docSnap => {
        const data = docSnap.data();
        return {
            id: docSnap.id,
            ...data,
            startDate: data.startDate instanceof Timestamp ? data.startDate.toDate().toISOString() : data.startDate,
            endDate: data.endDate instanceof Timestamp ? data.endDate.toDate().toISOString() : data.endDate,
        } as Booking;
    });

    return bookingsData;
};

const isSameDay = (date1: Date, date2: Date): boolean => {
    return date1.getFullYear() === date2.getFullYear() &&
           date1.getMonth() === date2.getMonth() &&
           date1.getDate() === date2.getDate();
};

export default function KeyholderDailyReportsPage() {
    const { t } = useLanguage();
    const { user, loading: authLoading } = useAuth();
    const router = useRouter();

    const { data: allBookings = [], isLoading, error } = useQuery<Booking[], Error>({
        queryKey: [KEYHOLDER_REPORTS_QUERY_KEY],
        queryFn: fetchActiveAndApprovedDormBookings,
        enabled: !!user && user.role === 'keyholder',
    });

    const dailyReportData = useMemo(() => {
        const today = new Date();
        const checkIns = allBookings.filter(b => {
            const startDate = toDateObject(b.startDate);
            return startDate && isSameDay(startDate, today);
        });
        const checkOuts = allBookings.filter(b => {
            const endDate = toDateObject(b.endDate);
            return endDate && isSameDay(endDate, today);
        });
        const ongoingStays = allBookings.filter(b => {
            const startDate = toDateObject(b.startDate);
            const endDate = toDateObject(b.endDate);
            return startDate && endDate && startDate < today && endDate > today && !isSameDay(startDate, today) && !isSameDay(endDate, today);
        });
        return { checkIns, checkOuts, ongoingStays };
    }, [allBookings]);

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

    if (authLoading || isLoading) {
        return (
            <div className="flex justify-center items-center h-40">
                <Loader2 className="h-8 w-8 animate-spin text-primary" />
                <p className="ml-2">{t('loadingKeyholderDashboard')}</p>
            </div>
        );
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

    if (error) {
        return <p className="text-destructive">{t('errorLoadingDashboardData')}: {error.message}</p>;
    }

    const todayFormatted = formatDualDate(new Date(), 'EEEE, MMMM d, yyyy', 'EEEE, MMMM D, YYYY');

    return (
        <div className="space-y-6">
             <div>
                <h1 className="text-3xl font-bold text-foreground">{t('dailyKeyReport')}</h1>
                <p className="text-muted-foreground flex items-center gap-2">
                    <Calendar className="h-4 w-4" />
                    {t('reportForDate', { date: todayFormatted })}
                </p>
            </div>
            
            <div className="grid grid-cols-1 lg:grid-cols-2 xl:grid-cols-3 gap-6">
                
                <Card>
                    <CardHeader>
                        <CardTitle className="flex items-center gap-2"><LogIn className="text-green-500"/>{t('checkInsToday')} ({dailyReportData.checkIns.length})</CardTitle>
                        <CardDescription>{t('guestsArrivingToday')}</CardDescription>
                    </CardHeader>
                    <CardContent>
                        {dailyReportData.checkIns.length > 0 ? (
                             <Table>
                                <TableHeader><TableRow><TableHead>{t('guestName')}</TableHead><TableHead>{t('roomBooked')}</TableHead><TableHead>{t('keyStatus')}</TableHead></TableRow></TableHeader>
                                <TableBody>
                                    {dailyReportData.checkIns.map(booking => (
                                        <TableRow key={booking.id}>
                                            <TableCell>{booking.guestName}</TableCell>
                                            <TableCell>{booking.items.map(i => i.name).join(', ')}</TableCell>
                                            <TableCell>{getKeyStatusBadge(booking.keyStatus)}</TableCell>
                                        </TableRow>
                                    ))}
                                </TableBody>
                            </Table>
                        ) : (
                            <p className="text-sm text-muted-foreground">{t('noCheckInsScheduledForToday')}</p>
                        )}
                    </CardContent>
                </Card>

                <Card>
                    <CardHeader>
                        <CardTitle className="flex items-center gap-2"><LogOut className="text-red-500"/>{t('checkOutsToday')} ({dailyReportData.checkOuts.length})</CardTitle>
                        <CardDescription>{t('guestsDepartingToday')}</CardDescription>
                    </CardHeader>
                    <CardContent>
                        {dailyReportData.checkOuts.length > 0 ? (
                            <Table>
                                <TableHeader><TableRow><TableHead>{t('guestName')}</TableHead><TableHead>{t('roomBooked')}</TableHead><TableHead>{t('keyStatus')}</TableHead></TableRow></TableHeader>
                                <TableBody>
                                    {dailyReportData.checkOuts.map(booking => (
                                        <TableRow key={booking.id}>
                                            <TableCell>{booking.guestName}</TableCell>
                                            <TableCell>{booking.items.map(i => i.name).join(', ')}</TableCell>
                                            <TableCell>{getKeyStatusBadge(booking.keyStatus)}</TableCell>
                                        </TableRow>
                                    ))}
                                </TableBody>
                            </Table>
                        ) : (
                             <p className="text-sm text-muted-foreground">{t('noCheckOutsScheduledForToday')}</p>
                        )}
                    </CardContent>
                </Card>
                
                <Card className="lg:col-span-2 xl:col-span-1">
                    <CardHeader>
                        <CardTitle className="flex items-center gap-2"><Bed className="text-blue-500"/>{t('ongoingStays')} ({dailyReportData.ongoingStays.length})</CardTitle>
                        <CardDescription>{t('guestsCurrentlyStaying')}</CardDescription>
                    </CardHeader>
                    <CardContent>
                        {dailyReportData.ongoingStays.length > 0 ? (
                            <Table>
                                <TableHeader><TableRow><TableHead>{t('guestName')}</TableHead><TableHead>{t('roomBooked')}</TableHead><TableHead>{t('checkOutDate')}</TableHead></TableRow></TableHeader>
                                <TableBody>
                                    {dailyReportData.ongoingStays.map(booking => (
                                        <TableRow key={booking.id}>
                                            <TableCell>{booking.guestName}</TableCell>
                                            <TableCell>{booking.items.map(i => i.name).join(', ')}</TableCell>
                                            <TableCell>{formatDualDate(booking.endDate, 'MMM d, yy', 'MMM D, YY')}</TableCell>
                                        </TableRow>
                                    ))}
                                </TableBody>
                            </Table>
                        ) : (
                             <p className="text-sm text-muted-foreground">{t('noOngoingStays')}</p>
                        )}
                    </CardContent>
                </Card>

            </div>
        </div>
    );
}
