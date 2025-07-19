
"use client";

import React from 'react';
import { useLanguage } from "@/hooks/use-language";

export default function StoreManagerDashboardPage() {
  const { t } = useLanguage();

  return (
    <div>
      <h1 className="text-3xl font-bold">{t('storeDashboard')}</h1>
      <p className="text-muted-foreground">{t('storeDashboardWelcome')}</p>
      {/* Dashboard content will be built out here */}
    </div>
  );
}
