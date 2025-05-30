
"use client";

import React, { useEffect, useState, Suspense } from 'react';
import { PublicLayout } from "@/components/layout/public-layout";
import { BookingForm } from "@/components/sections/booking-form";
import { useLanguage } from "@/hooks/use-language";
import { useAuth } from "@/hooks/use-auth";
import { useSearchParams, useRouter } from 'next/navigation';
import { Presentation, AlertCircle, Loader2 } from "lucide-react";
import type { BookingItem } from "@/types";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from '@/components/ui/button';

function BookMultipleSectionsContent() {
  const { t } = useLanguage();
  const searchParams = useSearchParams();
  const router = useRouter();
  const { user, loading: authLoading } = useAuth();
  const [itemsToBook, setItemsToBook] = useState<BookingItem[]>([]);
  const [isLoadingItems, setIsLoadingItems] = useState(true);

  useEffect(() => {
    const itemParams = searchParams.getAll('item'); 
    if (itemParams.length > 0) {
      const parsedItems: BookingItem[] = itemParams.map(param => {
        const [id, name, itemType] = param.split(':');
        return { id: decodeURIComponent(id), name: decodeURIComponent(name), itemType: decodeURIComponent(itemType) as 'section' };
      });
      setItemsToBook(parsedItems);
    }
    setIsLoadingItems(false);
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

  if (itemsToBook.length === 0) {
    return (
      <div className="text-center py-8">
        <AlertCircle className="w-12 h-12 text-destructive mx-auto mb-4" />
        <p className="text-xl text-destructive">{t('noSectionsSelected')}</p> 
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
  const { t } = useLanguage(); // Import t here for fallback
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

    