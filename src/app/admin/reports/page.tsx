
"use client";

import React, { useState, useCallback } from 'react';
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { useLanguage } from "@/hooks/use-language";
import { useAuth } from "@/hooks/use-auth";
import { useToast } from "@/hooks/use-toast";
import { Download, FileSpreadsheet, FileText, CalendarDays, Printer, Loader2, BarChart3, Users, Building, ShieldAlert } from "lucide-react";
import { DatePickerWithRange } from '@/components/ui/date-picker-with-range';
import type { DateRange } from 'react-day-picker';
import { db } from '@/lib/firebase';
import { collection, query, where, getDocs, Timestamp, orderBy, limit, getCountFromServer } from 'firebase/firestore';
import type { Booking, User as AppUserType } from '@/types';
import { formatDualDate, formatDateForDisplay } from '@/lib/date-utils';
import { useRouter } from 'next/navigation';

interface ReportOutput {
  filename: string;
  content: string;
  mimeType: 'text/csv' | 'text/plain' | 'application/json';
}


export default function AdminReportsPage() {
  const { t, preferredCalendarSystem } = useLanguage();
  const { user, loading: authLoading } = useAuth();
  const router = useRouter();
  const { toast } = useToast();
  const [dateRange, setDateRange] = useState<DateRange | undefined>(undefined);
  const [isLoadingReport, setIsLoadingReport] = useState(false);
  const [currentGeneratingReportId, setCurrentGeneratingReportId] = useState<string | null>(null);

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


  const generateUserDormReport = async (range?: DateRange): Promise<ReportOutput> => {
    if (!range?.from || !range?.to) throw new Error(t('selectDateRangeFirst'));
    const q = query(
      collection(db, "bookings"),
      where("bookingCategory", "==", "dormitory"),
      where("startDate", ">=", Timestamp.fromDate(range.from)),
      where("startDate", "<=", Timestamp.fromDate(new Date(range.to.setHours(23, 59, 59, 999)))), 
      orderBy("startDate", "desc")
    );
    const snapshot = await getDocs(q);
    const bookings = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as Booking));
    const reportData = bookings.map(b => ({ 
      [t('bookingId')]: b.id.substring(0,8), 
      [t('guestName')]: b.guestName || t('notAvailable'), 
      [t('item')]: b.items.map(i=>i.name).join(', '), 
      [t('startDate')]: formatDateForDisplay(b.startDate, preferredCalendarSystem, 'yyyy-MM-dd', 'YYYY-MM-DD'),
      [t('endDate')]: formatDateForDisplay(b.endDate, preferredCalendarSystem, 'yyyy-MM-dd', 'YYYY-MM-DD'),
      [t('totalCost')]: b.totalCost,
      [t('paymentStatus')]: t(b.paymentStatus),
      [t('approvalStatus')]: t(b.approvalStatus),
    }));
    return {
      filename: `${t('userDormReport')}_${formatDateForDisplay(new Date(), 'gregorian', 'yyyy-MM-dd')}.csv`,
      content: arrayToCsv(reportData),
      mimeType: 'text/csv',
    };
  };

  const generateFinancialSummary = async (range?: DateRange): Promise<ReportOutput> => {
    if (!range?.from || !range?.to) throw new Error(t('selectDateRangeFirst'));
     const q = query(
      collection(db, "bookings"),
      where("paymentStatus", "==", "paid"),
      where("bookedAt", ">=", Timestamp.fromDate(range.from)),
      where("bookedAt", "<=", Timestamp.fromDate(new Date(range.to.setHours(23, 59, 59, 999)))) 
    );
    const snapshot = await getDocs(q);
    let totalRevenue = 0;
    snapshot.docs.forEach(doc => {
      totalRevenue += (doc.data() as Booking).totalCost;
    });
    const summaryText = `
${t('financialSummaryReport')}
---------------------------------
${t('period')}: ${formatDateForDisplay(range.from, preferredCalendarSystem, 'yyyy-MM-dd', 'YYYY-MM-DD')} - ${formatDateForDisplay(range.to, preferredCalendarSystem, 'yyyy-MM-dd', 'YYYY-MM-DD')}
${t('totalRevenue')}: ${totalRevenue.toLocaleString()} ${t('currencySymbol')}
${t('bookingsCount')}: ${snapshot.size}
    `;
    return {
      filename: `${t('financialSummaryReport')}_${formatDateForDisplay(new Date(), 'gregorian', 'yyyy-MM-dd')}.txt`,
      content: summaryText.trim(),
      mimeType: 'text/plain',
    };
  };
  
  const generateHallUtilizationReport = async (range?: DateRange): Promise<ReportOutput> => {
    if (!range?.from || !range?.to) throw new Error(t('selectDateRangeFirst'));
    const q = query(
      collection(db, "bookings"),
      where("bookingCategory", "==", "facility"),
      where("startDate", ">=", Timestamp.fromDate(range.from)),
      where("startDate", "<=", Timestamp.fromDate(new Date(range.to.setHours(23, 59, 59, 999)))), 
      orderBy("startDate", "desc")
    );
    const snapshot = await getDocs(q);
    const bookings = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as Booking));
    const reportData = bookings.map(b => ({ 
      [t('bookingId')]: b.id.substring(0,8), 
      [t('companyName')]: b.companyName || t('notAvailable'), 
      [t('item')]: b.items.map(i=>i.name).join(', '), 
      [t('startDate')]: formatDateForDisplay(b.startDate, preferredCalendarSystem, 'yyyy-MM-dd', 'YYYY-MM-DD'),
      [t('endDate')]: formatDateForDisplay(b.endDate, preferredCalendarSystem, 'yyyy-MM-dd', 'YYYY-MM-DD'),
      [t('totalCost')]: b.totalCost,
      [t('paymentStatus')]: t(b.paymentStatus),
      [t('approvalStatus')]: t(b.approvalStatus),
    }));
    return {
      filename: `${t('hallUtilizationReport')}_${formatDateForDisplay(new Date(), 'gregorian', 'yyyy-MM-dd')}.csv`,
      content: arrayToCsv(reportData),
      mimeType: 'text/csv',
    };
  };

  const generateOccupancyAnalytics = async (range?: DateRange): Promise<ReportOutput> => {
    if (!range?.from || !range?.to) throw new Error(t('selectDateRangeFirst'));
    const startTimestamp = Timestamp.fromDate(range.from);
    const endTimestamp = Timestamp.fromDate(new Date(range.to.setHours(23, 59, 59, 999)));
    const dormBookingsQuery = query(collection(db, "bookings"), where("bookingCategory", "==", "dormitory"), where("startDate", ">=", startTimestamp), where("startDate", "<=", endTimestamp));
    const facilityBookingsQuery = query(collection(db, "bookings"), where("bookingCategory", "==", "facility"), where("startDate", ">=", startTimestamp), where("startDate", "<=", endTimestamp));
    const [dormSnapshot, facilitySnapshot] = await Promise.all([ getCountFromServer(dormBookingsQuery), getCountFromServer(facilityBookingsQuery) ]);
    const summaryText = `
${t('occupancyAnalyticsReport')}
---------------------------------
${t('period')}: ${formatDateForDisplay(range.from, preferredCalendarSystem, 'yyyy-MM-dd', 'YYYY-MM-DD')} - ${formatDateForDisplay(range.to, preferredCalendarSystem, 'yyyy-MM-dd', 'YYYY-MM-DD')}
${t('dormitoryBookings')}: ${dormSnapshot.data().count}
${t('facilityBookings')}: ${facilitySnapshot.data().count}
    `;
    return {
      filename: `${t('occupancyAnalyticsReport')}_${formatDateForDisplay(new Date(), 'gregorian', 'yyyy-MM-dd')}.txt`,
      content: summaryText.trim(),
      mimeType: 'text/plain',
    };
  };

  const generatePeriodicBookingsReport = async (category: 'dormitory' | 'facility', periodTitleKey: string, range?: DateRange): Promise<ReportOutput> => {
    if (!range?.from || !range?.to) throw new Error(t('selectDateRangeFirst'));
    const q = query(
      collection(db, "bookings"),
      where("bookingCategory", "==", category),
      where("startDate", ">=", Timestamp.fromDate(range.from)),
      where("startDate", "<=", Timestamp.fromDate(new Date(range.to.setHours(23, 59, 59, 999)))), 
      orderBy("startDate", "desc"),
      limit(100) 
    );
    const snapshot = await getDocs(q);
    const bookings = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as Booking));
    const reportData = bookings.map(b => ({ 
      [t('bookingId')]: b.id.substring(0,8),
      [category === 'dormitory' ? t('guestName') : t('companyName')]: category === 'dormitory' ? b.guestName : b.companyName || t('notAvailable'), 
      [t('item')]: b.items.map(i=>i.name).join(', '), 
      [t('dates')]: `${formatDateForDisplay(b.startDate, preferredCalendarSystem, 'yyyy-MM-dd', 'YYYY-MM-DD')} - ${formatDateForDisplay(b.endDate, preferredCalendarSystem, 'yyyy-MM-dd', 'YYYY-MM-DD')}`,
      [t('totalCost')]: b.totalCost,
      [t('paymentStatus')]: t(b.paymentStatus),
      [t('approvalStatus')]: t(b.approvalStatus),
    }));
     return {
      filename: `${t(periodTitleKey)}_${category}_${formatDateForDisplay(new Date(), 'gregorian', 'yyyy-MM-dd')}.csv`,
      content: arrayToCsv(reportData),
      mimeType: 'text/csv',
    };
  };

  const generateCompanyRegistrationReport = async (range?: DateRange): Promise<ReportOutput> => {
    if (!range?.from || !range?.to) throw new Error(t('selectDateRangeFirst'));
    const companiesQuery = query(
      collection(db, "users"), 
      where("role", "==", "company_representative"),
      where("createdAt", ">=", Timestamp.fromDate(range.from)),
      where("createdAt", "<=", Timestamp.fromDate(new Date(range.to.setHours(23, 59, 59, 999)))),
      orderBy("createdAt", "desc")
    );
    const snapshot = await getDocs(companiesQuery);
    const companies = snapshot.docs.map(doc => doc.data() as AppUserType);
    const reportData = companies.map(c => ({
      [t('companyName')]: c.companyName || t('notAvailable'),
      [t('contactPerson')]: c.name || t('notAvailable'),
      [t('email')]: c.email,
      [t('phone')]: c.phone || t('notProvided'),
      [t('approvalStatus')]: t(c.approvalStatus || 'pending'),
      [t('registrationDate')]: formatDateForDisplay(c.createdAt, preferredCalendarSystem, 'yyyy-MM-dd', 'YYYY-MM-DD')
    }));
    return {
      filename: `${t('companyRegistrationReport')}_${formatDateForDisplay(new Date(), 'gregorian', 'yyyy-MM-dd')}.csv`,
      content: arrayToCsv(reportData),
      mimeType: 'text/csv',
    };
  };
  
  const generateOverallCompanyStatsReport = async (): Promise<ReportOutput> => {
    const companiesQuery = query(collection(db, "users"), where("role", "==", "company_representative"));
    const snapshot = await getDocs(companiesQuery);
    const companies = snapshot.docs.map(doc => doc.data() as AppUserType);
    
    const stats = {
      total: companies.length,
      approved: companies.filter(c => c.approvalStatus === 'approved').length,
      pending: companies.filter(c => c.approvalStatus === 'pending').length,
      rejected: companies.filter(c => c.approvalStatus === 'rejected').length,
    };

    const summaryText = `
${t('overallCompanyStatsReport')}
---------------------------------
${t('totalRegisteredCompanies')}: ${stats.total}
${t('approvedCompanies')}: ${stats.approved}
${t('pendingCompanies')}: ${stats.pending}
${t('rejectedCompanies')}: ${stats.rejected}
${t('reportGeneratedOn')}: ${formatDateForDisplay(new Date(), preferredCalendarSystem, 'yyyy-MM-dd HH:mm', 'YYYY-MM-DD HH:mm')}
    `;
     return {
      filename: `${t('overallCompanyStatsReport')}_${formatDateForDisplay(new Date(), 'gregorian', 'yyyy-MM-dd')}.txt`,
      content: summaryText.trim(),
      mimeType: 'text/plain',
    };
  };


  const handleGenerateReport = useCallback(async (reportFn: () => Promise<ReportOutput>, reportId: string) => {
    if (!dateRange?.from || !dateRange?.to) {
        if (reportId !== 'overall_company_stats') { 
            toast({ variant: "destructive", title: t('error'), description: t('selectDateRangeFirst') });
            return;
        }
    }
    setIsLoadingReport(true);
    setCurrentGeneratingReportId(reportId);
    try {
      const output = await reportFn();
      downloadFile(output);
      toast({ title: t('reportGeneratedSuccess'), description: t('downloadShouldStart')});
    } catch (error: any) {
      console.error(`Error generating report "${reportId}":`, error);
      let desc = error.message || t('unknownError');
      if (error.message && typeof error.message === 'string' && error.message.includes("indexes?create_composite=")) {
        desc = t('firestoreIndexRequiredErrorDetailed');
      }
      toast({ variant: "destructive", title: t('errorGeneratingReport'), description: desc, duration: 10000 });
    } finally {
      setIsLoadingReport(false);
      setCurrentGeneratingReportId(null);
    }
  }, [dateRange, t, toast, preferredCalendarSystem]);


  const generalReportTypes = [
    { id: "user_dorm_report", nameKey: "userDormReport", icon: <FileSpreadsheet className="h-8 w-8 text-primary" />, format: t('downloadCsv'), action: () => handleGenerateReport(() => generateUserDormReport(dateRange), "user_dorm_report") },
    { id: "financial_summary", nameKey: "financialSummaryReport", icon: <FileText className="h-8 w-8 text-primary" />, format: t('downloadTxt'), action: () => handleGenerateReport(() => generateFinancialSummary(dateRange), "financial_summary") },
    { id: "hall_utilization", nameKey: "hallUtilizationReport", icon: <Building className="h-8 w-8 text-primary" />, format: t('downloadCsv'), action: () => handleGenerateReport(() => generateHallUtilizationReport(dateRange), "hall_utilization") },
    { id: "occupancy_analytics", nameKey: "occupancyAnalyticsReport", icon: <BarChart3 className="h-8 w-8 text-primary" />, format: t('downloadTxt'), action: () => handleGenerateReport(() => generateOccupancyAnalytics(dateRange), "occupancy_analytics") },
    { id: "company_registration", nameKey: "companyRegistrationReport", icon: <Users className="h-8 w-8 text-primary" />, format: t('downloadCsv'), action: () => handleGenerateReport(() => generateCompanyRegistrationReport(dateRange), "company_registration") },
    { id: "overall_company_stats", nameKey: "overallCompanyStatsReport", icon: <Users className="h-8 w-8 text-primary" />, format: t('downloadTxt'), action: () => handleGenerateReport(generateOverallCompanyStatsReport, "overall_company_stats") },
  ];

  const periodicBookingReportTypes = [
    { id: "daily_dorm_bookings", nameKey: "dailyDormBookingsReport", category: "dormitory", icon: <CalendarDays className="h-8 w-8 text-primary" />, format: t('downloadCsv'), action: (cat: 'dormitory' | 'facility', titleKey: string) => handleGenerateReport(() => generatePeriodicBookingsReport(cat, titleKey, dateRange), "daily_dorm_bookings") },
    { id: "weekly_dorm_bookings", nameKey: "weeklyDormBookingsReport", category: "dormitory", icon: <CalendarDays className="h-8 w-8 text-primary" />, format: t('downloadCsv'), action: (cat: 'dormitory' | 'facility', titleKey: string) => handleGenerateReport(() => generatePeriodicBookingsReport(cat, titleKey, dateRange), "weekly_dorm_bookings") },
    { id: "monthly_dorm_bookings", nameKey: "monthlyDormBookingsReport", category: "dormitory", icon: <CalendarDays className="h-8 w-8 text-primary" />, format: t('downloadCsv'), action: (cat: 'dormitory' | 'facility', titleKey: string) => handleGenerateReport(() => generatePeriodicBookingsReport(cat, titleKey, dateRange), "monthly_dorm_bookings") },
    { id: "daily_facility_bookings", nameKey: "dailyFacilityBookingsReport", category: "facility", icon: <CalendarDays className="h-8 w-8 text-primary" />, format: t('downloadCsv'), action: (cat: 'dormitory' | 'facility', titleKey: string) => handleGenerateReport(() => generatePeriodicBookingsReport(cat, titleKey, dateRange), "daily_facility_bookings") },
    { id: "weekly_facility_bookings", nameKey: "weeklyFacilityBookingsReport", category: "facility", icon: <CalendarDays className="h-8 w-8 text-primary" />, format: t('downloadCsv'), action: (cat: 'dormitory' | 'facility', titleKey: string) => handleGenerateReport(() => generatePeriodicBookingsReport(cat, titleKey, dateRange), "weekly_facility_bookings") },
    { id: "monthly_facility_bookings", nameKey: "monthlyFacilityBookingsReport", category: "facility", icon: <CalendarDays className="h-8 w-8 text-primary" />, format: t('downloadCsv'), action: (cat: 'dormitory' | 'facility', titleKey: string) => handleGenerateReport(() => generatePeriodicBookingsReport(cat, titleKey, dateRange), "monthly_facility_bookings") },
  ];

  if (authLoading) {
    return <div className="flex justify-center items-center h-screen"><Loader2 className="h-8 w-8 animate-spin text-primary" /><p className="ml-2">{t('loading')}...</p></div>;
  }

  if (user?.role === 'admin' && user.buildingAssignment) {
    return (
      <Card className="w-full max-w-md mx-auto my-8">
        <CardHeader>
          <CardTitle className="text-destructive flex items-center"><ShieldAlert className="mr-2"/>{t('accessDenied')}</CardTitle>
        </CardHeader>
        <CardContent>
          <p>{t('buildingAdminAccessReportsDenied')}</p>
          <Button onClick={() => router.push('/admin/dashboard')} className="mt-4">{t('backToDashboard')}</Button>
        </CardContent>
      </Card>
    );
  }
   if (user?.role !== 'superadmin' && !(user?.role === 'admin' && !user.buildingAssignment)) {
     return (
      <Card className="w-full max-w-md mx-auto my-8">
        <CardHeader>
          <CardTitle className="text-destructive flex items-center"><ShieldAlert className="mr-2"/>{t('accessDenied')}</CardTitle>
        </CardHeader>
        <CardContent>
          <p>{t('accessRestrictedToSuperAdminOrGeneralAdmin')}</p>
          <Button onClick={() => router.push('/admin/dashboard')} className="mt-4">{t('backToDashboard')}</Button>
        </CardContent>
      </Card>
    );
  }


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
          <CardDescription>{t('selectReportTypeAndDateRangeGeneral')}</CardDescription>
        </CardHeader>
        <CardContent className="grid grid-cols-1 gap-6 md:grid-cols-2 lg:grid-cols-3">
          {generalReportTypes.map(report => (
            <Card key={report.id} className="shadow-md">
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-lg font-medium">{t(report.nameKey)}</CardTitle>
                {report.icon}
              </CardHeader>
              <CardContent>
                <p className="text-sm text-muted-foreground mb-4">
                  {t('format')}: {report.format}
                </p>
                <Button className="w-full" onClick={report.action} 
                        disabled={isLoadingReport || (report.id !== 'overall_company_stats' && (!dateRange?.from || !dateRange?.to))}>
                  {isLoadingReport && currentGeneratingReportId === report.id ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Download className="mr-2 h-4 w-4" />}
                  {isLoadingReport && currentGeneratingReportId === report.id ? t('generatingReport') : t('generateReport')}
                </Button>
              </CardContent>
            </Card>
          ))}
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>{t('periodicBookingReports')}</CardTitle>
          <CardDescription>{t('downloadPeriodicBookingData')}</CardDescription>
        </CardHeader>
        <CardContent className="grid grid-cols-1 gap-6 md:grid-cols-2 lg:grid-cols-3">
          {periodicBookingReportTypes.map(report => (
            <Card key={report.id} className="shadow-md">
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-lg font-medium">{t(report.nameKey)}</CardTitle>
                 {report.icon}
              </CardHeader>
              <CardContent>
                <p className="text-sm text-muted-foreground mb-4">
                  {t('format')}: {report.format}
                </p>
                 <Button className="w-full" onClick={() => report.action(report.category as 'dormitory' | 'facility', report.nameKey)} 
                        disabled={isLoadingReport || (!dateRange?.from || !dateRange?.to)}>
                  {isLoadingReport && currentGeneratingReportId === report.id ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Download className="mr-2 h-4 w-4" />}
                  {isLoadingReport && currentGeneratingReportId === report.id ? t('generatingReport') : t('generateReport')}
                </Button>
              </CardContent>
            </Card>
          ))}
        </CardContent>
      </Card>
    </div>
  );
}

    
