
"use client";

import React, { useEffect, useState, Suspense } from 'react';
import { PublicLayout } from "@/components/layout/public-layout";
import { BookingForm } from "@/components/sections/booking-form";
import { useLanguage } from "@/hooks/use-language";
import { useAuth } from "@/hooks/use-auth";
import { useSearchParams, useRouter } from 'next/navigation';
import { Presentation, AlertCircle, Loader2 } from "lucide-react";
import type { BookingItem, Hall as HallType } from "@/types";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from '@/components/ui/button';
import { db } from '@/lib/firebase';
import { doc, getDoc } from 'firebase/firestore';
import { useToast } from '@/hooks/use-toast';

function BookMultipleSectionsContent() {
  const { t } = useLanguage();
  const searchParams = useSearchParams();
  const router = useRouter();
  const { user, loading: authLoading } = useAuth();
  const [itemsToBook, setItemsToBook] = useState<BookingItem[]>([]);
  const [isLoadingItems, setIsLoadingItems] = useState(true);
  const { toast } = useToast();

  useEffect(() => {
    const fetchItemsData = async () => {
      setIsLoadingItems(true);
      const itemParams = searchParams.getAll('item');
      if (itemParams.length > 0) {
        const fetchedItemsPromises = itemParams.map(async (param) => {
          const [id, name, itemTypeStr] = param.split(':');
          const decodedId = decodeURIComponent(id);
          const decodedName = decodeURIComponent(name);
          const decodedItemType = decodeURIComponent(itemTypeStr) as 'hall' | 'section';

          try {
            const itemRef = doc(db, "halls", decodedId);
            const docSnap = await getDoc(itemRef);
            if (docSnap.exists()) {
              const itemData = docSnap.data() as HallType;
              if (!itemData.isAvailable) {
                toast({ variant: "destructive", title: t('itemNotAvailableErrorTitle'), description: t('itemNotAvailableErrorMultiBook', { itemName: decodedName }) });
                return null;
              }
              return {
                id: decodedId,
                name: decodedName, 
                itemType: decodedItemType,
                rentalCost: itemData.rentalCost,
                capacity: itemData.capacity,
              } as BookingItem;
            } else {
              console.warn(`Item with id ${decodedId} not found during multi-book setup.`);
              toast({ variant: "destructive", title: t('error'), description: t('itemNotFoundDatabase', { itemName: decodedName }) });
              return null;
            }
          } catch (error) {
            console.error(`Error fetching item ${decodedId} for multi-book:`, error);
            toast({ variant: "destructive", title: t('error'), description: t('errorFetchingItemDetailsMulti', { itemName: decodedName }) });
            return null;
          }
        });

        const resolvedItems = await Promise.all(fetchedItemsPromises);
        const validItems = resolvedItems.filter(item => item !== null) as BookingItem[];
        
        if (validItems.length !== itemParams.length && validItems.length === 0) {
            // All items failed to load or were unavailable, redirect back or show significant error
            router.push('/halls'); // Or a more specific error page/toast
            return;
        }
        setItemsToBook(validItems);
      } else {
        // No items in query params, redirect
        toast({ variant: "destructive", title: t('error'), description: t('noItemsSelectedForBooking') });
        router.push('/halls');
      }
      setIsLoadingItems(false);
    };

    if (!authLoading) { // Ensure auth state is resolved before fetching
        fetchItemsData();
    }
  }, [searchParams, authLoading, t, router, toast]);

  if (authLoading || isLoadingItems) {
    return (
      <div className="flex justify-center items-center min-h-[300px]">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
        <p className="ml-2">{t('loadingDetails')}</p>
      </div>
    );
  }

  if (!user || user.role !== 'company_representative') {
    return (
       <Card className="w-full max-w-md mx-auto my-8 shadow-xl">
          <CardHeader className="text-center">
              <AlertCircle className="w-12 h-12 text-destructive mx-auto mb-4" />
              <CardTitle className="text-2xl text-destructive">{t('accessDenied')}</CardTitle>
          </CardHeader>
          <CardContent className="text-center">
              <p className="mb-4">{t('mustBeLoggedInAsCompanyToBookFacility')}</p>
              <Button onClick={() => router.push(`/auth/login?redirect=/halls/book-multiple?${searchParams.toString()}`)}>{t('login')}</Button>
          </CardContent>
      </Card>
    );
  }
  
  if (user.role === 'company_representative' && user.approvalStatus !== 'approved') {
    return (
       <Card className="w-full max-w-md mx-auto my-8 shadow-xl">
          <CardHeader className="text-center">
              <AlertCircle className="w-12 h-12 text-yellow-500 mx-auto mb-4" />
              <CardTitle className="text-2xl text-yellow-600">{t('accountPendingApprovalTitle')}</CardTitle>
          </CardHeader>
          <CardContent className="text-center">
              <p className="mb-4">{t('accountPendingApprovalMultiBook')}</p>
              <Button onClick={() => router.push('/company/dashboard')}>{t('backToCompanyDashboard')}</Button>
          </CardContent>
      </Card>
    );
  }

  if (itemsToBook.length === 0 && !isLoadingItems) { 
    return (
      <div className="text-center py-8">
        <AlertCircle className="w-12 h-12 text-destructive mx-auto mb-4" />
        <p className="text-xl text-destructive">{t('noValidItemsForBooking')}</p>
        <Button onClick={() => router.push('/halls')} variant="link" className="mt-4">
          {t('backToHallsPage')}
        </Button>
      </div>
    );
  }

  return (
    <>
      <div className="flex flex-col items-center mb-8">
        <Presentation className="w-12 h-12 text-primary mb-2" />
        <h1 className="text-3xl font-bold text-primary text-center">
          {itemsToBook.length > 1 ? t('bookMultipleItemsTitle') : t('bookFacility')}
        </h1>
        <p className="text-muted-foreground text-center max-w-md">
          {itemsToBook.length > 1 ? t('fillFormToBookSelectedItems') : t('fillFormToBookFacility')}
        </p>
      </div>
      <BookingForm bookingCategory="facility" itemsToBook={itemsToBook} />
    </>
  );
}


export default function BookMultiplePage() {
  const { t } = useLanguage();
  return (
    <PublicLayout>
      <div className="container mx-auto py-8 px-4">
        <Suspense fallback={<div className="flex justify-center items-center min-h-[300px]"><Loader2 className="h-8 w-8 animate-spin text-primary" /><p className="ml-2">{t('loading')}</p></div>}>
          <BookMultipleSectionsContent />
        </Suspense>
      </div>
    </PublicLayout>
  );
}
