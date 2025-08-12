
"use client";

import React, { useState, useEffect, useCallback, useMemo } from 'react';
import { PublicLayout } from "@/components/layout/public-layout";
import { HallList } from "@/components/sections/hall-list";
import type { Hall, Booking } from "@/types";
import { useLanguage } from "@/hooks/use-language";
import { useAuth } from "@/hooks/use-auth";
import { Button } from "@/components/ui/button";
import { Building, CalendarPlus, Loader2, CalendarDays, AlertCircle, ArrowDown, CalendarClock, ShoppingCart } from "lucide-react";
import { useRouter } from "next/navigation";
import { db } from '@/lib/firebase';
import { collection, getDocs, query, where, Timestamp, orderBy } from 'firebase/firestore';
import { useToast } from '@/hooks/use-toast';
import { DatePickerWithRange } from '@/components/ui/date-picker-with-range';
import type { DateRange } from 'react-day-picker';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { toDateObject, formatDate } from '@/lib/date-utils';
import Image from 'next/image';
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card';
import { ImageViewer } from '@/components/shared/image-viewer';
import { ScrollAnimate } from '@/components/shared/scroll-animate';
import { BookingCart } from '@/components/sections/booking-cart';
import { eachDayOfInterval } from 'date-fns';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog"


type ItemTypeFilter = "all" | "hall" | "section";

// Type to store availability status for each facility on each day
type DailyAvailabilityMap = Map<string, Map<string, boolean>>; // facilityId -> dateString -> isAvailable

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

  const [dailyAvailability, setDailyAvailability] = useState<DailyAvailabilityMap>(new Map());
  const [isCartOpen, setIsCartOpen] = useState(false);

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
      const itemsQuery = query(collection(db, "halls"), where("isAvailable", "==", true), orderBy("name", "asc"));
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


  useEffect(() => {
    if (!selectedDateRange?.from || !selectedDateRange?.to) {
      setAvailableFacilitiesInRange(filteredFacilitiesByType);
      setSelectedItems([]);
      setDailyAvailability(new Map()); // Clear availability map when range is cleared
      return;
    }

    const checkAvailability = async () => {
      setIsCheckingRangeAvailability(true);
      if (!db) {
        toast({ variant: "destructive", title: t('error'), description: t('databaseConnectionError') });
        setIsCheckingRangeAvailability(false);
        return;
      }
      
      const bookingsQuery = query(
        collection(db, "bookings"),
        where("bookingCategory", "==", "facility")
      );

      try {
        const snapshot = await getDocs(bookingsQuery);
        const bookings = snapshot.docs
          .map(d => d.data() as Booking)
          .filter(b => {
              const bookingStart = toDateObject(b.startDate);
              const bookingEnd = toDateObject(b.endDate);
              const isApprovedOrPending = b.approvalStatus === 'approved' || b.approvalStatus === 'pending';
              
              if (!bookingStart || !bookingEnd || !isApprovedOrPending) return false;

              // Check for overlap: booking starts before range ends AND booking ends after range starts
              return bookingStart <= selectedDateRange.to! && bookingEnd >= selectedDateRange.from!;
          });

        const availabilityMap: DailyAvailabilityMap = new Map();
        const daysInRange = eachDayOfInterval({ start: selectedDateRange.from!, end: selectedDateRange.to! });
        
        filteredFacilitiesByType.forEach(facility => {
            const facilityDayMap = new Map<string, boolean>();
            daysInRange.forEach(day => {
                const isBooked = bookings.some(booking => {
                    const bookingStart = toDateObject(booking.startDate);
                    const bookingEnd = toDateObject(booking.endDate);
                    const isForItem = booking.items.some(item => item.id === facility.id);
                    return isForItem && day >= bookingStart! && day <= bookingEnd!;
                });
                facilityDayMap.set(formatDate(day, 'yyyy-MM-dd'), !isBooked);
            });
            availabilityMap.set(facility.id, facilityDayMap);
        });

        const availableFacilities = filteredFacilitiesByType.filter(facility => {
            const dailyStatuses = availabilityMap.get(facility.id);
            return dailyStatuses && Array.from(dailyStatuses.values()).some(isAvailable => isAvailable);
        });
        
        setDailyAvailability(availabilityMap);
        setAvailableFacilitiesInRange(availableFacilities);
        setSelectedItems(prevSelected => prevSelected.filter(selItem => availableFacilities.some(availItem => availItem.id === selItem.id)));

      } catch (error) {
          console.error("Failed to check availability:", error);
          toast({ variant: "destructive", title: t('error'), description: t('errorCheckingAvailability') });
      } finally {
        setIsCheckingRangeAvailability(false);
      }
    };

    checkAvailability();
  }, [selectedDateRange, filteredFacilitiesByType, t, toast]);


  const displayedFacilities = useMemo(() => {
    return selectedDateRange?.from && selectedDateRange?.to ? availableFacilitiesInRange : filteredFacilitiesByType;
  }, [selectedDateRange, availableFacilitiesInRange, filteredFacilitiesByType]);

  const canSelectItems = useMemo(() => {
    return user?.role === 'company_representative' && user.approvalStatus === 'approved' && !!(selectedDateRange?.from && selectedDateRange?.to);
  }, [user, selectedDateRange]);

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
        selectable={canSelectItems}
        selectedItems={selectedItems}
        onSelectionChange={setSelectedItems}
        selectedDateRange={selectedDateRange}
        dailyAvailability={dailyAvailability}
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

            {canSelectItems && selectedItems.length > 0 && (
                <Dialog open={isCartOpen} onOpenChange={setIsCartOpen}>
                    <DialogTrigger asChild>
                         <div className="fixed bottom-6 right-6 z-40">
                             <Button size="lg" className="rounded-full shadow-2xl bg-green-600 hover:bg-green-700">
                                <ShoppingCart className="mr-2 h-6 w-6"/>
                                {t('finalizeSchedule')} ({selectedItems.length})
                             </Button>
                         </div>
                    </DialogTrigger>
                    <DialogContent className="max-w-4xl max-h-[90vh]">
                         <DialogHeader>
                            <DialogTitle className="text-2xl flex items-center gap-2"><ShoppingCart />{t('finalizeSchedule')}</DialogTitle>
                            <DialogDescription>{t('finalizeScheduleDesc')}</DialogDescription>
                         </DialogHeader>
                         <div className="overflow-y-auto pr-6">
                            <BookingCart 
                                selectedItems={selectedItems}
                                dateRange={selectedDateRange!}
                                allFacilities={allAdminEnabledFacilities}
                                dailyAvailability={dailyAvailability}
                                onBookingComplete={() => setIsCartOpen(false)}
                            />
                         </div>
                    </DialogContent>
                </Dialog>
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
