
"use client";

import React, { useState, useCallback } from 'react';
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { useLanguage } from "@/hooks/use-language";
import { useToast } from "@/hooks/use-toast";
import { Download, FileSpreadsheet, FileText, CalendarDays, Printer, Loader2, BarChart3 } from "lucide-react";
import { DatePickerWithRange } from '@/components/ui/date-picker-with-range';
import type { DateRange } from 'react-day-picker';
import { db } from '@/lib/firebase';
import { collection, query, where, getDocs, Timestamp, orderBy, limit, getCountFromServer } from 'firebase/firestore';
import type { Booking } from '@/types';

interface ReportData {
  title: string;
  data: any[] | Record<string, any>;
  type: 'list' | 'summary';
}

export default function AdminReportsPage() {
  const { t } = useLanguage();
  const { toast } = useToast();
  const [dateRange, setDateRange] = useState<DateRange | undefined>(undefined);
  const [reportData, setReportData] = useState<ReportData | null>(null);
  const [isReportDialogOpen, setIsReportDialogOpen] = useState(false);
  const [currentReportTitle, setCurrentReportTitle] = useState('');
  const [isLoadingReport, setIsLoadingReport] = useState(false);

  const formatDate = (date: Date | Timestamp | undefined | string) => {
    if (!date) return 'N/A';
    let d: Date;
    if (date instanceof Timestamp) d = date.toDate();
    else if (typeof date === 'string') d = new Date(date);
    else d = date;
    
    return isNaN(d.getTime()) ? t('invalidDate') : d.toLocaleDateString();
  };

  const generateUserDormReport = async (range?: DateRange): Promise<ReportData> => {
    if (!range?.from || !range?.to) throw new Error(t('selectDateRangeFirst'));
    const q = query(
      collection(db, "bookings"),
      where("bookingCategory", "==", "dormitory"),
      where("startDate", ">=", Timestamp.fromDate(range.from)),
      where("startDate", "<=", Timestamp.fromDate(new Date(range.to.setHours(23, 59, 59, 999)))), // Include full end day
      orderBy("startDate", "desc")
    );
    const snapshot = await getDocs(q);
    const bookings = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as Booking));
    return {
      title: t('userDormReport'),
      data: bookings.map(b => ({ 
        [t('bookingId')]: b.id.substring(0,8), 
        [t('guestName')]: b.guestName || t('notAvailable'), 
        [t('item')]: b.items.map(i=>i.name).join(', '), 
        [t('startDate')]: formatDate(b.startDate), 
        [t('endDate')]: formatDate(b.endDate),
        [t('totalCost')]: `${b.totalCost} ETB`
      })),
      type: 'list',
    };
  };

  const generateFinancialSummary = async (range?: DateRange): Promise<ReportData> => {
    if (!range?.from || !range?.to) throw new Error(t('selectDateRangeFirst'));
     const q = query(
      collection(db, "bookings"),
      where("paymentStatus", "==", "paid"),
      where("bookedAt", ">=", Timestamp.fromDate(range.from)),
      where("bookedAt", "<=", Timestamp.fromDate(new Date(range.to.setHours(23, 59, 59, 999)))) // Include full end day
    );
    const snapshot = await getDocs(q);
    let totalRevenue = 0;
    snapshot.docs.forEach(doc => {
      totalRevenue += (doc.data() as Booking).totalCost;
    });
    return {
      title: t('financialSummaryReport'),
      data: { 
        [t('totalRevenue')]: `${totalRevenue.toLocaleString()} ETB`, 
        [t('period')]: `${formatDate(range.from)} - ${formatDate(range.to)}`, 
        [t('bookingsCount')]: snapshot.size 
      },
      type: 'summary',
    };
  };
  
  const generateHallUtilizationReport = async (range?: DateRange): Promise<ReportData> => {
    if (!range?.from || !range?.to) throw new Error(t('selectDateRangeFirst'));
    const q = query(
      collection(db, "bookings"),
      where("bookingCategory", "==", "facility"),
      where("startDate", ">=", Timestamp.fromDate(range.from)),
      where("startDate", "<=", Timestamp.fromDate(new Date(range.to.setHours(23, 59, 59, 999)))), // Include full end day
      orderBy("startDate", "desc")
    );
    const snapshot = await getDocs(q);
    const bookings = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as Booking));
    return {
      title: t('hallUtilizationReport'),
      data: bookings.map(b => ({ 
        [t('bookingId')]: b.id.substring(0,8), 
        [t('companyName')]: b.companyName || t('notAvailable'), 
        [t('item')]: b.items.map(i=>i.name).join(', '), 
        [t('startDate')]: formatDate(b.startDate), 
        [t('endDate')]: formatDate(b.endDate),
        [t('totalCost')]: `${b.totalCost} ETB`
      })),
      type: 'list',
    };
  };

  const generateOccupancyAnalytics = async (range?: DateRange): Promise<ReportData> => {
    if (!range?.from || !range?.to) throw new Error(t('selectDateRangeFirst'));

    const startTimestamp = Timestamp.fromDate(range.from);
    const endTimestamp = Timestamp.fromDate(new Date(range.to.setHours(23, 59, 59, 999))); // Include full end day

    const dormBookingsQuery = query(
      collection(db, "bookings"),
      where("bookingCategory", "==", "dormitory"),
      where("startDate", ">=", startTimestamp),
      where("startDate", "<=", endTimestamp)
    );
    const facilityBookingsQuery = query(
      collection(db, "bookings"),
      where("bookingCategory", "==", "facility"),
      where("startDate", ">=", startTimestamp),
      where("startDate", "<=", endTimestamp)
    );

    const [dormSnapshot, facilitySnapshot] = await Promise.all([
        getCountFromServer(dormBookingsQuery),
        getCountFromServer(facilityBookingsQuery)
    ]);
    
    const dormBookingsCount = dormSnapshot.data().count;
    const facilityBookingsCount = facilitySnapshot.data().count;

    return {
      title: t('occupancyAnalyticsReport'),
      data: { 
        [t('dormitoryBookings')]: dormBookingsCount, // Add to JSON
        [t('facilityBookings')]: facilityBookingsCount, // Add to JSON
        [t('period')]: `${formatDate(range.from)} - ${formatDate(range.to)}`
      },
      type: 'summary',
    };
  };

  const generatePeriodicDormBookings = async (period: 'daily' | 'weekly' | 'monthly', range?: DateRange): Promise<ReportData> => {
    if (!range?.from || !range?.to) throw new Error(t('selectDateRangeFirst'));
    
    const q = query(
      collection(db, "bookings"),
      where("bookingCategory", "==", "dormitory"),
      where("startDate", ">=", Timestamp.fromDate(range.from)),
      where("startDate", "<=", Timestamp.fromDate(new Date(range.to.setHours(23, 59, 59, 999)))), // Include full end day
      orderBy("startDate", "desc"),
      limit(30) // Limit for preview; full report would need different handling
    );
    const snapshot = await getDocs(q);
    const bookings = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as Booking));
    
    let reportTitleKey = '';
    if (period === 'daily') reportTitleKey = 'dailyDormBookingsReport';
    else if (period === 'weekly') reportTitleKey = 'weeklyDormBookingsReport';
    else reportTitleKey = 'monthlyDormBookingsReport';

    return {
      title: t(reportTitleKey),
      data: bookings.map(b => ({ 
        [t('guestName')]: b.guestName || t('notAvailable'), 
        [t('roomNumber')]: b.items.map(i=>i.name).join(', '), 
        [t('dates')]: `${formatDate(b.startDate)} - ${formatDate(b.endDate)}`,
        [t('totalCost')]: `${b.totalCost} ETB`
      })),
      type: 'list',
    };
  };


  const handleGenerateReport = useCallback(async (reportFn: () => Promise<ReportData>, titleKey: string) => {
    if (!dateRange || !dateRange.from || !dateRange.to) {
      toast({ variant: "destructive", title: t('error'), description: t('selectDateRangeFirst') });
      return;
    }
    setIsLoadingReport(true);
    setCurrentReportTitle(t(titleKey));
    try {
      const data = await reportFn();
      setReportData(data);
      setIsReportDialogOpen(true);
    } catch (error: any) {
      console.error(`Error generating report "${titleKey}":`, error);
      toast({ variant: "destructive", title: t('errorGeneratingReport'), description: error.message || t('unknownError') });
    } finally {
      setIsLoadingReport(false);
    }
  }, [dateRange, t, toast]);


  const reportTypes = [
    { id: "user_dorm_report", nameKey: "userDormReport", icon: <FileSpreadsheet className="h-8 w-8 text-primary" />, format: "Excel/PDF", action: () => handleGenerateReport(() => generateUserDormReport(dateRange), "userDormReport") },
    { id: "financial_summary", nameKey: "financialSummaryReport", icon: <FileText className="h-8 w-8 text-primary" />, format: "PDF", action: () => handleGenerateReport(() => generateFinancialSummary(dateRange), "financialSummaryReport") },
    { id: "hall_utilization", nameKey: "hallUtilizationReport", icon: <FileSpreadsheet className="h-8 w-8 text-primary" />, format: "Excel/PDF", action: () => handleGenerateReport(() => generateHallUtilizationReport(dateRange), "hallUtilizationReport") },
    { id: "occupancy_analytics", nameKey: "occupancyAnalyticsReport", icon: <BarChart3 className="h-8 w-8 text-primary" />, format: "PDF", action: () => handleGenerateReport(() => generateOccupancyAnalytics(dateRange), "occupancyAnalyticsReport") },
  ];

  const dormitoryReportTypes = [
    { id: "daily_dorm_bookings", nameKey: "dailyDormBookingsReport", icon: <CalendarDays className="h-8 w-8 text-primary" />, format: "Print/PDF", action: () => handleGenerateReport(() => generatePeriodicDormBookings('daily', dateRange), "dailyDormBookingsReport") },
    { id: "weekly_dorm_bookings", nameKey: "weeklyDormBookingsReport", icon: <CalendarDays className="h-8 w-8 text-primary" />, format: "Print/PDF", action: () => handleGenerateReport(() => generatePeriodicDormBookings('weekly', dateRange), "weeklyDormBookingsReport") },
    { id: "monthly_dorm_bookings", nameKey: "monthlyDormBookingsReport", icon: <CalendarDays className="h-8 w-8 text-primary" />, format: "Print/PDF", action: () => handleGenerateReport(() => generatePeriodicDormBookings('monthly', dateRange), "monthlyDormBookingsReport") },
  ];

  return (
    <div className="space-y-8">
      <h1 className="text-3xl font-bold text-foreground">{t('reports')}</h1>

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
          <CardTitle>{t('generateGeneralReports')}</CardTitle>
          <CardDescription>{t('selectReportTypeAndDateRange')}</CardDescription>
        </CardHeader>
        <CardContent className="grid grid-cols-1 gap-6 md:grid-cols-2 lg:grid-cols-3">
          {reportTypes.map(report => (
            <Card key={report.id} className="shadow-md">
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-lg font-medium">{t(report.nameKey)}</CardTitle>
                {report.icon}
              </CardHeader>
              <CardContent>
                <p className="text-sm text-muted-foreground mb-4">
                  {t('format')}: {report.format}
                </p>
                <Button className="w-full" onClick={report.action} disabled={isLoadingReport || !dateRange?.from || !dateRange?.to}>
                  {isLoadingReport && currentReportTitle === t(report.nameKey) ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Download className="mr-2 h-4 w-4" />}
                  {isLoadingReport && currentReportTitle === t(report.nameKey) ? t('generatingReport') : t('generateReport')}
                </Button>
              </CardContent>
            </Card>
          ))}
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>{t('dormitoryBookingReports')}</CardTitle>
          <CardDescription>{t('viewOrPrintDormitoryBookingData')}</CardDescription>
        </CardHeader>
        <CardContent className="grid grid-cols-1 gap-6 md:grid-cols-2 lg:grid-cols-3">
          {dormitoryReportTypes.map(report => (
            <Card key={report.id} className="shadow-md">
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-lg font-medium">{t(report.nameKey)}</CardTitle>
                {report.icon}
              </CardHeader>
              <CardContent>
                <p className="text-sm text-muted-foreground mb-4">
                  {t('format')}: {report.format}
                </p>
                <Button className="w-full" onClick={report.action} disabled={isLoadingReport || !dateRange?.from || !dateRange?.to}>
                  {isLoadingReport && currentReportTitle === t(report.nameKey) ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Printer className="mr-2 h-4 w-4" />}
                   {isLoadingReport && currentReportTitle === t(report.nameKey) ? t('generatingReport') : t('generateReport')}
                </Button>
              </CardContent>
            </Card>
          ))}
        </CardContent>
      </Card>

      <Dialog open={isReportDialogOpen} onOpenChange={setIsReportDialogOpen}>
        <DialogContent className="sm:max-w-2xl max-h-[80vh] flex flex-col">
          <DialogHeader>
            <DialogTitle>{currentReportTitle || t('reportPreview')}</DialogTitle>
          </DialogHeader>
          <div className="overflow-y-auto py-4 px-1 flex-grow">
            {reportData?.data && (Array.isArray(reportData.data) ? reportData.data.length > 0 : Object.keys(reportData.data).length > 0) ? (
              reportData.type === 'list' && Array.isArray(reportData.data) ? (
                <div className="space-y-2">
                  {reportData.data.length > 0 ? reportData.data.map((item, index) => (
                    <Card key={index} className="p-3 text-sm">
                      {Object.entries(item).map(([key, value]) => (
                        <div key={key} className="flex justify-between py-0.5 border-b border-border/50 last:border-b-0">
                          <span className="font-medium text-muted-foreground">{key}:</span>
                          <span className="text-right">{String(value)}</span>
                        </div>
                      ))}
                    </Card>
                  )) : <p className="text-center text-muted-foreground">{t('noDataForReport')}</p>}
                </div>
              ) : reportData.type === 'summary' && typeof reportData.data === 'object' && !Array.isArray(reportData.data) ? (
                 <div className="space-y-1">
                    {Object.entries(reportData.data).map(([key, value]) => (
                       <div key={key} className="flex justify-between text-sm p-2 border-b">
                          <span className="font-medium text-muted-foreground">{key}:</span>
                          <span className="font-semibold text-right">{String(value)}</span>
                        </div>
                    ))}
                 </div>
              ) : <p className="text-center text-muted-foreground">{t('noDataForReport')}</p>
            ) : (
              <p className="text-center text-muted-foreground">{t('noDataForReport')}</p>
            )}
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setIsReportDialogOpen(false)}>{t('close')}</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
