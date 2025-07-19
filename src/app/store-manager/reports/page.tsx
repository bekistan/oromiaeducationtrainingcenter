
"use client";

import React from 'react';
import { useLanguage } from "@/hooks/use-language";

export default function StoreReportsPage() {
  const { t } = useLanguage();

  return (
    <div>
      <h1 className="text-3xl font-bold">{t('storeReports')}</h1>
      <p className="text-muted-foreground">{t('storeReportsDescription')}</p>
      {/* Reporting content will be built out here */}
    </div>
  );
}
