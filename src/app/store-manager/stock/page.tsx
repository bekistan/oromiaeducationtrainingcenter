
"use client";

import React from 'react';
import { useLanguage } from "@/hooks/use-language";

export default function ManageStockPage() {
  const { t } = useLanguage();

  return (
    <div>
      <h1 className="text-3xl font-bold">{t('manageStock')}</h1>
      <p className="text-muted-foreground">{t('manageStockDescription')}</p>
      {/* Stock management content will be built out here */}
    </div>
  );
}
