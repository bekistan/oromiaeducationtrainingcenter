
"use client";

import React, { useState, useEffect, useCallback, useMemo } from 'react';
import { PublicLayout } from "@/components/layout/public-layout";
import { DormitoryList } from "@/components/sections/dormitory-list";
import type { Dormitory, Booking } from "@/types";
import { useLanguage } from "@/hooks/use-language";
import { db } from '@/lib/firebase';
import { collection, getDocs, query, where, Timestamp } from 'firebase/firestore';
import { useToast } from '@/hooks/use-toast';
import { Loader2, CalendarDays, AlertCircle, BedDouble } from "lucide-react";
import { DatePickerWithRange } from '@/components/ui/date-picker-with-range';
import type { DateRange } from 'react-day-picker';
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { parseISO } from 'date-fns';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';

export default function DormitoriesPage() {
  const { t } = useLanguage();
  const { toast } = useToast();

  const [allAdminEnabledDormitories, setAllAdminEnabledDormitories] = useState<Dormitory[]>([]);
  const [availableDormitoriesInRange, setAvailableDormitoriesInRange] = useState<Dormitory[]>([]);
  const [selectedDateRange, setSelectedDateRange] = useState<DateRange | undefined>(undefined);
  const [isLoadingInitialDorms, setIsLoadingInitialDorms] = useState(true);
  const [isCheckingRangeAvailability, setIsCheckingRangeAvailability] = useState(false);
  const [activeTab, setActiveTab] = useState<"available" | "all">("all");

  const fetchAllAdminEnabledDormitories = useCallback(async () => {
    setIsLoadingInitialDorms(true);
    try {
      const q = query(collection(db, "dormitories"), where("isAvailable", "==", true));
      const querySnapshot = await getDocs(q);
      const dormsData = querySnapshot.docs.map(doc => ({
          id: doc.id,
          ...doc.data(),
          isAvailable: true
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
    fetchAllAdminEnabledDormitories().catch(console.error);
  }, [fetchAllAdminEnabledDormitories]);

  const checkDormitoryAvailabilityForRange = useCallback(async (dorm: Dormitory, range: DateRange): Promise<boolean> => {
    if (!range.from || !range.to) return true; // No range, assume available from admin perspective
    if (!dorm.capacity || dorm.capacity <= 0) return false; // No capacity, assume not bookable

    const fromTimestamp = Timestamp.fromDate(range.from);
    const toTimestamp = Timestamp.fromDate(new Date(range.to.setHours(23, 59, 59, 999)));

    // Fetch bookings that *might* conflict: start before range ends, and are for dormitories, and are approved/pending.
    const bookingsQuery = query(
        collection(db, "bookings"),
        where("bookingCategory", "==", "dormitory"),
        where("approvalStatus", "in", ["approved", "pending"]),
        where("startDate", "<=", toTimestamp)
    );

    try {
        const querySnapshot = await getDocs(bookingsQuery);
        let bookedBedsDuringPeriod = 0;

        querySnapshot.forEach(docSnap => {
            const booking = docSnap.data() as Booking;
            const bookingStartDate = booking.startDate instanceof Timestamp ? booking.startDate.toDate() : parseISO(booking.startDate as string);
            const bookingEndDate = booking.endDate instanceof Timestamp ? booking.endDate.toDate() : parseISO(booking.endDate as string);

            // Check for actual overlap with the selected range
            const overlaps = bookingStartDate <= range.to! && bookingEndDate >= range.from!;

            if (overlaps) {
                const isForThisRoom = booking.items.some(bookedItem => bookedItem.id === dorm.id && bookedItem.itemType === "dormitory");
                if (isForThisRoom) {
                    bookedBedsDuringPeriod++;
                }
            }
        });
        return bookedBedsDuringPeriod < dorm.capacity;
    } catch (error) {
        console.error(`Error checking availability for dorm ${dorm.id}:`, error);
        toast({ variant: "destructive", title: t('error'), description: t('errorCheckingAvailability') });
        return false; // Assume unavailable on error
    }
  }, [t, toast]);

  useEffect(() => {
    if (!selectedDateRange || !selectedDateRange.from || !selectedDateRange.to) {
      setAvailableDormitoriesInRange([]);
      // If a tab was on "available", switch to "all" if no range is selected, or keep user's choice
      // For simplicity, we won't force tab switch here, user can switch manually.
      return;
    }

    const updateAvailableDorms = async () => {
      setIsCheckingRangeAvailability(true);
      const availableDorms: Dormitory[] = [];
      for (const dorm of allAdminEnabledDormitories) {
        if (dorm.isAvailable) { // Only check admin-enabled dorms
            const isTrulyAvailableInRange = await checkDormitoryAvailabilityForRange(dorm, selectedDateRange);
            if (isTrulyAvailableInRange) {
            availableDorms.push(dorm);
            }
        }
      }
      setAvailableDormitoriesInRange(availableDorms);
      setIsCheckingRangeAvailability(false);
    };

    updateAvailableDorms().catch(console.error);
  }, [selectedDateRange, allAdminEnabledDormitories, checkDormitoryAvailabilityForRange]);

  const handleTabChange = (value: string) => {
    setActiveTab(value as "available" | "all");
  };

  const displayedDormitories = useMemo(() => {
    if (activeTab === "available") {
      return selectedDateRange?.from && selectedDateRange?.to ? availableDormitoriesInRange : [];
    }
    return allAdminEnabledDormitories;
  }, [activeTab, selectedDateRange, availableDormitoriesInRange, allAdminEnabledDormitories]);

  const renderContent = () => {
    if (isLoadingInitialDorms) {
      return (
        <div className="flex flex-col justify-center items-center h-40">
          <Loader2 className="h-8 w-8 animate-spin mb-2" />
          <p>{t('loadingDormitories')}</p>
        </div>
      );
    }

    if (activeTab === "available") {
      if (!selectedDateRange?.from || !selectedDateRange?.to) {
        return (
          <Alert variant="default" className="max-w-md mx-auto bg-blue-50 border-blue-200">
            <CalendarDays className="h-5 w-5 text-blue-600" />
            <AlertTitle className="text-blue-700">{t('selectDatesTitle')}</AlertTitle>
            <AlertDescription className="text-blue-600">
              {t('selectDatesToSeeAvailableDorms')}
            </AlertDescription>
          </Alert>
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
      if (availableDormitoriesInRange.length === 0) {
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
    } else { // activeTab === "all"
      if (allAdminEnabledDormitories.length === 0 && !isLoadingInitialDorms) {
        return <p className="text-center text-lg text-muted-foreground py-10">{t('noDormitoriesConfigured')}</p>;
      }
    }

    return <DormitoryList dormitories={displayedDormitories} />;
  };


  return (
    <PublicLayout>
      <div className="container mx-auto py-12 px-4">
        <h1 className="text-3xl font-bold text-primary mb-4 text-center">
          {t('viewAvailableDormitories')}
        </h1>
        <p className="text-muted-foreground text-center mb-8 max-w-lg mx-auto">{t('selectDateRangePrompt')}</p>

        <div className="mb-8 flex justify-center">
          <DatePickerWithRange date={selectedDateRange} onDateChange={setSelectedDateRange} />
        </div>

        <Tabs value={activeTab} onValueChange={handleTabChange} className="w-full">
          <TabsList className="grid w-full grid-cols-2 md:w-1/2 mx-auto mb-8">
            <TabsTrigger value="available">
              <CalendarDays className="mr-2 h-5 w-5" /> {t('availableDormitoriesTab')}
            </TabsTrigger>
            <TabsTrigger value="all">
              <BedDouble className="mr-2 h-5 w-5" /> {t('allDormitoriesTab')}
            </TabsTrigger>
          </TabsList>

          <TabsContent value="available">
            {renderContent()}
          </TabsContent>

          <TabsContent value="all">
            {renderContent()}
          </TabsContent>
        </Tabs>
      </div>
    </PublicLayout>
  );
}
