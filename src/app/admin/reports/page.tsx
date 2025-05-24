
"use client";

import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { useLanguage } from "@/hooks/use-language";
import { useToast } from "@/hooks/use-toast";
import { Download, FileSpreadsheet, FileText, CalendarDays, Printer } from "lucide-react"; 

export default function AdminReportsPage() {
  const { t } = useLanguage();
  const { toast } = useToast();

  const handlePlaceholderReport = (reportName: string) => {
    toast({
      title: t('featureNotImplemented'), // Add to JSON
      description: `${reportName} ${t('reportGenerationPlaceholder')}`, // Add to JSON
    });
  };

  const reportTypes = [
    { id: "user_dorm_report", nameKey: "userDormReport", icon: <FileSpreadsheet className="h-8 w-8 text-primary" />, format: "Excel", action: () => handlePlaceholderReport(t('userDormReport')) }, 
    { id: "financial_summary", nameKey: "financialSummaryReport", icon: <FileText className="h-8 w-8 text-primary" />, format: "PDF", action: () => handlePlaceholderReport(t('financialSummaryReport')) }, 
    { id: "hall_utilization", nameKey: "hallUtilizationReport", icon: <FileSpreadsheet className="h-8 w-8 text-primary" />, format: "Excel", action: () => handlePlaceholderReport(t('hallUtilizationReport')) }, 
    { id: "occupancy_analytics", nameKey: "occupancyAnalyticsReport", icon: <FileText className="h-8 w-8 text-primary" />, format: "PDF", action: () => handlePlaceholderReport(t('occupancyAnalyticsReport')) }, 
  ];

  const dormitoryReportTypes = [
    { id: "daily_dorm_bookings", nameKey: "dailyDormBookingsReport", icon: <CalendarDays className="h-8 w-8 text-primary" />, format: "Print/PDF", action: () => handlePlaceholderReport(t('dailyDormBookingsReport'))}, // Add to JSON
    { id: "weekly_dorm_bookings", nameKey: "weeklyDormBookingsReport", icon: <CalendarDays className="h-8 w-8 text-primary" />, format: "Print/PDF", action: () => handlePlaceholderReport(t('weeklyDormBookingsReport'))}, // Add to JSON
    { id: "monthly_dorm_bookings", nameKey: "monthlyDormBookingsReport", icon: <CalendarDays className="h-8 w-8 text-primary" />, format: "Print/PDF", action: () => handlePlaceholderReport(t('monthlyDormBookingsReport'))}, // Add to JSON
  ];


  return (
    <div className="space-y-8">
      <h1 className="text-3xl font-bold text-foreground">{t('reports')}</h1>

      <Card>
        <CardHeader>
          <CardTitle>{t('generateGeneralReports')}</CardTitle> {/* Add to JSON */}
          <CardDescription>{t('selectReportTypeAndDateRange')}</CardDescription> 
        </CardHeader>
        <CardContent className="space-y-8">
          <div>
            <h3 className="text-lg font-medium mb-2">{t('selectDateRange')}</h3> 
            <div className="p-4 border rounded-md bg-muted max-w-sm text-muted-foreground">
              {t('datePickerPlaceholder')}
            </div>
          </div>

          <div className="grid grid-cols-1 gap-6 md:grid-cols-2 lg:grid-cols-3">
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
                  <Button className="w-full" onClick={report.action}>
                    <Download className="mr-2 h-4 w-4" /> {t('generateAndDownload')}
                  </Button>
                </CardContent>
              </Card>
            ))}
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>{t('dormitoryBookingReports')}</CardTitle> {/* Add to JSON */}
          <CardDescription>{t('viewOrPrintDormitoryBookingData')}</CardDescription> {/* Add to JSON */}
        </CardHeader>
        <CardContent className="space-y-8">
           <div>
            <h3 className="text-lg font-medium mb-2">{t('selectDateRange')}</h3> 
            <div className="p-4 border rounded-md bg-muted max-w-sm text-muted-foreground">
              {t('datePickerPlaceholder')}
            </div>
          </div>
          <div className="grid grid-cols-1 gap-6 md:grid-cols-2 lg:grid-cols-3">
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
                  <Button className="w-full" onClick={report.action}>
                    <Printer className="mr-2 h-4 w-4" /> {t('viewAndPrint')} {/* Add to JSON */}
                  </Button>
                </CardContent>
              </Card>
            ))}
          </div>
        </CardContent>
      </Card>

    </div>
  );
}
