
"use client";

import React, { useEffect, useState, useMemo } from 'react';
import { useQuery } from '@tanstack/react-query';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { useLanguage } from "@/hooks/use-language";
import type { StoreItem, StoreTransaction } from "@/types";
import { Package, AlertTriangle, ArrowRightLeft, Loader2 } from "lucide-react";
import { db } from '@/lib/firebase';
import { collection, query, where, Timestamp, orderBy, onSnapshot, getCountFromServer } from 'firebase/firestore';
import { formatDate } from '@/lib/date-utils';

const LOW_STOCK_THRESHOLD = 10;

interface StoreDashboardStats {
    totalItemTypes: number;
    itemsLowInStock: number;
    transactionsToday: number;
    recentTransactions: StoreTransaction[];
}

export default function StoreManagerDashboardPage() {
  const { t } = useLanguage();
    
  const [stats, setStats] = useState<StoreDashboardStats>({
    totalItemTypes: 0,
    itemsLowInStock: 0,
    transactionsToday: 0,
    recentTransactions: [],
  });
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!db) {
        setError("Database not configured.");
        setIsLoading(false);
        return;
    };

    const listeners: (() => void)[] = [];
    
    // Listener for items
    const itemsQuery = query(collection(db, "store_items"));
    const itemsUnsubscribe = onSnapshot(itemsQuery, (querySnapshot) => {
        const allItems = querySnapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as StoreItem));
        const totalItemTypes = allItems.length;
        const itemsLowInStock = allItems.filter(item => item.quantity < LOW_STOCK_THRESHOLD).length;

        setStats(prev => ({
            ...prev,
            totalItemTypes,
            itemsLowInStock,
        }));
        setIsLoading(false);
    }, (err) => {
        console.error("Store items listener error:", err);
        setError("Failed to load store items.");
        setIsLoading(false);
    });
    listeners.push(itemsUnsubscribe);

    // Listener for transactions
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const todayTimestamp = Timestamp.fromDate(today);

    const recentTransactionsQuery = query(collection(db, "store_transactions"), orderBy("transactionDate", "desc"), where("transactionDate", ">=", todayTimestamp));
    const transactionsUnsubscribe = onSnapshot(recentTransactionsQuery, (querySnapshot) => {
        const recentTransactions = querySnapshot.docs.map(doc => ({
            id: doc.id,
            ...doc.data(),
            transactionDate: (doc.data().transactionDate as Timestamp).toDate().toISOString(),
        } as StoreTransaction));

        setStats(prev => ({
            ...prev,
            transactionsToday: recentTransactions.length,
            recentTransactions: recentTransactions.slice(0, 5),
        }));
    }, (err) => {
        console.error("Store transactions listener error:", err);
        setError("Failed to load transactions.");
    });
    listeners.push(transactionsUnsubscribe);

    return () => {
        listeners.forEach(unsub => unsub());
    };
  }, []);

  const statCards = [
      { titleKey: "totalStockItems", value: stats?.totalItemTypes, icon: <Package className="h-6 w-6 text-primary" />, detailsKey: "distinctItemTypesInStore" },
      { titleKey: "itemsLowOnStock", value: stats?.itemsLowInStock, icon: <AlertTriangle className="h-6 w-6 text-amber-600" />, detailsKey: "itemsBelowThreshold", threshold: LOW_STOCK_THRESHOLD },
      { titleKey: "transactionsToday", value: stats?.transactionsToday, icon: <ArrowRightLeft className="h-6 w-6 text-green-600" />, detailsKey: "stockMovementsRecordedToday" },
  ];

  if (isLoading) {
      return (
          <div className="flex justify-center items-center h-40">
              <Loader2 className="h-8 w-8 animate-spin text-primary" />
              <p className="ml-2">{t('loadingStoreManagerDashboard')}</p>
          </div>
      );
  }

  if (error) {
      return <p className="text-destructive">{t('errorLoadingDashboardData')}: {error}</p>;
  }

  return (
    <div className="space-y-6">
      <h1 className="text-3xl font-bold text-foreground">{t('storeDashboard')}</h1>
      
      <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
          {statCards.map(stat => (
              <Card key={stat.titleKey}>
                  <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                      <CardTitle className="text-sm font-medium text-muted-foreground">{t(stat.titleKey)}</CardTitle>
                      {stat.icon}
                  </CardHeader>
                  <CardContent>
                      <div className="text-2xl font-bold text-foreground">{stat.value ?? '0'}</div>
                      <p className="text-xs text-muted-foreground">{t(stat.detailsKey, { threshold: stat.threshold })}</p>
                  </CardContent>
              </Card>
          ))}
      </div>

      <Card>
          <CardHeader>
              <CardTitle>{t('recentTransactions')}</CardTitle>
              <CardDescription>{t('latest5Transactions')}</CardDescription>
          </CardHeader>
          <CardContent>
              {stats?.recentTransactions && stats.recentTransactions.length > 0 ? (
                  <Table>
                      <TableHeader>
                          <TableRow>
                              <TableHead>{t('item')}</TableHead>
                              <TableHead>{t('type')}</TableHead>
                              <TableHead>{t('quantity')}</TableHead>
                              <TableHead>{t('reason')}</TableHead>
                              <TableHead>{t('time')}</TableHead>
                          </TableRow>
                      </TableHeader>
                      <TableBody>
                          {stats.recentTransactions.map(tx => (
                              <TableRow key={tx.id}>
                                  <TableCell>{tx.itemName}</TableCell>
                                  <TableCell>
                                    <span className={`font-semibold ${tx.type === 'in' ? 'text-green-600' : 'text-red-600'}`}>
                                      {t(tx.type)}
                                    </span>
                                  </TableCell>
                                  <TableCell>{tx.type === 'in' ? '+' : '-'}{tx.quantityChange}</TableCell>
                                  <TableCell>{tx.reason}</TableCell>
                                  <TableCell className="text-xs">{formatDate(tx.transactionDate, 'HH:mm')}</TableCell>
                              </TableRow>
                          ))}
                      </TableBody>
                  </Table>
              ) : (
                  <p className="text-muted-foreground">{t('noTransactionsToday')}</p>
              )}
          </CardContent>
      </Card>
    </div>
  );
}
