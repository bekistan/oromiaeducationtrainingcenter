"use client";

import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { useLanguage } from "@/hooks/use-language";
import { Download, File SpreadsheetIcon, FileText } from "lucide-react"; // Corrected: FileSpreadsheet, not FileSpreadsheetIcon
import { DatePickerWithRange } from "@/components/ui/date-picker-with-range"; // Will create this component

export default function AdminReportsPage() {
  const { t } = useLanguage();

  const reportTypes = [
    { id: "user_dorm_report", nameKey: "userDormReport", icon: <FileSpreadsheet className="h-8 w-8 text-primary" />, format: "Excel" }, // Add to JSON
    { id: "financial_summary", nameKey: "financialSummaryReport", icon: <FileText className="h-8 w-8 text-primary" />, format: "PDF" }, // Add to JSON
    { id: "hall_utilization", nameKey: "hallUtilizationReport", icon: <FileSpreadsheet className="h-8 w-8 text-primary" />, format: "Excel" }, // Add to JSON
    { id: "occupancy_analytics", nameKey: "occupancyAnalyticsReport", icon: <FileText className="h-8 w-8 text-primary" />, format: "PDF" }, // Add to JSON
  ];

  return (
    <div className="space-y-6">
      <h1 className="text-3xl font-bold text-foreground">{t('reports')}</h1>

      <Card>
        <CardHeader>
          <CardTitle>{t('generateReports')}</CardTitle> {/* Add to JSON */}
          <CardDescription>{t('selectReportTypeAndDateRange')}</CardDescription> {/* Add to JSON */}
        </CardHeader>
        <CardContent className="space-y-8">
          <div>
            <h3 className="text-lg font-medium mb-2">{t('selectDateRange')}</h3> {/* Add to JSON */}
            {/* DatePickerWithRange component would be used here. Creating a placeholder. */}
            {/* <DatePickerWithRange className="max-w-sm" /> */}
            <div className="p-4 border rounded-md bg-muted max-w-sm text-muted-foreground">
              {t('datePickerPlaceholder')} {/* Add to JSON */}
            </div>
          </div>

          <div className="grid grid-cols-1 gap-6 md:grid-cols-2">
            {reportTypes.map(report => (
              <Card key={report.id} className="shadow-md">
                <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                  <CardTitle className="text-lg font-medium">{t(report.nameKey)}</CardTitle>
                  {report.icon}
                </CardHeader>
                <CardContent>
                  <p className="text-sm text-muted-foreground mb-4">
                    {t('format')}: {report.format} {/* Add to JSON */}
                  </p>
                  <Button className="w-full">
                    <Download className="mr-2 h-4 w-4" /> {t('generateAndDownload')} {/* Add to JSON */}
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

// Dummy component for DatePickerWithRange as it's not standard in shadcn/ui directly.
// In a real scenario, you'd build this using shadcn/ui Popover, Calendar and Button.
// For now, this is not created as it requires multiple shadcn components.
// A placeholder div is used in the AdminReportsPage instead.
// export function DatePickerWithRange({ className }: { className?: string }) {
//   return <div className={cn("p-4 border rounded-md bg-muted", className)}>Date Range Picker Placeholder</div>;
// }

