
"use client";

import React, { useState, useEffect, useCallback, useMemo } from 'react';
import { PublicLayout } from "@/components/layout/public-layout";
import { DormitoryList } from "@/components/sections/dormitory-list";
import type { Dormitory, Booking } from "@/types";
import { useLanguage } from "@/hooks/use-language";
import { db } from '@/lib/firebase';
import { collection, getDocs, query, where, Timestamp } from 'firebase/firestore';
import { useToast } from '@/hooks/use-toast';
import { Loader2, CalendarDays, AlertCircle, ChevronLeft, ChevronRight } from "lucide-react";
import { DatePickerWithRange } from '@/components/ui/date-picker-with-range';
import type { DateRange } from 'react-day-picker';
import { parseISO } from 'date-fns';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { useSimpleTable } from '@/hooks/use-simple-table';
import { Button } from '@/components/ui/button';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';

export default function DormitoriesPage() {
  const { t } = useLanguage();
  const { toast } = useToast();

  const [allAdminEnabledDormitories, setAllAdminEnabledDormitories] = useState<Dormitory[]>([]);
  const [availableDormitoriesInRange, setAvailableDormitoriesInRange] = useState<Dormitory[]>([]);
  const [selectedDateRange, setSelectedDateRange] = useState<DateRange | undefined>(undefined);
  const [isLoadingInitialDorms, setIsLoadingInitialDorms] = useState(true);
  const [isCheckingRangeAvailability, setIsCheckingRangeAvailability] = useState(false);
  const [buildingFilter, setBuildingFilter] = useState<string>('all');

  const fetchAllAdminEnabledDormitories = useCallback(async () => {
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

  const dormsFilteredByBuilding = useMemo(() => {
    if (buildingFilter === 'all') {
      return allAdminEnabledDormitories;
    }
    return allAdminEnabledDormitories.filter(d => d.buildingName === buildingFilter);
  }, [allAdminEnabledDormitories, buildingFilter]);

  useEffect(() => {
    if (!selectedDateRange?.from || !selectedDateRange?.to) {
      setAvailableDormitoriesInRange([]);
      return;
    }

    const findAvailableDorms = async () => {
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
            const bookingEndDate = booking.endDate instanceof Timestamp ? booking.endDate.toDate() : parseISO(booking.endDate as string);
            
            if (bookingEndDate >= selectedDateRange.from!) {
                booking.items.forEach(item => {
                    if (item.itemType === "dormitory") {
                        bookedBedsCount[item.id] = (bookedBedsCount[item.id] || 0) + 1;
                    }
                });
            }
        });

        const availableDorms = dormsFilteredByBuilding.filter(dorm => {
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
  }, [selectedDateRange, dormsFilteredByBuilding, t, toast]);
  
  const dormsToDisplayBeforePaging = useMemo(() => {
    return (selectedDateRange?.from && selectedDateRange?.to)
      ? availableDormitoriesInRange
      : dormsFilteredByBuilding;
  }, [selectedDateRange, availableDormitoriesInRange, dormsFilteredByBuilding]);

  const {
    paginatedData,
    currentPage,
    pageCount,
    nextPage,
    previousPage,
    canNextPage,
    canPreviousPage,
    totalItems,
  } = useSimpleTable<Dormitory>({
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
        <h1 className="text-3xl font-bold text-primary mb-4 text-center">
          {t('viewAvailableDormitories')}
        </h1>
        <p className="text-muted-foreground text-center mb-8 max-w-lg mx-auto">{t('selectDateRangePrompt')}</p>

        <div className="flex flex-col md:flex-row gap-4 justify-center items-center mb-8 p-4 bg-muted/50 rounded-lg shadow-sm">
            <div className="flex-1 min-w-[300px]">
                <label className="text-sm font-medium mb-1 block">{t('selectDates')}</label>
                <DatePickerWithRange date={selectedDateRange} onDateChange={setSelectedDateRange} />
            </div>
            <div className="flex-1 min-w-[200px]">
                 <label htmlFor="buildingFilter" className="text-sm font-medium mb-1 block">{t('filterByBuilding')}</label>
                <Select value={buildingFilter} onValueChange={(value) => setBuildingFilter(value as string)}>
                    <SelectTrigger id="buildingFilter" className="w-full">
                        <SelectValue placeholder={t('selectBuildingNamePlaceholder')} />
                    </SelectTrigger>
                    <SelectContent>
                        <SelectItem value="all">{t('allBuildings')}</SelectItem>
                        <SelectItem value="ifaboru">{t('ifaBoruBuilding')}</SelectItem>
                        <SelectItem value="buuraboru">{t('buuraBoruBuilding')}</SelectItem>
                    </SelectContent>
                </Select>
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
    </PublicLayout>
  );
}
