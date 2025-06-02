
"use client";

import React, { useState, useEffect, useCallback } from 'react';
import { PublicLayout } from "@/components/layout/public-layout";
import { DormitoryList } from "@/components/sections/dormitory-list";
import type { Dormitory } from "@/types";
import { useLanguage } from "@/hooks/use-language";
import { db } from '@/lib/firebase';
import { collection, getDocs, query, where } from 'firebase/firestore';
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
      // Query only for dormitories where isAvailable is true
      const q = query(collection(db, "dormitories"), where("isAvailable", "==", true));
      const querySnapshot = await getDocs(q);
      const dormsData = querySnapshot.docs.map(doc => {
        const data = doc.data();
        // Ensure isAvailable is explicitly a boolean, defaulting to false if undefined
        const isAvailable = typeof data.isAvailable === 'boolean' ? data.isAvailable : false;
        return { 
          id: doc.id, 
          ...data,
          isAvailable: isAvailable // Explicitly set to ensure boolean type
        } as Dormitory;
      });
      
      // Further client-side filter, just in case, though the query should handle it
      const strictlyAvailableDorms = dormsData.filter(d => d.isAvailable === true);
      setDormitories(strictlyAvailableDorms);

    } catch (error) {
      console.error("Error fetching available dormitories: ", error);
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
