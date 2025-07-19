
"use client";

import React, { useState, useEffect, useCallback, useMemo } from 'react';
import { PublicLayout } from "@/components/layout/public-layout";
import { HallList } from "@/components/sections/hall-list";
import type { Hall, Booking } from "@/types";
import { useLanguage } from "@/hooks/use-language";
import { useAuth } from "@/hooks/use-auth";
import { Button } from "@/components/ui/button";
import { Building, CalendarPlus, Loader2, CalendarDays, AlertCircle, ArrowDown, CalendarClock } from "lucide-react";
import { useRouter } from "next/navigation";
import { db } from '@/lib/firebase';
import { collection, getDocs, query, where, Timestamp } from 'firebase/firestore';
import { useToast } from '@/hooks/use-toast';
import { DatePickerWithRange } from '@/components/ui/date-picker-with-range';
import type { DateRange } from 'react-day-picker';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { toDateObject } from '@/lib/date-utils';
import Image from 'next/image';
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card';
import { ImageViewer } from '@/components/shared/image-viewer';
import { ScrollAnimate } from '@/components/shared/scroll-animate';
import { BookingCart } from '@/components/sections/booking-cart'; // New Component

type ItemTypeFilter = "all" | "hall" | "section";

export default function HallsAndSectionsPage() {
  const { t } = useLanguage();
  const { user, loading: authLoading } = useAuth();
  const router = useRouter();
  const { toast } = useToast();

  const [allAdminEnabledFacilities, setAllAdminEnabledFacilities] = useState<Hall[]>([]);
  const [filteredFacilitiesByType, setFilteredFacilitiesByType] = useState<Hall[]>([]);
  const [availableFacilitiesInRange, setAvailableFacilitiesInRange] = useState<Hall[]>([]);

  const [selectedItems, setSelectedItems] = useState<Hall[]>([]);
  const [isLoadingInitialFacilities, setIsLoadingInitialFacilities] = useState(true);
  const [isCheckingRangeAvailability, setIsCheckingRangeAvailability] = useState(false);

  const [selectedDateRange, setSelectedDateRange] = useState<DateRange | undefined>(undefined);
  const [itemTypeFilter, setItemTypeFilter] = useState<ItemTypeFilter>("all");
  
  const [isViewerOpen, setIsViewerOpen] = useState(false);
  const [viewerStartIndex, setViewerStartIndex] = useState(0);

  const facilityImages = [
    { src: "/images/Hall.jpg", title: t('halls') },
    { src: "/images/Hall2.jpg", title: t('halls') },
    { src: "/images/Hall_inside.jpg", title: t('hallInterior') },
    { src: "/images/Hall_inside_2.jpg", title: t('hallInterior') },
    { src: "/images/Hall_stage.jpg", title: t('hallStageView') },
    { src: "/images/Sections.jpg", title: t('sections') }
  ];

  const openImageViewer = (index: number) => {
    setViewerStartIndex(index);
    setIsViewerOpen(true);
  };

  const fetchAllAdminEnabledFacilities = useCallback(async () => {
    if (!db) {
        toast({ variant: "destructive", title: t('error'), description: t('databaseConnectionError') });
        setIsLoadingInitialFacilities(false);
        return;
    }
    setIsLoadingInitialFacilities(true);
    try {
      const itemsQuery = query(collection(db, "halls"), where("isAvailable", "==", true));
      const itemsSnapshot = await getDocs(itemsQuery);
      const allItemsData = itemsSnapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as Hall));
      setAllAdminEnabledFacilities(allItemsData);
    } catch (error) {
      console.error("Error fetching halls/sections: ", error);
      toast({ variant: "destructive", title: t('error'), description: t('errorFetchingHallsAndSections') });
    } finally {
      setIsLoadingInitialFacilities(false);
    }
  }, [t, toast]);

  useEffect(() => {
    fetchAllAdminEnabledFacilities().catch(console.error);
  }, [fetchAllAdminEnabledFacilities]);

  useEffect(() => {
    let filtered = allAdminEnabledFacilities;
    if (itemTypeFilter !== "all") {
      filtered = allAdminEnabledFacilities.filter(item => item.itemType === itemTypeFilter);
    }
    setFilteredFacilitiesByType(filtered);
  }, [itemTypeFilter, allAdminEnabledFacilities]);


  const checkFacilityAvailabilityForRange = useCallback(async (facility: Hall, range: DateRange): Promise<boolean> => {
    if (!db) {
        toast({ variant: "destructive", title: t('error'), description: t('databaseConnectionError') });
        return false;
    }
    if (!range.from || !range.to) return true;

    const fromTimestamp = Timestamp.fromDate(range.from);
    const toTimestamp = Timestamp.fromDate(new Date(range.to.setHours(23, 59, 59, 999)));

    const bookingsQuery = query(
        collection(db, "bookings"),
        where("bookingCategory", "==", "facility"),
        where("approvalStatus", "in", ["approved", "pending"]),
        where("startDate", "<=", toTimestamp)
    );

    try {
        const querySnapshot = await getDocs(bookingsQuery);
        const conflictingBookings = querySnapshot.docs.filter(docSnap => {
            const booking = docSnap.data() as Booking;
            const bookingEndDate = toDateObject(booking.endDate); // Use robust date conversion

            if (!bookingEndDate) return false; // Skip if date is invalid

            const overlapsDate = bookingEndDate >= range.from!;
            if (!overlapsDate) return false;

            return booking.items.some(bookedItem => bookedItem.id === facility.id);
        });
        return conflictingBookings.length === 0;
    } catch (error) {
        console.error(`Error checking availability for facility ${facility.id}:`, error);
        toast({ variant: "destructive", title: t('error'), description: t('errorCheckingAvailability') });
        return false;
    }
  }, [t, toast]);

  useEffect(() => {
    if (!selectedDateRange?.from || !selectedDateRange?.to) {
      setAvailableFacilitiesInRange(filteredFacilitiesByType);
      setSelectedItems([]);
      return;
    }

    const updateAvailableFacilities = async () => {
      setIsCheckingRangeAvailability(true);
      const available: Hall[] = [];
      for (const facility of filteredFacilitiesByType) {
        if (facility.isAvailable) {
            const isTrulyAvailableInRange = await checkFacilityAvailabilityForRange(facility, selectedDateRange);
            if (isTrulyAvailableInRange) {
                available.push(facility);
            }
        }
      }
      setAvailableFacilitiesInRange(available);
      setSelectedItems(prevSelected => prevSelected.filter(selItem => available.some(availItem => availItem.id === selItem.id)));
      setIsCheckingRangeAvailability(false);
    };

    updateAvailableFacilities().catch(console.error);
  }, [selectedDateRange, filteredFacilitiesByType, checkFacilityAvailabilityForRange]);


  const displayedFacilities = useMemo(() => {
    return selectedDateRange?.from && selectedDateRange?.to ? availableFacilitiesInRange : filteredFacilitiesByType;
  }, [selectedDateRange, availableFacilitiesInRange, filteredFacilitiesByType]);


  const renderContent = () => {
    if (isLoadingInitialFacilities) {
        return (
          <div className="flex flex-col justify-center items-center h-40">
            <Loader2 className="h-8 w-8 animate-spin mb-2" />
            <p>{t('loadingFacilities')}</p>
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
    if (selectedDateRange?.from && selectedDateRange?.to && availableFacilitiesInRange.length === 0 && !isCheckingRangeAvailability) {
        return (
          <Alert variant="destructive" className="max-w-md mx-auto">
            <AlertCircle className="h-5 w-5" />
            <AlertTitle>{t('noAvailabilityTitle')}</AlertTitle>
            <AlertDescription>
              {t('noFacilitiesAvailableInDateRange')}
            </AlertDescription>
          </Alert>
        );
    }
    if (displayedFacilities.length === 0 && !isLoadingInitialFacilities && !isCheckingRangeAvailability) {
        return <p className="text-center text-lg text-muted-foreground py-10">{t('noItemsCurrentlyMatchFilters')}</p>;
    }

    return (
      <HallList
        halls={displayedFacilities}
        selectable={user?.role === 'company_representative' && user.approvalStatus === 'approved'}
        selectedItems={selectedItems}
        onSelectionChange={setSelectedItems}
        selectedDateRange={selectedDateRange}
      />
    );
  };


  return (
    <PublicLayout>
      <div className="container mx-auto py-12 px-4 space-y-8">
        
        <section className="mb-12 text-center">
          <ScrollAnimate>
            <h1 className="text-3xl font-bold text-primary mb-2 text-center">
                {t('ourConferenceFacilitiesTitle')}
            </h1>
            <p className="text-muted-foreground text-center mb-8 max-w-2xl mx-auto">{t('ourConferenceFacilitiesSubtitle')}</p>
            <p className="text-lg text-muted-foreground max-w-3xl mx-auto mb-10">
              The Oromia Education Center is your premier destination for hosting successful meetings, workshops, and large-scale conferences. Our facilities include state-of-the-art conference halls and versatile meeting sections, all equipped to handle your event's specific needs. Whether you require a grand auditorium for a major symposium or a smaller, more intimate space for a workshop, our venues provide a professional atmosphere with modern amenities and dedicated support to ensure your event runs smoothly and efficiently.
            </p>
          </ScrollAnimate>
            <div className="grid md:grid-cols-2 gap-8 text-left">
              <ScrollAnimate delay={100}>
                <Card className="cursor-pointer group" onClick={() => openImageViewer(0)}>
                    <CardHeader className="p-0">
                        <Image src="/images/Hall.jpg" alt={t('halls')} width={600} height={400} className="rounded-t-lg object-cover w-full h-56 transition-transform duration-300 group-hover:scale-105" data-ai-hint="conference hall" />
                    </CardHeader>
                    <CardContent className="p-4">
                        <CardTitle className="mt-2">{t('halls')}</CardTitle>
                        <p className="text-muted-foreground text-sm mt-2">{t('hallsInfoSectionDesc')}</p>
                    </CardContent>
                </Card>
              </ScrollAnimate>
              <ScrollAnimate delay={200}>
                 <Card className="cursor-pointer group" onClick={() => openImageViewer(5)}>
                    <CardHeader className="p-0">
                        <Image src="/images/Sections.jpg" alt={t('sections')} width={600} height={400} className="rounded-t-lg object-cover w-full h-56 transition-transform duration-300 group-hover:scale-105" data-ai-hint="meeting room" />
                    </CardHeader>
                    <CardContent className="p-4">
                        <CardTitle className="mt-2">{t('sections')}</CardTitle>
                        <p className="text-muted-foreground text-sm mt-2">{t('sectionsInfoSectionDesc')}</p>
                    </CardContent>
                </Card>
              </ScrollAnimate>
            </div>
             <ScrollAnimate className="text-center mt-12">
                <Button asChild size="lg" className="bg-green-600 hover:bg-green-700">
                    <a href="#booking-section">
                        <ArrowDown className="mr-2 h-5 w-5" />
                        {t('goToBookingSection')}
                    </a>
                </Button>
            </ScrollAnimate>
        </section>

        <div id="booking-section" className="pt-8">
            <ScrollAnimate>
              <h2 className="text-3xl font-bold text-primary mb-2 text-center">
                  {t('viewAvailableHallsAndSections')}
              </h2>
              <p className="text-muted-foreground text-center mb-8 max-w-lg mx-auto">{t('selectDateAndFilterFacility')}</p>
            </ScrollAnimate>
        

            <ScrollAnimate delay={100} className="flex flex-col md:flex-row gap-4 justify-center items-center mb-8 p-4 bg-muted/50 rounded-lg shadow">
                <div className="flex-1 min-w-[300px]">
                    <label className="text-sm font-medium mb-1 block">{t('selectDates')}</label>
                    <DatePickerWithRange date={selectedDateRange} onDateChange={setSelectedDateRange} />
                </div>
                <div className="flex-1 min-w-[200px]">
                    <label htmlFor="itemTypeFilter" className="text-sm font-medium mb-1 block">{t('filterByType')}</label>
                    <Select value={itemTypeFilter} onValueChange={(value) => setItemTypeFilter(value as ItemTypeFilter)}>
                        <SelectTrigger id="itemTypeFilter" className="w-full">
                            <SelectValue placeholder={t('filterByTypePlaceholder')} />
                        </SelectTrigger>
                        <SelectContent>
                            <SelectItem value="all">{t('allItemTypes')}</SelectItem>
                            <SelectItem value="hall">{t('hallsOnly')}</SelectItem>
                            <SelectItem value="section">{t('sectionsOnly')}</SelectItem>
                        </SelectContent>
                    </Select>
                </div>
            </ScrollAnimate>

            {renderContent()}

             {user && user.role === 'company_representative' && user.approvalStatus === 'approved' && selectedDateRange?.from && selectedDateRange?.to && selectedItems.length > 0 && (
                <ScrollAnimate>
                    <BookingCart 
                        selectedItems={selectedItems}
                        dateRange={selectedDateRange}
                        allFacilities={allAdminEnabledFacilities}
                    />
                </ScrollAnimate>
             )}
        </div>
      </div>
      <ImageViewer 
        images={facilityImages}
        startIndex={viewerStartIndex}
        isOpen={isViewerOpen}
        onClose={() => setIsViewerOpen(false)}
      />
    </PublicLayout>
  );
}
