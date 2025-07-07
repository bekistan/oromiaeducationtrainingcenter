
"use client";

import React, { useState, useEffect, useCallback, useMemo } from 'react';
import { PublicLayout } from "@/components/layout/public-layout";
import { DormitoryList } from "@/components/sections/dormitory-list";
import type { Dormitory, Booking } from "@/types";
import { useLanguage } from "@/hooks/use-language";
import { db } from '@/lib/firebase';
import { collection, getDocs, query, where, Timestamp } from 'firebase/firestore';
import { useToast } from '@/hooks/use-toast';
import { Loader2, CalendarDays, AlertCircle, ChevronLeft, ChevronRight, Building, Users, ArrowDown } from "lucide-react";
import { DatePickerWithRange } from '@/components/ui/date-picker-with-range';
import type { DateRange } from 'react-day-picker';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { useSimpleTable } from '@/hooks/use-simple-table';
import { Button } from '@/components/ui/button';
import { toDateObject } from '@/lib/date-utils';
import Image from 'next/image';
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card';
import { ImageViewer } from '@/components/shared/image-viewer';

export default function DormitoriesPage() {
  const { t } = useLanguage();
  const { toast } = useToast();

  const [allAdminEnabledDormitories, setAllAdminEnabledDormitories] = useState<Dormitory[]>([]);
  const [availableDormitoriesInRange, setAvailableDormitoriesInRange] = useState<Dormitory[]>([]);
  const [selectedDateRange, setSelectedDateRange] = useState<DateRange | undefined>(undefined);
  const [isLoadingInitialDorms, setIsLoadingInitialDorms] = useState(true);
  const [isCheckingRangeAvailability, setIsCheckingRangeAvailability] = useState(false);
  const [isViewerOpen, setIsViewerOpen] = useState(false);
  const [viewerStartIndex, setViewerStartIndex] = useState(0);

  const buildingImages = [
    { src: "/images/ifaboru.jpg", title: t('ifaBoruBuilding') },
    { src: "/images/Bu'uraboru.jpg", title: t('buuraBoruBuilding') }
  ];

  const openImageViewer = (index: number) => {
    setViewerStartIndex(index);
    setIsViewerOpen(true);
  };

  const fetchAllAdminEnabledDormitories = useCallback(async () => {
    if (!db) {
        toast({ variant: "destructive", title: t('error'), description: t('databaseConnectionError') });
        setIsLoadingInitialDorms(false);
        return;
    }
    setIsLoadingInitialDorms(true);
    try {
      const q = query(collection(db, "dormitories"), where("isAvailable", "==", true));
      const querySnapshot = await getDocs(q);
      const dormsData = querySnapshot.docs.map(doc => ({
          id: doc.id,
          ...doc.data(),
        } as Dormitory));
      setAllAdminEnabledDormitories(dormsData);
    } catch (error) {
      console.error("Error fetching all admin-enabled dormitories: ", error);
      toast({ variant: "destructive", title: t('error'), description: t('errorFetchingDormitories') });
    } finally {
      setIsLoadingInitialDorms(false);
    }
  }, [t, toast]);

  useEffect(() => {
    fetchAllAdminEnabledDormitories();
  }, [fetchAllAdminEnabledDormitories]);

  useEffect(() => {
    if (!selectedDateRange?.from || !selectedDateRange?.to) {
      setAvailableDormitoriesInRange([]);
      return;
    }

    const findAvailableDorms = async () => {
      if (!db) {
        toast({ variant: "destructive", title: t('error'), description: t('databaseConnectionError') });
        return;
      }
      setIsCheckingRangeAvailability(true);

      const fromTimestamp = Timestamp.fromDate(selectedDateRange.from!);
      const toTimestamp = Timestamp.fromDate(new Date(selectedDateRange.to!.setHours(23, 59, 59, 999)));

      const bookingsQuery = query(
          collection(db, "bookings"),
          where("bookingCategory", "==", "dormitory"),
          where("approvalStatus", "in", ["approved", "pending"]),
          where("startDate", "<=", toTimestamp)
      );
      
      try {
        const querySnapshot = await getDocs(bookingsQuery);

        const bookedBedsCount: { [dormId: string]: number } = {};
        querySnapshot.forEach(docSnap => {
            const booking = docSnap.data() as Booking;
            const bookingEndDate = toDateObject(booking.endDate);
            
            if (bookingEndDate && bookingEndDate >= selectedDateRange.from!) {
                booking.items.forEach(item => {
                    if (item.itemType === "dormitory") {
                        bookedBedsCount[item.id] = (bookedBedsCount[item.id] || 0) + 1;
                    }
                });
            }
        });

        const availableDorms = allAdminEnabledDormitories.filter(dorm => {
            const bookedCount = bookedBedsCount[dorm.id] || 0;
            return dorm.isAvailable && dorm.capacity > bookedCount;
        });

        setAvailableDormitoriesInRange(availableDorms);
      } catch (error) {
        console.error("Failed to find available dorms:", error);
        toast({ variant: "destructive", title: t('error'), description: t('errorCheckingAvailability') });
      } finally {
        setIsCheckingRangeAvailability(false);
      }
    };

    findAvailableDorms();
  }, [selectedDateRange, allAdminEnabledDormitories, t, toast]);
  
  const dormsToDisplayBeforePaging = useMemo(() => {
    return (selectedDateRange?.from && selectedDateRange?.to)
      ? availableDormitoriesInRange
      : allAdminEnabledDormitories;
  }, [selectedDateRange, availableDormitoriesInRange, allAdminEnabledDormitories]);

  const {
    paginatedData,
    currentPage,
    pageCount,
    nextPage,
    previousPage,
    canNextPage,
    canPreviousPage,
    totalItems,
  } = useSimpleTable({
    data: dormsToDisplayBeforePaging,
    rowsPerPage: 12,
    searchKeys: ['roomNumber'], 
  });


  const renderContent = () => {
    const hasDateRange = selectedDateRange?.from && selectedDateRange?.to;

    if (isLoadingInitialDorms) {
      return (
        <div className="flex flex-col justify-center items-center h-40">
          <Loader2 className="h-8 w-8 animate-spin mb-2" />
          <p>{t('loadingDormitories')}</p>
        </div>
      );
    }
    
    if (isCheckingRangeAvailability) {
       return (
        <div className="flex flex-col justify-center items-center h-40">
          <Loader2 className="h-8 w-8 animate-spin mb-2" />
          <p>{t('checkingAvailabilityForRange')}</p>
        </div>
      );
    }
    
    if (totalItems === 0) {
      if (hasDateRange) {
        return (
          <Alert variant="destructive" className="max-w-md mx-auto">
            <AlertCircle className="h-5 w-5" />
            <AlertTitle>{t('noAvailabilityTitle')}</AlertTitle>
            <AlertDescription>
              {t('noDormsAvailableInDateRange')}
            </AlertDescription>
          </Alert>
        );
      }
      return <p className="text-center text-lg text-muted-foreground py-10">{t('noDormitoriesConfigured')}</p>;
    }
    

    return (
      <>
        <DormitoryList dormitories={paginatedData} selectedDateRange={selectedDateRange} />
        {pageCount > 1 && (
            <div className="flex items-center justify-between py-4 mt-6">
                <span className="text-sm text-muted-foreground">
                    {t('page')} {pageCount > 0 ? currentPage + 1 : 0} {t('of')} {pageCount} ({totalItems} {t('itemsTotal')})
                </span>
                <div className="space-x-2">
                    <Button
                        variant="outline"
                        size="sm"
                        onClick={previousPage}
                        disabled={!canPreviousPage}
                    >
                        <ChevronLeft className="h-4 w-4 mr-1" /> {t('previous')}
                    </Button>
                    <Button
                        variant="outline"
                        size="sm"
                        onClick={nextPage}
                        disabled={!canNextPage}
                    >
                        {t('next')} <ChevronRight className="h-4 w-4 ml-1" />
                    </Button>
                </div>
              </div>
        )}
      </>
    );
  };


  return (
    <PublicLayout>
      <div className="container mx-auto py-12 px-4">
        
        <section className="mb-16 text-center">
            <h1 className="text-3xl font-bold text-primary mb-2 text-center">
                {t('ourDormitoryBuildingsTitle')}
            </h1>
            <p className="text-muted-foreground text-center mb-8 max-w-2xl mx-auto">{t('ourDormitoryBuildingsSubtitle')}</p>
            <p className="text-lg text-muted-foreground max-w-3xl mx-auto mb-10">
              {t('ourDormitoryBuildingsDescParagraph')}
            </p>
            <div className="grid md:grid-cols-2 gap-8 text-left">
                <Card className="cursor-pointer group" onClick={() => openImageViewer(0)}>
                    <CardHeader className="p-0">
                        <Image src="/images/ifaboru.jpg" alt={t('ifaBoruBuilding')} width={600} height={400} className="rounded-t-lg object-cover w-full h-56 transition-transform duration-300 group-hover:scale-105" data-ai-hint="modern building" />
                    </CardHeader>
                    <CardContent className="p-4">
                        <CardTitle className="mt-2">{t('ifaBoruBuilding')}</CardTitle>
                        <p className="text-muted-foreground text-sm mt-2">{t('ifaBoruBuildingDesc')}</p>
                    </CardContent>
                </Card>
                 <Card className="cursor-pointer group" onClick={() => openImageViewer(1)}>
                    <CardHeader className="p-0">
                        <Image src="/images/Bu'uraboru.jpg" alt={t('buuraBoruBuilding')} width={600} height={400} className="rounded-t-lg object-cover w-full h-56 transition-transform duration-300 group-hover:scale-105" data-ai-hint="modern building" />
                    </CardHeader>
                    <CardContent className="p-4">
                        <CardTitle className="mt-2">{t('buuraBoruBuilding')}</CardTitle>
                        <p className="text-muted-foreground text-sm mt-2">{t('buuraBoruBuildingDesc')}</p>
                    </CardContent>
                </Card>
            </div>
             <div className="text-center mt-12">
                <Button asChild size="lg" className="bg-green-600 hover:bg-green-700">
                    <a href="#booking-section">
                        <ArrowDown className="mr-2 h-5 w-5" />
                        {t('goToBookingSection')}
                    </a>
                </Button>
            </div>
        </section>

        <div id="booking-section" className="pt-8">
            <h2 className="text-3xl font-bold text-primary mb-4 text-center">
            {t('viewAvailableDormitories')}
            </h2>
            <p className="text-muted-foreground text-center mb-8 max-w-lg mx-auto">{t('selectDateRangePrompt')}</p>

            <div className="flex flex-col md:flex-row gap-4 justify-center items-center mb-8 p-4 bg-muted/50 rounded-lg shadow-sm">
                <div className="flex-1 min-w-[300px]">
                    <label className="text-sm font-medium mb-1 block">{t('selectDates')}</label>
                    <DatePickerWithRange date={selectedDateRange} onDateChange={setSelectedDateRange} />
                </div>
            </div>
            
            {!selectedDateRange?.from && !isLoadingInitialDorms && allAdminEnabledDormitories.length > 0 && (
            <Alert variant="default" className="max-w-xl mx-auto mb-8 bg-blue-50 border-blue-200">
                <CalendarDays className="h-5 w-5 text-blue-600" />
                <AlertTitle className="text-blue-700">{t('selectDatesForAccurateAvailability')}</AlertTitle>
                <AlertDescription className="text-blue-600">
                {t('showingAllAdminAvailableDorms')}
                </AlertDescription>
            </Alert>
            )}
            
            <div className="mt-8">
                {renderContent()}
            </div>
        </div>
      </div>
      <ImageViewer 
        images={buildingImages}
        startIndex={viewerStartIndex}
        isOpen={isViewerOpen}
        onClose={() => setIsViewerOpen(false)}
      />
    </PublicLayout>
  );
}
