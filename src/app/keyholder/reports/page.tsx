
"use client";

import React, { useState, useCallback } from 'react';
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { useLanguage } from "@/hooks/use-language";
import { useToast } from "@/hooks/use-toast";
import { Download, FileSpreadsheet, Loader2, KeyRound } from "lucide-react";
import { DatePickerWithRange } from '@/components/ui/date-picker-with-range';
import type { DateRange } from 'react-day-picker';
import { db } from '@/lib/firebase';
import { collection, query, where, getDocs, Timestamp, orderBy } from 'firebase/firestore';
import type { Booking } from '@/types';
import { formatDate } from '@/lib/date-utils';

interface ReportOutput {
  filename: string;
  content: string;
  mimeType: 'text/csv';
}

export default function KeyholderReportsPage() {
  const { t } = useLanguage();
  const { toast } = useToast();
  const [dateRange, setDateRange] = useState<DateRange | undefined>(undefined);
  const [isLoadingReport, setIsLoadingReport] = useState(false);

  const downloadFile = (output: ReportOutput) => {
    const blob = new Blob([output.content], { type: output.mimeType });
    const link = document.createElement('a');
    const url = URL.createObjectURL(blob);
    link.setAttribute('href', url);
    link.setAttribute('download', output.filename);
    link.style.visibility = 'hidden';
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
  };

  const arrayToCsv = (data: any[], headers?: string[]): string => {
    if (!data || data.length === 0) return "";
    const columnHeaders = headers || Object.keys(data[0]);
    const csvRows = [
      columnHeaders.join(','),
      ...data.map(row =>
        columnHeaders.map(fieldName => {
          let cellValue = row[fieldName];
          if (cellValue === null || cellValue === undefined) {
            cellValue = '';
          } else if (typeof cellValue === 'string') {
            cellValue = `"${cellValue.replace(/"/g, '""')}"`;
          }
          return cellValue;
        }).join(',')
      )
    ];
    return csvRows.join('\r\n');
  };

  const generateKeyActivityReport = useCallback(async (): Promise<ReportOutput> => {
    if (!dateRange?.from || !dateRange?.to) throw new Error(t('selectDateRangeFirst'));

    const fromTimestamp = Timestamp.fromDate(dateRange.from);
    const toTimestamp = Timestamp.fromDate(new Date(dateRange.to.setHours(23, 59, 59, 999)));

    // Fetch bookings that are active within the date range
    const q = query(
      collection(db, "bookings"),
      where("bookingCategory", "==", "dormitory"),
      where("approvalStatus", "==", "approved"),
      where("startDate", "<=", toTimestamp)
    );

    const snapshot = await getDocs(q);
    const bookings = snapshot.docs
      .map(doc => ({ id: doc.id, ...doc.data() } as Booking))
      .filter(booking => {
          const endDate = booking.endDate instanceof Timestamp ? booking.endDate.toDate() : new Date(booking.endDate as string);
          return endDate >= dateRange.from!;
      });

    const reportData = bookings.map(b => ({
      [t('guestName')]: b.guestName,
      [t('phone')]: b.phone,
      [t('roomBooked')]: b.items.map(i => i.name).join('; '),
      [t('bookedAt')]: formatDate(b.bookedAt, 'yyyy-MM-dd HH:mm'),
      [t('checkInDate')]: formatDate(b.startDate, 'yyyy-MM-dd'),
      [t('checkOutDate')]: formatDate(b.endDate, 'yyyy-MM-dd'),
      [t('keyStatus')]: t(b.keyStatus || 'keyNotIssued'),
    }));

    return {
      filename: `${t('dormitoryActivityReport')}_${formatDate(new Date(), 'yyyy-MM-dd')}.csv`,
      content: arrayToCsv(reportData),
      mimeType: 'text/csv',
    };
  }, [dateRange, t]);

  const handleGenerateReport = useCallback(async () => {
    setIsLoadingReport(true);
    try {
      const output = await generateKeyActivityReport();
      downloadFile(output);
      toast({ title: t('reportGeneratedSuccess'), description: t('downloadShouldStart') });
    } catch (error: any) {
      toast({ variant: "destructive", title: t('errorGeneratingReport'), description: error.message });
    } finally {
      setIsLoadingReport(false);
    }
  }, [generateKeyActivityReport, toast]);
  
  return (
    <div className="space-y-8">
      <h1 className="text-3xl font-bold text-foreground">{t('keyholderReports')}</h1>

      <Card>
        <CardHeader>
          <CardTitle>{t('reportFilters')}</CardTitle>
          <CardDescription>{t('selectDateRangeForReports')}</CardDescription>
        </CardHeader>
        <CardContent>
          <DatePickerWithRange date={dateRange} onDateChange={setDateRange} />
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>{t('availableReports')}</CardTitle>
          <CardDescription>{t('downloadKeyActivityData')}</CardDescription>
        </CardHeader>
        <CardContent>
          <Card className="shadow-md max-w-sm">
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-lg font-medium">{t('dormitoryActivityReport')}</CardTitle>
              <KeyRound className="h-8 w-8 text-primary" />
            </CardHeader>
            <CardContent>
              <p className="text-sm text-muted-foreground mb-4">{t('dormitoryActivityReportDesc')}</p>
              <Button className="w-full" onClick={handleGenerateReport} disabled={isLoadingReport || !dateRange?.from || !dateRange?.to}>
                {isLoadingReport ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Download className="mr-2 h-4 w-4" />}
                {isLoadingReport ? t('generatingReport') : t('generateReport')}
              </Button>
            </CardContent>
          </Card>
        </CardContent>
      </Card>
    </div>
  );
}
