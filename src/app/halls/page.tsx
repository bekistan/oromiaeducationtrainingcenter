
"use client";

import React, { useState, useEffect, useCallback } from 'react';
import { PublicLayout } from "@/components/layout/public-layout";
import { HallList } from "@/components/sections/hall-list";
import type { Hall } from "@/types";
import { useLanguage } from "@/hooks/use-language";
import { useAuth } from "@/hooks/use-auth";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Button } from "@/components/ui/button";
import { Building, SquareStack, CalendarPlus, Loader2, Library } from "lucide-react";
import { useRouter } from "next/navigation";
import { db } from '@/lib/firebase';
import { collection, getDocs, query, where } from 'firebase/firestore';
import { useToast } from '@/hooks/use-toast';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';

export default function HallsAndSectionsPage() {
  const { t } = useLanguage();
  const { user, loading: authLoading } = useAuth();
  const router = useRouter();
  const { toast } = useToast();

  const [allAvailableHalls, setAllAvailableHalls] = useState<Hall[]>([]);
  const [allAvailableSelectableItems, setAllAvailableSelectableItems] = useState<Hall[]>([]);
  const [selectedItems, setSelectedItems] = useState<Hall[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  const fetchHallsAndSections = useCallback(async () => {
    setIsLoading(true);
    try {
      const itemsQuery = query(collection(db, "halls"), where("isAvailable", "==", true));
      const itemsSnapshot = await getDocs(itemsQuery);
      
      const allItemsData = itemsSnapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as Hall));
      
      setAllAvailableHalls(allItemsData.filter(item => item.itemType === 'hall'));
      setAllAvailableSelectableItems(allItemsData); // This list contains both halls and sections that are available

    } catch (error) {
      console.error("Error fetching halls/sections: ", error);
      toast({ variant: "destructive", title: t('error'), description: t('errorFetchingHallsAndSections') });
    } finally {
      setIsLoading(false);
    }
  }, [t, toast]);

  useEffect(() => {
    fetchHallsAndSections();
  }, [fetchHallsAndSections]);

  const handleSelectionChange = (newSelection: Hall[]) => {
    setSelectedItems(newSelection);
  };

  const handleBookSelectedItems = () => {
    if (authLoading) return;
    if (!user || user.role !== 'company_representative') {
      // Instead of alert, navigate to login with redirect
      toast({ variant: "destructive", title: t('loginRequired'), description: t('loginAsCompanyToBook') });
      const currentPath = window.location.pathname + window.location.search;
      router.push(`/auth/login?redirect=${encodeURIComponent(currentPath)}`);
      return;
    }
    if (selectedItems.length === 0) {
      toast({ variant: "destructive", title: t('error'), description: t('pleaseSelectItemsToBook') });
      return;
    }

    const itemsQuery = selectedItems
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
            <TabsList className="grid w-full grid-cols-2 md:w-2/3 lg:w-1/2 mx-auto mb-8">
              <TabsTrigger value="halls">
                <Building className="mr-2 h-5 w-5" /> {t('halls')}
              </TabsTrigger>
              <TabsTrigger value="select_multiple">
                <Library className="mr-2 h-5 w-5" /> {t('selectMultipleItemsTab')}
              </TabsTrigger>
            </TabsList>
            <TabsContent value="halls">
              <h2 className="text-2xl font-semibold text-foreground mb-6 text-center">{t('ourAvailableHall')}</h2>
              {allAvailableHalls.length > 0 ? (
                <HallList halls={allAvailableHalls} />
              ) : (
                <p className="text-center text-muted-foreground">{t('noHallsCurrentlyAvailable')}</p>
              )}
            </TabsContent>
            <TabsContent value="select_multiple">
              <div className="flex flex-col items-center">
                <h2 className="text-2xl font-semibold text-foreground mb-2 text-center">{t('selectItemsToBookTogether')}</h2>
                <p className="text-muted-foreground text-center mb-6 max-w-md mx-auto">{t('selectMultipleDescription')}</p>
                
                {user?.role === 'company_representative' && user.approvalStatus === 'approved' && allAvailableSelectableItems.length > 0 && (
                    <Button onClick={handleBookSelectedItems} className="mb-6" disabled={authLoading || selectedItems.length === 0}>
                        <CalendarPlus className="mr-2 h-5 w-5" /> 
                        {authLoading ? t('loading') : `${t('bookSelectedItems')} (${selectedItems.length})`}
                    </Button>
                )}

                {(!user || user.role !== 'company_representative' || user.approvalStatus !== 'approved') && allAvailableSelectableItems.length > 0 && (
                     <Alert variant="default" className="max-w-md mx-auto mb-6 bg-blue-50 border-blue-200 text-blue-700">
                        <AlertTitle>{t('loginToBookMultipleTitle')}</AlertTitle>
                        <AlertDescription>
                        {t('loginToBookMultipleDesc')}
                        <Button variant="link" className="p-0 h-auto ml-1 text-blue-700 hover:text-blue-800" onClick={() => {
                            const currentPath = window.location.pathname + window.location.search;
                            router.push(`/auth/login?redirect=${encodeURIComponent(currentPath)}`);
                        }}>{t('loginHere')}</Button>.
                        </AlertDescription>
                    </Alert>
                )}

                {allAvailableSelectableItems.length > 0 ? (
                  <HallList 
                    halls={allAvailableSelectableItems} 
                    selectable={user?.role === 'company_representative' && user.approvalStatus === 'approved'} // Only allow selection if company rep and approved
                    selectedItems={selectedItems}
                    onSelectionChange={handleSelectionChange}
                  />
                ) : (
                   <p className="text-center text-muted-foreground">{t('noItemsCurrentlyAvailableForSelection')}</p>
                )}
              </div>
            </TabsContent>
          </Tabs>
        )}
      </div>
    </PublicLayout>
  );
}
