
"use client";

import React, { useState, useEffect } from 'react';
import { useQuery } from '@tanstack/react-query';
import { collection, query, orderBy, onSnapshot, Timestamp } from 'firebase/firestore';
import { db } from '@/lib/firebase';
import type { AttendanceRecord } from '@/types';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Loader2, ArrowRight, ArrowLeft } from 'lucide-react';
import { formatDate } from '@/lib/date-utils';
import { Badge } from '@/components/ui/badge';
import { useLanguage } from '@/hooks/use-language';
import { useSimpleTable } from '@/hooks/use-simple-table';
import { Button } from '@/components/ui/button';
import { ChevronLeft, ChevronRight } from 'lucide-react';
import { Input } from '@/components/ui/input';

const ATTENDANCE_QUERY_KEY = "attendanceLog";

export default function AttendanceLogPage() {
    const { t } = useLanguage();
    const [attendanceLog, setAttendanceLog] = useState<AttendanceRecord[]>([]);
    const [isLoading, setIsLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);

    useEffect(() => {
        if (!db) {
            setError(t('databaseConnectionError'));
            setIsLoading(false);
            return;
        }
        
        const q = query(collection(db, "attendance"), orderBy("timestamp", "desc"));

        const unsubscribe = onSnapshot(q, (querySnapshot) => {
            const logs = querySnapshot.docs.map(doc => ({
                id: doc.id,
                ...doc.data(),
                timestamp: (doc.data().timestamp as Timestamp).toDate().toISOString()
            } as AttendanceRecord));
            setAttendanceLog(logs);
            setIsLoading(false);
        }, (err) => {
            console.error("Error fetching attendance log:", err);
            setError(t('errorFetchingAttendance'));
            setIsLoading(false);
        });

        return () => unsubscribe();
    }, [t]);

    const {
        paginatedData,
        setSearchTerm,
        searchTerm,
        currentPage,
        pageCount,
        nextPage,
        previousPage,
        canNextPage,
        canPreviousPage,
    } = useSimpleTable({
        data: attendanceLog,
        rowsPerPage: 15,
        searchKeys: ['employeeName', 'type'],
    });

    if (isLoading) {
        return (
            <div className="flex justify-center items-center h-40">
                <Loader2 className="h-8 w-8 animate-spin" />
            </div>
        );
    }
    
    if (error) {
        return <p className="text-destructive">{error}</p>;
    }

    return (
        <div className="space-y-6">
            <h1 className="text-3xl font-bold">{t('attendanceLog')}</h1>

            <Input 
                placeholder={t('searchByNameOrStatus')}
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="max-w-sm"
            />
            
            <Card>
                <CardHeader>
                    <CardTitle>{t('attendanceRecords')}</CardTitle>
                    <CardDescription>{t('realTimeAttendanceLog')}</CardDescription>
                </CardHeader>
                <CardContent>
                    <Table>
                        <TableHeader>
                            <TableRow>
                                <TableHead>{t('employeeName')}</TableHead>
                                <TableHead>{t('status')}</TableHead>
                                <TableHead>{t('time')}</TableHead>
                                <TableHead>{t('date')}</TableHead>
                            </TableRow>
                        </TableHeader>
                        <TableBody>
                            {paginatedData.length > 0 ? paginatedData.map(log => (
                                <TableRow key={log.id}>
                                    <TableCell>{log.employeeName}</TableCell>
                                    <TableCell>
                                        <Badge variant={log.type === 'check-in' ? 'default' : 'secondary'} className={log.type === 'check-in' ? 'bg-green-100 text-green-700' : 'bg-red-100 text-red-700'}>
                                            {log.type === 'check-in' ? <ArrowRight className="mr-1 h-3 w-3" /> : <ArrowLeft className="mr-1 h-3 w-3" />}
                                            {t(log.type)}
                                        </Badge>
                                    </TableCell>
                                    <TableCell>{formatDate(log.timestamp, 'HH:mm:ss')}</TableCell>
                                    <TableCell>{formatDate(log.timestamp, 'MMM d, yyyy')}</TableCell>
                                </TableRow>
                            )) : (
                                <TableRow>
                                    <TableCell colSpan={4} className="h-24 text-center">{t('noAttendanceRecordsFound')}</TableCell>
                                </TableRow>
                            )}
                        </TableBody>
                    </Table>
                    <div className="flex items-center justify-end space-x-2 py-4">
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => previousPage()}
                          disabled={!canPreviousPage}
                        >
                          {t('previous')}
                        </Button>
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => nextPage()}
                          disabled={!canNextPage}
                        >
                          {t('next')}
                        </Button>
                    </div>
                </CardContent>
            </Card>
        </div>
    );
}
