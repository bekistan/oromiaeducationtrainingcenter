
"use client";

import React, { useState, useCallback } from 'react';
import { PublicLayout } from "@/components/layout/public-layout";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { useLanguage } from "@/hooks/use-language";
import { useAuth } from "@/hooks/use-auth";
import { useToast } from "@/hooks/use-toast";
import { Download, FileSpreadsheet, Loader2, CalendarDays, ShieldAlert, ArrowLeft } from "lucide-react";
import { DatePickerWithRange } from '@/components/ui/date-picker-with-range';
import type { DateRange } from 'react-day-picker';
import { db } from '@/lib/firebase';
import { collection, query, where, getDocs, Timestamp, orderBy } from 'firebase/firestore';
import type { Booking } from '@/types';
import { formatDualDate, formatDateForDisplay } from '@/lib/date-utils';
import { useRouter } from 'next/navigation';

interface ReportOutput {
  filename: string;
  content: string;
  mimeType: 'text/csv';
}

export default function CompanyReportsPage() {
  const { t, preferredCalendarSystem } = useLanguage();
  const { user, loading: authLoading } = useAuth();
  const router = useRouter();
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

  const generateBookingHistoryReport = useCallback(async (): Promise<ReportOutput> => {
    if (!user || !user.companyId) throw new Error(t('userNotAuthenticatedOrNoCompany'));
    if (!dateRange?.from || !dateRange?.to) throw new Error(t('selectDateRangeFirst'));

    const q = query(
      collection(db, "bookings"),
      where("companyId", "==", user.companyId),
      where("bookedAt", ">=", Timestamp.fromDate(dateRange.from)),
      where("bookedAt", "<=", Timestamp.fromDate(new Date(dateRange.to.setHours(23, 59, 59, 999)))),
      orderBy("bookedAt", "desc")
    );

    const snapshot = await getDocs(q);
    const bookings = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as Booking));

    const reportData = bookings.map(b => ({
      [t('bookingId')]: b.id,
      [t('itemsBooked')]: b.items.map(i => i.name).join('; '),
      [t('startDate')]: formatDateForDisplay(b.startDate, preferredCalendarSystem),
      [t('endDate')]: formatDateForDisplay(b.endDate, preferredCalendarSystem),
      [t('totalCost')]: b.totalCost,
      [t('paymentStatus')]: t(b.paymentStatus),
      [t('approvalStatus')]: t(b.approvalStatus),
      [t('agreementStatus')]: b.agreementStatus ? t(b.agreementStatus) : t('notApplicable'),
      [t('bookedOn')]: formatDualDate(b.bookedAt),
    }));

    return {
      filename: `${t('bookingHistoryReport')}_${formatDateForDisplay(new Date(), 'gregorian', 'yyyy-MM-dd')}.csv`,
      content: arrayToCsv(reportData),
      mimeType: 'text/csv',
    };
  }, [user, dateRange, t, preferredCalendarSystem]);

  const handleGenerateReport = useCallback(async () => {
    setIsLoadingReport(true);
    try {
      const output = await generateBookingHistoryReport();
      downloadFile(output);
      toast({ title: t('reportGeneratedSuccess'), description: t('downloadShouldStart') });
    } catch (error: any) {
      toast({ variant: "destructive", title: t('errorGeneratingReport'), description: error.message });
    } finally {
      setIsLoadingReport(false);
    }
  }, [generateBookingHistoryReport, toast]);
  
  if (authLoading) {
    return <PublicLayout><div className="flex justify-center items-center h-screen"><Loader2 className="h-8 w-8 animate-spin text-primary" /></div></PublicLayout>;
  }

  if (!user || user.role !== 'company_representative') {
    return (
      <PublicLayout>
        <Card className="w-full max-w-md mx-auto my-8">
            <CardHeader><CardTitle className="text-destructive flex items-center"><ShieldAlert className="mr-2"/>{t('accessDenied')}</CardTitle></CardHeader>
            <CardContent><p>{t('mustBeLoggedInAsCompanyToViewReports')}</p><Button onClick={() => router.push('/auth/login')} className="mt-4">{t('login')}</Button></CardContent>
        </Card>
      </PublicLayout>
    );
  }

  return (
    <PublicLayout>
        <div className="container mx-auto py-8 px-4 space-y-8">
            <div className="flex items-center gap-4">
                 <Button variant="outline" size="icon" onClick={() => router.back()}>
                    <ArrowLeft className="h-4 w-4" />
                </Button>
                <div>
                    <h1 className="text-3xl font-bold text-foreground">{t('companyReports')}</h1>
                    <p className="text-muted-foreground">{t('companyReportsSubtitle')}</p>
                </div>
            </div>
            

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
                <CardDescription>{t('downloadYourBookingData')}</CardDescription>
                </CardHeader>
                <CardContent>
                    <Card className="shadow-md max-w-sm">
                        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                            <CardTitle className="text-lg font-medium">{t('bookingHistoryReport')}</CardTitle>
                            <FileSpreadsheet className="h-8 w-8 text-primary" />
                        </CardHeader>
                        <CardContent>
                            <p className="text-sm text-muted-foreground mb-4">{t('bookingHistoryReportDesc')}</p>
                            <Button className="w-full" onClick={handleGenerateReport} disabled={isLoadingReport || !dateRange?.from || !dateRange?.to}>
                                {isLoadingReport ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Download className="mr-2 h-4 w-4" />}
                                {isLoadingReport ? t('generatingReport') : t('generateReport')}
                            </Button>
                        </CardContent>
                    </Card>
                </CardContent>
            </Card>
        </div>
    </PublicLayout>
  );
}
