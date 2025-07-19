
"use client";

import React from 'react';
import { useLanguage } from "@/hooks/use-language";

export default function ManageTransactionsPage() {
  const { t } = useLanguage();

  return (
    <div>
      <h1 className="text-3xl font-bold">{t('manageTransactions')}</h1>
      <p className="text-muted-foreground">{t('manageTransactionsDescription')}</p>
      {/* Transaction management content will be built out here */}
    </div>
  );
}
