
"use client";

import React, { useState, useEffect, useCallback } from 'react';
import { PublicLayout } from "@/components/layout/public-layout";
import { HallList } from "@/components/sections/hall-list";
import type { Hall } from "@/types";
import { useLanguage } from "@/hooks/use-language";
import { useAuth } from "@/hooks/use-auth";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Button } from "@/components/ui/button";
import { Building, SquareStack, CalendarPlus, Loader2 } from "lucide-react";
import { useRouter } from "next/navigation";
import { db } from '@/lib/firebase';
import { collection, getDocs, query, where } from 'firebase/firestore';
import { useToast } from '@/hooks/use-toast';

export default function HallsAndSectionsPage() {
  const { t } = useLanguage();
  const { user, loading: authLoading } = useAuth();
  const router = useRouter();
  const { toast } = useToast();
  const [halls, setHalls] = useState<Hall[]>([]);
  const [sections, setSections] = useState<Hall[]>([]);
  const [selectedSections, setSelectedSections] = useState<Hall[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  const fetchHallsAndSections = useCallback(async () => {
    setIsLoading(true);
    try {
      const hallsQuery = query(collection(db, "halls"), where("itemType", "==", "hall"));
      const sectionsQuery = query(collection(db, "halls"), where("itemType", "==", "section"));

      const [hallsSnapshot, sectionsSnapshot] = await Promise.all([
        getDocs(hallsQuery),
        getDocs(sectionsQuery)
      ]);

      setHalls(hallsSnapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as Hall)));
      setSections(sectionsSnapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as Hall)));

    } catch (error) {
      console.error("Error fetching halls/sections: ", error);
      toast({ variant: "destructive", title: t('error'), description: t('errorFetchingHallsAndSections') }); // Add to JSON
    } finally {
      setIsLoading(false);
    }
  }, [t, toast]);

  useEffect(() => {
    fetchHallsAndSections();
  }, [fetchHallsAndSections]);

  const handleSelectionChange = (newSelection: Hall[]) => {
    setSelectedSections(newSelection);
  };

  const handleBookSelectedSections = () => {
    if (authLoading) return;
    if (!user || user.role !== 'company_representative') {
      alert(t('loginAsCompanyToBook'));
      return;
    }
    if (selectedSections.length === 0) {
      alert(t('pleaseSelectSectionsToBook'));
      return;
    }

    const itemsQuery = selectedSections
      .map(s => `item=${encodeURIComponent(s.id)}:${encodeURIComponent(s.name)}:${encodeURIComponent(s.itemType)}`)
      .join('&');
    
    router.push(`/halls/book-multiple?${itemsQuery}`);
  };

  return (
    <PublicLayout>
      <div className="container mx-auto py-12 px-4">
        <h1 className="text-3xl font-bold text-primary mb-8 text-center">
          {t('viewAvailableHallsAndSections')}
        </h1>
        
        {isLoading ? (
           <div className="flex justify-center items-center h-40"><Loader2 className="h-8 w-8 animate-spin" /></div>
        ) : (
          <Tabs defaultValue="halls" className="w-full">
            <TabsList className="grid w-full grid-cols-2 md:w-1/2 mx-auto mb-8">
              <TabsTrigger value="halls">
                <Building className="mr-2 h-5 w-5" /> {t('halls')}
              </TabsTrigger>
              <TabsTrigger value="sections">
                <SquareStack className="mr-2 h-5 w-5" /> {t('sections')}
              </TabsTrigger>
            </TabsList>
            <TabsContent value="halls">
              <h2 className="text-2xl font-semibold text-foreground mb-6 text-center">{t('ourAvailableHall')}</h2>
              <HallList halls={halls} />
            </TabsContent>
            <TabsContent value="sections">
              <div className="flex flex-col items-center">
                <h2 className="text-2xl font-semibold text-foreground mb-6 text-center">{t('ourAvailableSections')}</h2>
                {selectedSections.length > 0 && (
                  <Button onClick={handleBookSelectedSections} className="mb-6" disabled={authLoading}>
                    <CalendarPlus className="mr-2 h-5 w-5" /> 
                    {authLoading ? t('loading') : `${t('bookSelected')} (${selectedSections.length})`}
                  </Button>
                )}
                <HallList 
                  halls={sections} 
                  selectable={true}
                  selectedItems={selectedSections}
                  onSelectionChange={handleSelectionChange}
                />
              </div>
            </TabsContent>
          </Tabs>
        )}
      </div>
    </PublicLayout>
  );
}
