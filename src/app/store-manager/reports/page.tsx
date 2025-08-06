
"use client";

import React, { useState, useCallback } from 'react';
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { useLanguage } from "@/hooks/use-language";
import { useToast } from "@/hooks/use-toast";
import { Download, FileSpreadsheet, Loader2 } from "lucide-react";
import { DatePickerWithRange } from '@/components/ui/date-picker-with-range';
import type { DateRange } from 'react-day-picker';
import { db } from '@/lib/firebase';
import { collection, query, where, getDocs, Timestamp, orderBy } from 'firebase/firestore';
import type { StoreTransaction } from '@/types';
import { formatDate } from '@/lib/date-utils';

interface ReportOutput {
  filename: string;
  content: string;
  mimeType: 'text/csv';
}

export default function StoreReportsPage() {
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

  const generateTransactionReport = useCallback(async (): Promise<ReportOutput> => {
    if (!db) throw new Error("Database not configured.");
    if (!dateRange?.from || !dateRange?.to) throw new Error(t('selectDateRangeFirst'));

    const fromTimestamp = Timestamp.fromDate(dateRange.from);
    const toTimestamp = Timestamp.fromDate(new Date(dateRange.to.setHours(23, 59, 59, 999)));

    const q = query(
      collection(db, "store_transactions"),
      where("transactionDate", ">=", fromTimestamp),
      where("transactionDate", "<=", toTimestamp),
      orderBy("transactionDate", "desc")
    );

    const snapshot = await getDocs(q);
    const transactions = snapshot.docs.map(doc => doc.data() as StoreTransaction);

    const reportData = transactions.map(tx => ({
      [t('itemName')]: tx.itemName,
      [t('type')]: t(tx.type),
      [t('quantityChange')]: tx.quantityChange,
      [t('reason')]: tx.reason,
      [t('responsibleEmployee')]: tx.responsibleEmployeeName || 'N/A',
      [t('transactionDate')]: formatDate(tx.transactionDate, 'yyyy-MM-dd HH:mm'),
    }));

    return {
      filename: `${t('storeTransactionReport')}_${formatDate(new Date(), 'yyyy-MM-dd')}.csv`,
      content: arrayToCsv(reportData),
      mimeType: 'text/csv',
    };
  }, [dateRange, t]);

  const handleGenerateReport = useCallback(async () => {
    setIsLoadingReport(true);
    try {
      const output = await generateTransactionReport();
      downloadFile(output);
      toast({ title: t('reportGeneratedSuccess'), description: t('downloadShouldStart') });
    } catch (error: any) {
      toast({ variant: "destructive", title: t('errorGeneratingReport'), description: error.message });
    } finally {
      setIsLoadingReport(false);
    }
  }, [generateTransactionReport, toast]);

  return (
    <div className="space-y-8">
      <h1 className="text-3xl font-bold text-foreground">{t('storeReports')}</h1>

      <Card>
        <CardHeader>
          <CardTitle>{t('reportFilters')}</CardTitle>
          <CardDescription>{t('selectDateRangeForReports')}</CardDescription>
        </CardHeader>
        <CardContent>
          <DatePickerWithRange date={dateRange} onDateChange={setDateRange} disableFuture />
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>{t('availableReports')}</CardTitle>
          <CardDescription>{t('downloadTransactionData')}</CardDescription>
        </CardHeader>
        <CardContent>
          <Card className="shadow-md max-w-sm">
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-lg font-medium">{t('storeTransactionReport')}</CardTitle>
              <FileSpreadsheet className="h-8 w-8 text-primary" />
            </CardHeader>
            <CardContent>
              <p className="text-sm text-muted-foreground mb-4">{t('storeTransactionReportDesc')}</p>
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
