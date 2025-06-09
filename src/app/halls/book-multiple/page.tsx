
"use client";

import React, { useEffect, useState, Suspense } from 'react';
import { PublicLayout } from "@/components/layout/public-layout";
import { BookingForm } from "@/components/sections/booking-form";
import { useLanguage } from "@/hooks/use-language";
import { useAuth } from "@/hooks/use-auth";
import { useSearchParams, useRouter } from 'next/navigation';
import { Presentation, AlertCircle, Loader2 } from "lucide-react";
import type { BookingItem, Hall as HallType } from "@/types"; // Added HallType
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from '@/components/ui/button';
import { db } from '@/lib/firebase'; // Added db
import { doc, getDoc } from 'firebase/firestore'; // Added getDoc

function BookMultipleSectionsContent() {
  const { t } = useLanguage();
  const searchParams = useSearchParams();
  const router = useRouter();
  const { user, loading: authLoading } = useAuth();
  const [itemsToBook, setItemsToBook] = useState<BookingItem[]>([]);
  const [isLoadingItems, setIsLoadingItems] = useState(true);

  useEffect(() => {
    const fetchItemsData = async () => {
      setIsLoadingItems(true);
      const itemParams = searchParams.getAll('item');
      if (itemParams.length > 0) {
        const fetchedItemsPromises = itemParams.map(async (param) => {
          const [id, name, itemTypeStr] = param.split(':');
          const decodedId = decodeURIComponent(id);
          const decodedName = decodeURIComponent(name);
          const decodedItemType = decodeURIComponent(itemTypeStr) as 'section';

          try {
            const itemRef = doc(db, "halls", decodedId);
            const docSnap = await getDoc(itemRef);
            if (docSnap.exists()) {
              const itemData = docSnap.data() as HallType;
              return {
                id: decodedId,
                name: decodedName, // Using name from param as it's already decoded and set
                itemType: decodedItemType,
                rentalCost: itemData.rentalCost, // Fetch rentalCost
                capacity: itemData.capacity, // Also fetch capacity if relevant
              } as BookingItem;
            } else {
              console.warn(`Item with id ${decodedId} not found during multi-book setup.`);
              return null;
            }
          } catch (error) {
            console.error(`Error fetching item ${decodedId} for multi-book:`, error);
            return null;
          }
        });

        const resolvedItems = await Promise.all(fetchedItemsPromises);
        const validItems = resolvedItems.filter(item => item !== null) as BookingItem[];
        setItemsToBook(validItems);
      }
      setIsLoadingItems(false);
    };

    fetchItemsData();
  }, [searchParams]);

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

  if (itemsToBook.length === 0 && !isLoadingItems) { // Check isLoadingItems to prevent flash of this message
    return (
      <div className="text-center py-8">
        <AlertCircle className="w-12 h-12 text-destructive mx-auto mb-4" />
        <p className="text-xl text-destructive">{t('noSectionsSelectedOrFound')}</p> {/* Updated key */}
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
          {t('bookMultipleSections')}
        </h1>
        <p className="text-muted-foreground text-center max-w-md">{t('fillFormToBookSelectedSections')}</p>
      </div>
      <BookingForm bookingCategory="facility" itemsToBook={itemsToBook} />
    </>
  );
}


export default function BookMultipleSectionsPage() {
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
