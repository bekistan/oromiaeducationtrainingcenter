
"use client";

import React from 'react';
import { useQuery } from '@tanstack/react-query';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { useLanguage } from "@/hooks/use-language";
import type { Booking } from "@/types";
import { KeyRound, Hourglass, CheckCircle, Loader2 } from "lucide-react";
import { db } from '@/lib/firebase';
import { collection, query, where, getDocs, Timestamp, orderBy, limit } from 'firebase/firestore';
import { toDateObject, formatDualDate } from '@/lib/date-utils';

const KEYHOLDER_DATA_QUERY_KEY = "keyholderDashboardData";

interface KeyholderStats {
    totalActiveBookings: number;
    keysIssued: number;
    keysPendingIssuance: number;
    recentActivities: Booking[];
}

const fetchKeyholderDashboardData = async (): Promise<KeyholderStats> => {
    const today = new Date();
    today.setHours(0, 0, 0, 0);

    const q = query(
        collection(db, "bookings"),
        where("bookingCategory", "==", "dormitory"),
        where("approvalStatus", "==", "approved"),
        where("endDate", ">=", Timestamp.fromDate(today))
    );
    
    const querySnapshot = await getDocs(q);
    
    const allActiveBookings = querySnapshot.docs.map(docSnap => {
        const data = docSnap.data();
        return {
            id: docSnap.id,
            ...data,
            bookedAt: data.bookedAt instanceof Timestamp ? data.bookedAt.toDate().toISOString() : data.bookedAt,
            startDate: data.startDate instanceof Timestamp ? data.startDate.toDate().toISOString().split('T')[0] : data.startDate,
            endDate: data.endDate instanceof Timestamp ? data.endDate.toDate().toISOString().split('T')[0] : data.endDate,
        } as Booking;
    });

    const stats: KeyholderStats = {
        totalActiveBookings: allActiveBookings.length,
        keysIssued: allActiveBookings.filter(b => b.keyStatus === 'issued').length,
        keysPendingIssuance: allActiveBookings.filter(b => !b.keyStatus || b.keyStatus === 'not_issued').length,
        recentActivities: allActiveBookings
            .sort((a,b) => toDateObject(b.bookedAt)!.getTime() - toDateObject(a.bookedAt)!.getTime())
            .slice(0, 5) // Get the 5 most recently booked
    };

    return stats;
};

export default function KeyholderDashboardPage() {
    const { t } = useLanguage();
    
    const { data: stats, isLoading, error } = useQuery<KeyholderStats, Error>({
        queryKey: [KEYHOLDER_DATA_QUERY_KEY],
        queryFn: fetchKeyholderDashboardData,
    });

    const statCards = [
        { titleKey: "totalActiveBookingsForKeyholder", value: stats?.totalActiveBookings, icon: <KeyRound className="h-6 w-6 text-primary" />, detailsKey: "bookingsRequiringKeyManagement" },
        { titleKey: "keysIssued", value: stats?.keysIssued, icon: <CheckCircle className="h-6 w-6 text-green-600" />, detailsKey: "keysCurrentlyWithGuests" },
        { titleKey: "keysPendingIssuance", value: stats?.keysPendingIssuance, icon: <Hourglass className="h-6 w-6 text-amber-600" />, detailsKey: "keysToBeIssuedToNewGuests" },
    ];

    if (isLoading) {
        return (
            <div className="flex justify-center items-center h-40">
                <Loader2 className="h-8 w-8 animate-spin text-primary" />
                <p className="ml-2">{t('loadingKeyholderDashboard')}</p>
            </div>
        );
    }

    if (error) {
        return <p className="text-destructive">{t('errorLoadingDashboardData')}: {error.message}</p>;
    }
    
    return (
        <div className="space-y-6">
            <h1 className="text-3xl font-bold text-foreground">{t('keyholderDashboard')}</h1>
            
            <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
                {statCards.map(stat => (
                    <Card key={stat.titleKey}>
                        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                            <CardTitle className="text-sm font-medium text-muted-foreground">{t(stat.titleKey)}</CardTitle>
                            {stat.icon}
                        </CardHeader>
                        <CardContent>
                            <div className="text-2xl font-bold text-foreground">{stat.value ?? '0'}</div>
                            <p className="text-xs text-muted-foreground">{t(stat.detailsKey)}</p>
                        </CardContent>
                    </Card>
                ))}
            </div>

            <Card>
                <CardHeader>
                    <CardTitle>{t('upcomingBookingsAndRecentActivity')}</CardTitle>
                    <CardDescription>{t('latestBookingsNeedingKeys')}</CardDescription>
                </CardHeader>
                <CardContent>
                    {stats?.recentActivities && stats.recentActivities.length > 0 ? (
                        <Table>
                            <TableHeader>
                                <TableRow>
                                    <TableHead>{t('guestName')}</TableHead>
                                    <TableHead>{t('roomBooked')}</TableHead>
                                    <TableHead>{t('checkInDate')}</TableHead>
                                </TableRow>
                            </TableHeader>
                            <TableBody>
                                {stats.recentActivities.map(booking => (
                                    <TableRow key={booking.id}>
                                        <TableCell>{booking.guestName}</TableCell>
                                        <TableCell>{booking.items.map(i => i.name).join(', ')}</TableCell>
                                        <TableCell className="text-xs">{formatDualDate(booking.startDate, 'MMM d, yy', 'MMM D, YY')}</TableCell>
                                    </TableRow>
                                ))}
                            </TableBody>
                        </Table>
                    ) : (
                        <p className="text-muted-foreground">{t('noRecentActivityOrUpcomingBookings')}</p>
                    )}
                </CardContent>
            </Card>
        </div>
    );
}
