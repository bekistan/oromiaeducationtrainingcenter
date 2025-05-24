
"use client";

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { useLanguage } from "@/hooks/use-language";
import { BarChart, DollarSign, Users, Bed, Building, Info } from "lucide-react";

export default function AdminDashboardPage() {
  const { t } = useLanguage();

  const stats = [
    { titleKey: "totalBookings", value: "152", icon: <BarChart className="h-6 w-6 text-primary" />, details: "Last 30 days" },
    { titleKey: "totalRevenue", value: "ETB 75,600", icon: <DollarSign className="h-6 w-6 text-primary" />, details: "This month (Placeholder)" }, // Updated details
    { titleKey: "activeUsers", value: "34", icon: <Users className="h-6 w-6 text-primary" />, details: "Online now" },
    { titleKey: "availableDorms", value: "12 / 50", icon: <Bed className="h-6 w-6 text-primary" />, details: "Dormitories" },
    { titleKey: "availableHalls", value: "3 / 5", icon: <Building className="h-6 w-6 text-primary" />, details: "Halls/Sections" },
  ];

  return (
    <div className="space-y-6">
      <h1 className="text-3xl font-bold text-foreground">{t('dashboard')}</h1>
      
      <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-5">
        {stats.map(stat => (
          <Card key={stat.titleKey}>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium text-muted-foreground">
                {t(stat.titleKey)}
              </CardTitle>
              {stat.icon}
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-foreground">{stat.value}</div>
              <p className="text-xs text-muted-foreground">{stat.details}</p>
            </CardContent>
          </Card>
        ))}
      </div>

       <Card className="bg-blue-50 border-blue-200">
        <CardHeader className="flex flex-row items-center space-x-3 space-y-0">
          <Info className="h-5 w-5 text-blue-600" />
          <CardTitle className="text-blue-700 text-base font-medium">{t('developerNote')}</CardTitle> {/* Add to JSON */}
        </CardHeader>
        <CardContent>
          <p className="text-sm text-blue-600">
            {t('revenueNote')} {/* Add 'revenueNote' to JSON: "The 'Total Revenue' card currently displays static data. Dynamic calculation based on actual paid bookings needs backend implementation." */}
          </p>
        </CardContent>
      </Card>

      <div className="grid gap-6 lg:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle>{t('recentBookings')}</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-muted-foreground">{t('placeholderRecentBookings')}</p>
            {/* Placeholder for recent bookings list or chart */}
          </CardContent>
        </Card>
        <Card>
          <CardHeader>
            <CardTitle>{t('systemNotifications')}</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-muted-foreground">{t('placeholderNotifications')}</p>
            {/* Placeholder for system notifications */}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
