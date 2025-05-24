"use client";

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { useLanguage } from "@/hooks/use-language";
import { BarChart, DollarSign, Users, Bed, Building } from "lucide-react";

export default function AdminDashboardPage() {
  const { t } = useLanguage();

  const stats = [
    { titleKey: "totalBookings", value: "152", icon: <BarChart className="h-6 w-6 text-primary" />, details: "Last 30 days" }, // Add to JSON
    { titleKey: "totalRevenue", value: "ETB 75,600", icon: <DollarSign className="h-6 w-6 text-primary" />, details: "This month" }, // Add to JSON
    { titleKey: "activeUsers", value: "34", icon: <Users className="h-6 w-6 text-primary" />, details: "Online now" }, // Add to JSON
    { titleKey: "availableDorms", value: "12 / 50", icon: <Bed className="h-6 w-6 text-primary" />, details: "Dormitories" }, // Add to JSON
    { titleKey: "availableHalls", value: "3 / 5", icon: <Building className="h-6 w-6 text-primary" />, details: "Halls/Sections" }, // Add to JSON
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

      <div className="grid gap-6 lg:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle>{t('recentBookings')}</CardTitle> {/* Add to JSON */}
          </CardHeader>
          <CardContent>
            <p className="text-muted-foreground">{t('placeholderRecentBookings')}</p> {/* Add to JSON */}
            {/* Placeholder for recent bookings list or chart */}
          </CardContent>
        </Card>
        <Card>
          <CardHeader>
            <CardTitle>{t('systemNotifications')}</CardTitle> {/* Add to JSON */}
          </CardHeader>
          <CardContent>
            <p className="text-muted-foreground">{t('placeholderNotifications')}</p> {/* Add to JSON */}
            {/* Placeholder for system notifications */}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
