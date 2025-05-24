
"use client";

import React, { useState, useEffect, useCallback } from 'react';
import { PublicLayout } from "@/components/layout/public-layout";
import { DormitoryList } from "@/components/sections/dormitory-list";
import type { Dormitory } from "@/types";
import { useLanguage } from "@/hooks/use-language";
import { db } from '@/lib/firebase';
import { collection, getDocs } from 'firebase/firestore';
import { useToast } from '@/hooks/use-toast';
import { Loader2 } from "lucide-react";

export default function DormitoriesPage() {
  const { t } = useLanguage();
  const { toast } = useToast();
  const [dormitories, setDormitories] = useState<Dormitory[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  const fetchDormitories = useCallback(async () => {
    setIsLoading(true);
    try {
      const querySnapshot = await getDocs(collection(db, "dormitories"));
      const dormsData = querySnapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as Dormitory));
      setDormitories(dormsData);
    } catch (error) {
      console.error("Error fetching dormitories: ", error);
      toast({ variant: "destructive", title: t('error'), description: t('errorFetchingDormitories') });
    } finally {
      setIsLoading(false);
    }
  }, [t, toast]);

  useEffect(() => {
    fetchDormitories();
  }, [fetchDormitories]);

  return (
    <PublicLayout>
      <div className="container mx-auto py-12 px-4">
        <h1 className="text-3xl font-bold text-primary mb-8 text-center">
          {t('viewAvailableDormitories')}
        </h1>
        {isLoading ? (
          <div className="flex justify-center items-center h-40"><Loader2 className="h-8 w-8 animate-spin" /></div>
        ) : (
          <DormitoryList dormitories={dormitories} />
        )}
      </div>
    </PublicLayout>
  );
}
