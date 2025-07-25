
"use client";

import React, { useState, useEffect, useCallback, useRef } from 'react';
import { zodResolver } from "@hookform/resolvers/zod";
import { useForm, Controller } from "react-hook-form";
import * as z from "zod";
import { Button } from "@/components/ui/button";
import {
  Form,
  FormControl,
  FormDescription,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { Label } from "@/components/ui/label";
import { Checkbox } from "@/components/ui/checkbox";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useLanguage } from "@/hooks/use-language";
import { useAuth } from "@/hooks/use-auth";
import { useToast } from "@/hooks/use-toast";
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { DatePickerWithRange } from '@/components/ui/date-picker-with-range';
import type { DateRange } from 'react-day-picker';
import type { BookingServiceDetails, BookingItem, Booking, Hall as HallType, PricingSettings } from "@/types";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { AlertCircle, List, Loader2, Building, BedDouble, Film } from 'lucide-react';
import { differenceInCalendarDays, parseISO } from 'date-fns';
import { useRouter, useSearchParams } from 'next/navigation';
import { db } from '@/lib/firebase';
import { collection, addDoc, Timestamp, query, where, getDocs, doc, getDoc, serverTimestamp, orderBy } from 'firebase/firestore';
import { PRICING_SETTINGS_DOC_PATH, DEFAULT_PRICING_SETTINGS } from '@/constants';
import { notifyAdminsOfNewBooking } from '@/actions/notification-actions';
import { toDateObject } from '@/lib/date-utils';

interface BookingFormProps {
  bookingCategory: 'dormitory' | 'facility';
  itemsToBook: BookingItem[];
}

const dormitoryBookingSchema = z.object({
  fullName: z.string().min(2, { message: "Full name must be at least 2 characters." }),
  phone: z.string().min(7, { message: "Valid phone number is required."}).regex(/^(09|\+2519)\d{8}$/, { message: "Please enter a valid Ethiopian mobile number (e.g., 09... or +2519...)."}),
  employer: z.string().min(2, { message: "Employer name must be at least 2 characters." }),
  dateRange: z.custom<DateRange | undefined>((val) => val !== undefined && val.from !== undefined && val.to !== undefined, {
    message: "Date range with start and end dates is required.",
  }),
});

const facilityBookingSchema = z.object({
  companyName: z.string().min(2, { message: "Company name must be at least 2 characters." }),
  contactPerson: z.string().min(2, { message: "Contact person must be at least 2 characters." }),
  email: z.string().email({ message: "Invalid email address." }),
  phone: z.string().min(7, { message: "Valid phone number is required."}).regex(/^(09|\+2519)\d{8}$/, { message: "Please enter a valid Ethiopian mobile number (e.g., 09... or +2519...)."}),
  dateRange: z.custom<DateRange | undefined>((val) => val !== undefined && val.from !== undefined && val.to !== undefined, {
    message: "Date range with start and end dates is required.",
  }),
  numberOfAttendees: z.coerce.number().min(1, { message: "At least 1 attendee is required." }),
  services: z.object({
    lunch: z.enum(['none', 'level1', 'level2'], { errorMap: (issue, ctx) => ({ message: ctx.defaultError + " - " + issue.code }) }).default('none'),
    refreshment: z.enum(['none', 'level1', 'level2'], { errorMap: (issue, ctx) => ({ message: ctx.defaultError + " - " + issue.code }) }).default('none'),
    ledProjector: z.boolean().optional().default(false),
  }),
  notes: z.string().max(500, { message: "Notes cannot exceed 500 characters." }).optional(),
});

type DormitoryBookingValues = z.infer<typeof dormitoryBookingSchema>;
type FacilityBookingValues = z.infer<typeof facilityBookingSchema>;

export function BookingForm({ bookingCategory, itemsToBook }: BookingFormProps) {
  const { t } = useLanguage();
  const { user, loading: authLoading } = useAuth();
  const { toast } = useToast();
  const router = useRouter();
  const searchParams = useSearchParams();
  const isDormitoryBooking = bookingCategory === 'dormitory';

  const [isSubmitting, setIsSubmitting] = useState(false);
  const [availabilityError, setAvailabilityError] = useState<string | null>(null);
  const [isCheckingAvailability, setIsCheckingAvailability] = useState(false);
  const [showLedProjectorOption, setShowLedProjectorOption] = useState(false);
  const [pricingSettings, setPricingSettings] = useState<PricingSettings>(DEFAULT_PRICING_SETTINGS);
  const [isLoadingPricing, setIsLoadingPricing] = useState(true);
  const [isDateRangeFromUrl, setIsDateRangeFromUrl] = useState(false);

  useEffect(() => {
    const fetchPricing = async () => {
      setIsLoadingPricing(true);
      try {
        const pricingDocRef = doc(db, PRICING_SETTINGS_DOC_PATH);
        const pricingDocSnap = await getDoc(pricingDocRef);
        if (pricingDocSnap.exists()) {
          setPricingSettings(pricingDocSnap.data() as PricingSettings);
        } else {
          console.warn("Global pricing settings not found, using defaults.");
          setPricingSettings(DEFAULT_PRICING_SETTINGS);
        }
      } catch (error) {
        console.error("Error fetching pricing settings:", error);
        setPricingSettings(DEFAULT_PRICING_SETTINGS);
        toast({ variant: "destructive", title: t('error'), description: t('errorFetchingPricingSettings') });
      } finally {
        setIsLoadingPricing(false);
      }
    };
    fetchPricing();
  }, [t, toast]);


  const formSchema = isDormitoryBooking ? dormitoryBookingSchema : facilityBookingSchema;

  const defaultDormitoryValues: DormitoryBookingValues = {
    fullName: "",
    phone: "",
    employer: "",
    dateRange: undefined,
  };

  const defaultFacilityValues: FacilityBookingValues = {
    companyName: user?.role === 'company_representative' ? user.companyName || "" : "",
    contactPerson: user?.role === 'company_representative' ? user.name || "" : "",
    email: user?.email || "",
    phone: user?.phone || "",
    dateRange: undefined,
    numberOfAttendees: 1,
    services: { lunch: 'none' as const, refreshment: 'none' as const, ledProjector: false },
    notes: ""
  };

  const form = useForm<DormitoryBookingValues | FacilityBookingValues>({
    resolver: zodResolver(formSchema),
    defaultValues: isDormitoryBooking
      ? defaultDormitoryValues
      : defaultFacilityValues,
  });
  
  useEffect(() => {
    const startDateStr = searchParams.get('startDate');
    const endDateStr = searchParams.get('endDate');

    if (startDateStr && endDateStr) {
      try {
        const from = parseISO(startDateStr);
        const to = parseISO(endDateStr);
        if (!isNaN(from.getTime()) && !isNaN(to.getTime())) {
          const dateRange: DateRange = { from, to };
          form.setValue('dateRange', dateRange, { shouldValidate: true });
          setIsDateRangeFromUrl(true);
        } else {
            console.error("Invalid date format in URL params");
        }
      } catch (e) {
          console.error("Error parsing dates from URL", e);
      }
    }
  }, [searchParams, form]);


  const watchedDateRange = form.watch('dateRange');

  useEffect(() => {
    if (bookingCategory === 'facility') {
      const hasSectionItem = itemsToBook.some(item => item.itemType === 'section');
      setShowLedProjectorOption(hasSectionItem);
    }
  }, [itemsToBook, bookingCategory]);


  const checkFacilityAvailability = useCallback(async (itemsToCheck: BookingItem[], selectedRange: DateRange): Promise<string | null> => {
    if (!selectedRange.from || !selectedRange.to) return null;
    if (selectedRange.to < selectedRange.from) return t('invalidDateRange');

    // This simplified query avoids the need for a composite Firestore index, which can cause permission-like errors if not created.
    const q = query(
      collection(db, "bookings"),
      where("bookingCategory", "==", "facility"),
      where("approvalStatus", "in", ["approved", "pending"])
    );

    try {
      const querySnapshot = await getDocs(q);
      const allBookings = querySnapshot.docs.map(docSnap => ({id: docSnap.id, ...docSnap.data()} as Booking));

      for (const item of itemsToCheck) {
        // Admin availability check from the item itself
        const itemDocRef = doc(db, "halls", item.id);
        const itemDocSnap = await getDoc(itemDocRef);
        if (itemDocSnap.exists()) {
            const hallData = itemDocSnap.data() as HallType;
            if (!hallData.isAvailable) {
                return t('facilityNotAvailableOverride', { itemName: item.name });
            }
        } else {
            return t('itemNotFoundDatabase', {itemName: item.name });
        }

        // Check for booking conflicts
        const conflictingBooking = allBookings.find(booking => {
          // Check if the current booking is for the item we are checking
          const isForItem = booking.items.some(bookedItem => bookedItem.id === item.id);
          if (!isForItem) return false;

          // Check for date overlap
          const bookingStart = toDateObject(booking.startDate);
          const bookingEnd = toDateObject(booking.endDate);
          if (!bookingStart || !bookingEnd) return false; // Invalid booking data, skip

          return (bookingStart <= selectedRange.to! && bookingEnd >= selectedRange.from!);
        });
        
        if (conflictingBooking) {
          return t('itemUnavailableConflict', { itemName: item.name });
        }
      }
      
      return null; // All items are available
    } catch (error: any) {
      console.error("Error checking facility availability:", error);
      toast({ variant: "destructive", title: t('error'), description: error.message || t('errorCheckingAvailability')});
      return error.message || t('errorCheckingAvailability');
    }
  }, [t, toast]);


  const checkDormitoryBedAvailability = useCallback(async (itemToCheck: BookingItem, selectedRange: DateRange): Promise<string | null> => {
    if (!selectedRange.from || !selectedRange.to) return null;
    if (selectedRange.to < selectedRange.from) return t('invalidDateRange');
    if (!itemToCheck.capacity || itemToCheck.capacity <= 0) return t('dormitoryCapacityNotConfigured');

    const fromTimestamp = Timestamp.fromDate(selectedRange.from);
    const toTimestamp = Timestamp.fromDate(new Date(selectedRange.to.setHours(23, 59, 59, 999)));

    const q = query(
        collection(db, "bookings"),
        where("bookingCategory", "==", "dormitory"),
        where("approvalStatus", "==", "approved"), 
        where("startDate", "<=", toTimestamp)
    );

    try {
        const querySnapshot = await getDocs(q);
        let bookedBedsDuringPeriod = 0;
        querySnapshot.forEach(docSnap => {
            const booking = docSnap.data() as Booking;
            const bookingStartDate = toDateObject(booking.startDate);
            const bookingEndDate = toDateObject(booking.endDate);

            if (bookingStartDate && bookingEndDate && bookingStartDate <= selectedRange.to! && bookingEndDate >= selectedRange.from!) {
                const isForThisRoom = booking.items.some(bookedItem => bookedItem.id === itemToCheck.id && bookedItem.itemType === "dormitory");
                if (isForThisRoom) bookedBedsDuringPeriod++;
            }
        });
        if (bookedBedsDuringPeriod >= itemToCheck.capacity) return t('dormitoryBedsUnavailable', { roomName: itemToCheck.name });
        return null;
    } catch (error: any) {
        console.error("Error checking dormitory bed availability:", error);
        toast({ variant: "destructive", title: t('error'), description: error.message || t('errorCheckingAvailability')});
        return error.message || t('errorCheckingAvailability');
    }
  }, [t, toast]);

 useEffect(() => {
    let isActive = true;
    const performCheck = async () => {
      if (!watchedDateRange?.from || !watchedDateRange?.to || !itemsToBook || itemsToBook.length === 0) {
        if (isActive) setAvailabilityError(null);
        return;
      }
      if (isActive) {
        setIsCheckingAvailability(true);
        setAvailabilityError(null);
      }

      let errorMsg: string | null = null;
      try {
        if (bookingCategory === 'facility') {
          errorMsg = await checkFacilityAvailability(itemsToBook, watchedDateRange);
        } else if (bookingCategory === 'dormitory' && itemsToBook.length === 1) {
          errorMsg = await checkDormitoryBedAvailability(itemsToBook[0], watchedDateRange);
        }
      } catch (e: any) {
        console.error("Error in availability check effect:", e);
        if (isActive) errorMsg = e.message || t('errorCheckingAvailability');
      } finally {
        if (isActive) {
          setAvailabilityError(errorMsg);
          setIsCheckingAvailability(false);
        }
      }
    };

    const debounceTimer = setTimeout(() => {
      performCheck();
    }, 500);

    return () => {
      isActive = false;
      clearTimeout(debounceTimer);
    };
  }, [
    JSON.stringify(itemsToBook.map(item => ({id: item.id, capacity: item.capacity, rentalCost: item.rentalCost, pricePerDay: item.pricePerDay, ledProjectorCost: item.ledProjectorCost }))),
    watchedDateRange?.from?.toISOString(),
    watchedDateRange?.to?.toISOString(),
    bookingCategory,
    t,
    checkFacilityAvailability,
    checkDormitoryBedAvailability
  ]);

  useEffect(() => {
    if (!isDormitoryBooking && user && user.role === 'company_representative') {
        if (user.companyName && form.getValues('companyName') !== user.companyName) {
          form.setValue('companyName', user.companyName, { shouldValidate: true });
        }
        if (user.name && form.getValues('contactPerson') !== user.name) {
          form.setValue('contactPerson', user.name, { shouldValidate: true });
        }
        if (user.email && form.getValues('email') !== user.email) {
          form.setValue('email', user.email, { shouldValidate: true });
        }
        if (user.phone && form.getValues('phone') !== user.phone) {
          form.setValue('phone', user.phone, { shouldValidate: true });
        }
    }
  }, [user, isDormitoryBooking, form]);


  async function onSubmit(data: DormitoryBookingValues | FacilityBookingValues) {
    setIsSubmitting(true);
    let totalCost = 0;
    const itemNameForConfirmation = itemsToBook.map(item => item.name).join(', ');

    if (!data.dateRange?.from || !data.dateRange.to) {
        toast({ title: t('error'), description: t('dateRangeRequired'), variant: "destructive" });
        setIsSubmitting(false);
        return;
    }

    const startDateObject = new Date(data.dateRange.from);
    const endDateObject = new Date(data.dateRange.to);

    if (endDateObject < startDateObject) {
        toast({ title: t('error'), description: t('invalidDateRange'), variant: "destructive" });
        setIsSubmitting(false);
        return;
    }
    const numberOfDays = differenceInCalendarDays(endDateObject, startDateObject) + 1;


    if (isDormitoryBooking) {
      const dormData = data as DormitoryBookingValues;
      const item = itemsToBook[0]; 
      let proceedWithBooking = true;

      const startOfDay = new Date(startDateObject);
      startOfDay.setHours(0, 0, 0, 0);
      const startOfDayTimestamp = Timestamp.fromDate(startOfDay);

      const endOfDay = new Date(startDateObject); 
      endOfDay.setHours(23, 59, 59, 999);
      const endOfDayTimestamp = Timestamp.fromDate(endOfDay);

      const existingBookingQuery = query(
        collection(db, "bookings"),
        where("approvalStatus", "in", ["pending", "approved"]), 
        where("bookingCategory", "==", "dormitory"),
        where("phone", "==", dormData.phone),
        where("startDate", ">=", startOfDayTimestamp),
        where("startDate", "<=", endOfDayTimestamp),
        orderBy("startDate") 
      );

      try {
        const existingBookingSnapshot = await getDocs(existingBookingQuery);
        if (!existingBookingSnapshot.empty) {
           toast({
            variant: "destructive",
            title: t('duplicateBookingTitle'),
            description: t('sorryYouCannotBookTwice'), 
          });
          proceedWithBooking = false;
        }
      } catch (queryError: any) {
        console.error("Firestore query error during existing booking check:", queryError);
        let indexCreationLink = "";
        if (queryError.message && typeof queryError.message === 'string' && queryError.message.includes("indexes?create_composite=")) {
            const match = queryError.message.match(/(https:\/\/console\.firebase\.google\.com\/v1\/r\/project\/[^/]+\/firestore\/indexes\?create_composite=[^ ]+)/);
            if (match && match[0]) indexCreationLink = match[0];
        }

        if (queryError.code === 'failed-precondition' && indexCreationLink) {
          toast({ variant: "destructive", title: t('warningDatabaseConfigNeeded'), description: t('duplicateCheckSkippedBookingProceeds'), duration: 10000 });
          console.warn("DUPLICATE CHECK SKIPPED due to missing Firestore index. Booking will proceed. Index link: " + indexCreationLink);
        } else {
          toast({ variant: "destructive", title: t('bookingErrorTitle'), description: t('firestoreIndexRequiredErrorDetailed') });
          proceedWithBooking = false;
        }
      }
      
      if (!proceedWithBooking) {
        setIsSubmitting(false);
        return; 
      }

      const pricePerDayToUse = typeof item.pricePerDay === 'number' ? item.pricePerDay : pricingSettings.defaultDormitoryPricePerDay;
      totalCost = numberOfDays * pricePerDayToUse;
      
      if (isNaN(totalCost)) {
        toast({ variant: "destructive", title: t('error'), description: t('errorCalculatingTotalCostNaN') });
        setIsSubmitting(false);
        return;
      }

      const mappedItems = itemsToBook.map(i => {
        const mappedItem: Partial<BookingItem> & { id: string; name: string; itemType: BookingItem['itemType'] } = {
          id: i.id,
          name: i.name,
          itemType: i.itemType,
        };
        if (i.capacity !== undefined) mappedItem.capacity = i.capacity;
        mappedItem.pricePerDay = pricePerDayToUse; 
        return mappedItem as BookingItem;
      });

      const bookingDataToSave: Omit<Booking, 'id' | 'bookedAt'> & { bookedAt: any, startDate: any, endDate: any } = {
        bookingCategory: 'dormitory',
        items: mappedItems,
        guestName: dormData.fullName,
        phone: dormData.phone,
        guestEmployer: dormData.employer,
        startDate: Timestamp.fromDate(startDateObject),
        endDate: Timestamp.fromDate(endDateObject),
        totalCost,
        paymentStatus: 'pending_transfer' as const,
        approvalStatus: 'pending' as const,
        bookedAt: serverTimestamp(),
        ...(user?.id && { userId: user.id }),
      };

      try {
        const docRef = await addDoc(collection(db, "bookings"), bookingDataToSave);
        
        const createdBookingForNotification: Booking = {
            ...(bookingDataToSave as any),
            id: docRef.id,
            bookedAt: new Date().toISOString(),
            startDate: Timestamp.fromDate(startDateObject).toDate().toISOString(),
            endDate: Timestamp.fromDate(endDateObject).toDate().toISOString(),
        };

        notifyAdminsOfNewBooking(createdBookingForNotification).catch(err => {
            console.error("SMS and Web notification to admins failed to dispatch:", err);
        });

        toast({ title: t('bookingRequestSubmitted'), description: t('dormitoryBookingPendingApproval') });

        const queryParams = new URLSearchParams({
            status: 'booking_pending_approval', 
            bookingId: docRef.id,
            itemName: itemNameForConfirmation,
            amount: totalCost.toString(),
            category: 'dormitory',
            phone: dormData.phone,
        });
        router.push(`/booking-confirmation?${queryParams.toString()}`);
      } catch (error: any) {
          console.error("Error saving dormitory booking:", error);
          let toastMessage = t('errorSavingBooking');
          if (error.code === 'permission-denied') {
            toastMessage = t('bookingPermissionDeniedErrorDetailed'); 
          }
          toast({ variant: "destructive", title: t('error'), description: toastMessage });
          setIsSubmitting(false);
          return;
      }

    } else { 
      const facilityData = data as FacilityBookingValues;
      let rentalCostComponent = 0;
      const mappedItemsForFacility = itemsToBook.map(item => {
        const itemRentalCost = typeof item.rentalCost === 'number' 
            ? item.rentalCost 
            : (item.itemType === 'hall' ? pricingSettings.defaultHallRentalCostPerDay : pricingSettings.defaultSectionRentalCostPerDay);
        rentalCostComponent += itemRentalCost * (numberOfDays > 0 ? numberOfDays : 1);
        
        let itemLedProjectorCostApplied = null;
        if (item.itemType === 'section' && facilityData.services.ledProjector) {
            itemLedProjectorCostApplied = typeof item.ledProjectorCost === 'number' ? item.ledProjectorCost : pricingSettings.defaultLedProjectorCostPerDay;
        }

        return {
          id: item.id,
          name: item.name,
          itemType: item.itemType,
          rentalCost: itemRentalCost, 
          ...(item.capacity !== undefined && { capacity: item.capacity }),
          ...(itemLedProjectorCostApplied !== null && { ledProjectorCost: itemLedProjectorCostApplied }), 
        } as BookingItem;
      });

      let lunchCostComponent = 0;
      if (facilityData.services.lunch !== 'none' && facilityData.numberOfAttendees > 0 && numberOfDays > 0) {
        const pricePerDay = facilityData.services.lunch === 'level1' ? pricingSettings.lunchServiceCostLevel1 : pricingSettings.lunchServiceCostLevel2;
        lunchCostComponent = pricePerDay * facilityData.numberOfAttendees * numberOfDays;
      }

      let refreshmentCostComponent = 0;
      if (facilityData.services.refreshment !== 'none' && facilityData.numberOfAttendees > 0 && numberOfDays > 0) {
        const pricePerDay = facilityData.services.refreshment === 'level1' ? pricingSettings.refreshmentServiceCostLevel1 : pricingSettings.refreshmentServiceCostLevel2;
        refreshmentCostComponent = pricePerDay * facilityData.numberOfAttendees * numberOfDays;
      }

      let ledProjectorCostComponent = 0;
      if (facilityData.services.ledProjector) {
        mappedItemsForFacility.forEach(item => {
          if (item.itemType === 'section' && typeof item.ledProjectorCost === 'number') {
            ledProjectorCostComponent += item.ledProjectorCost * (numberOfDays > 0 ? numberOfDays : 1);
          }
        });
      }
      
      totalCost = rentalCostComponent + lunchCostComponent + refreshmentCostComponent + ledProjectorCostComponent;

      if (isNaN(totalCost)) {
        toast({ variant: "destructive", title: t('error'), description: t('errorCalculatingTotalCostNaN') });
        setIsSubmitting(false);
        return;
      }

      const serviceDetails: BookingServiceDetails = {};
      if (facilityData.services.lunch && facilityData.services.lunch !== 'none') {
        serviceDetails.lunch = facilityData.services.lunch;
      }
      if (facilityData.services.refreshment && facilityData.services.refreshment !== 'none') {
        serviceDetails.refreshment = facilityData.services.refreshment;
      }
      if (facilityData.services.ledProjector) {
        serviceDetails.ledProjector = true;
      }

      const bookingDataToSave: Omit<Booking, 'id' | 'bookedAt' | 'customAgreementTerms' | 'agreementSentAt' | 'agreementSignedAt'> & { bookedAt: any, startDate: any, endDate: any } = {
        bookingCategory,
        items: mappedItemsForFacility,
        companyName: facilityData.companyName,
        contactPerson: facilityData.contactPerson,
        email: facilityData.email,
        phone: facilityData.phone,
        startDate: Timestamp.fromDate(startDateObject),
        endDate: Timestamp.fromDate(endDateObject),
        numberOfAttendees: facilityData.numberOfAttendees,
        ...(Object.keys(serviceDetails).length > 0 && { serviceDetails }),
        ...(facilityData.notes !== undefined && facilityData.notes.trim() !== "" && { notes: facilityData.notes }),
        totalCost,
        paymentStatus: 'pending' as const,
        approvalStatus: 'pending' as const,
        agreementStatus: 'pending_admin_action' as const,
        bookedAt: serverTimestamp(),
        ...(user?.id && { userId: user.id }),
        ...(user?.companyId && { companyId: user.companyId }),
      };

      try {
        const docRef = await addDoc(collection(db, "bookings"), bookingDataToSave);
        
        const createdBookingForNotification: Booking = {
            ...(bookingDataToSave as any),
            id: docRef.id,
            bookedAt: new Date().toISOString(),
            startDate: Timestamp.fromDate(startDateObject).toDate().toISOString(),
            endDate: Timestamp.fromDate(endDateObject).toDate().toISOString(),
        };

        notifyAdminsOfNewBooking(createdBookingForNotification).catch(err => {
            console.error("SMS and Web notification to admins failed to dispatch:", err);
        });

        toast({ title: t('bookingRequestSubmitted'), description: t('facilityBookingPendingApproval') });

        const queryParams = new URLSearchParams({
            status: 'booking_pending_approval',
            bookingId: docRef.id,
            itemName: itemNameForConfirmation,
            amount: totalCost.toString(),
            category: 'facility',
            phone: facilityData.phone,
        });
        router.push(`/booking-confirmation?${queryParams.toString()}`);

      } catch (error: any) {
        console.error("Error submitting facility booking: ", error);
        let toastMessage = t('errorSubmittingBooking');
        if (error.code === 'permission-denied') {
          toastMessage = t('bookingPermissionDeniedErrorDetailed'); 
        }
        toast({ variant: "destructive", title: t('error'), description: toastMessage });
      }
    }
    setIsSubmitting(false);
  }

  if (authLoading || isLoadingPricing) {
    return <div className="flex justify-center items-center h-40"><Loader2 className="h-8 w-8 animate-spin" /></div>;
  }

  if (!isDormitoryBooking && (!user || user.role !== 'company_representative')) {
    return (
      <Card className="w-full max-w-2xl mx-auto my-8 shadow-xl">
        <CardHeader>
          <CardTitle className="text-2xl text-center text-destructive flex items-center justify-center">
            <AlertCircle className="mr-2 h-8 w-8" /> {t('accessDenied')}
          </CardTitle>
        </CardHeader>
        <CardContent className="text-center">
          <p>{t('mustBeLoggedInAsCompany')}</p>
           <Button onClick={() => router.push(`/auth/login?redirect=${encodeURIComponent(window.location.pathname + window.location.search)}`)} className="mt-4">
            {t('login')}
          </Button>
        </CardContent>
      </Card>
    );
  }
  
  if (!isDormitoryBooking && user?.role === 'company_representative' && user.approvalStatus !== 'approved') {
    return (
      <Card className="w-full max-w-2xl mx-auto my-8 shadow-xl">
        <CardHeader>
          <CardTitle className="text-2xl text-center text-yellow-600 flex items-center justify-center">
            <AlertCircle className="mr-2 h-8 w-8" /> {t('accountPendingApprovalTitle')}
          </CardTitle>
        </CardHeader>
        <CardContent className="text-center">
          <p>{t('accountPendingApprovalBookFacility')}</p>
          <Button onClick={() => router.push('/company/dashboard')} className="mt-4">
            {t('backToCompanyDashboard')}
          </Button>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card className="w-full max-w-2xl mx-auto my-8 shadow-xl">
      <CardHeader>
        <CardTitle className="text-2xl text-center text-primary">
          {t('submitBookingRequest')}
        </CardTitle>
        {itemsToBook && itemsToBook.length > 0 && (
          <div className="text-sm text-muted-foreground text-center mt-2">
            <div className="flex items-center justify-center mb-1">
                {bookingCategory === 'dormitory' ? <BedDouble className="mr-2 h-5 w-5 text-primary"/> : <Building className="mr-2 h-5 w-5 text-primary"/>}
                <span className="font-semibold">{t('bookingForItems')}:</span>
            </div>
            <ul className="list-disc list-inside text-left inline-block">
                {itemsToBook.map(item => (
                    <li key={item.id} className="text-xs">{item.name} ({t(item.itemType)})</li>
                ))}
            </ul>
          </div>
        )}
      </CardHeader>
      <CardContent>
        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-8">
            {isCheckingAvailability && (
              <div className="flex items-center justify-center text-sm text-muted-foreground p-2">
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                {t('checkingAvailability')}
              </div>
            )}
            {availabilityError && (
              <Alert variant="destructive">
                <AlertCircle className="h-4 w-4" />
                <AlertTitle>
                   {availabilityError === t('errorCheckingAvailability') ? t('error') : t('availabilityErrorTitle')}
                </AlertTitle>
                <AlertDescription>{availabilityError}</AlertDescription>
              </Alert>
            )}
            <FormField
              control={form.control}
              name="dateRange"
              render={({ field }) => (
                <FormItem className="flex flex-col">
                  <FormLabel>{isDateRangeFromUrl ? t('bookingDates') : t('selectDates')}</FormLabel>
                  <DatePickerWithRange
                    date={field.value}
                    onDateChange={field.onChange as (date: DateRange | undefined) => void}
                    disabled={isDateRangeFromUrl || isCheckingAvailability}
                  />
                  <FormDescription>
                    {isDateRangeFromUrl ? t('dateRangePreselected') : t('selectBothStartAndEndDates')}
                  </FormDescription>
                  <FormMessage />
                </FormItem>
              )}
            />

            {isDormitoryBooking && (
              <>
                <h3 className="text-lg font-medium pt-4 border-t">{t('personalInformation')}</h3>
                <FormField control={form.control} name="fullName" render={({ field }) => ( <FormItem><FormLabel>{t('fullName')}</FormLabel><FormControl><Input placeholder={t('enterFullName')} {...field} /></FormControl><FormMessage /></FormItem> )} />
                <FormField control={form.control} name="phone" render={({ field }) => ( <FormItem><FormLabel>{t('phone')}</FormLabel><FormControl><Input type="tel" placeholder={t('enterPhoneEthiopian')} {...field} /></FormControl><FormDescription>{t('phoneForTelegramIdentification')}</FormDescription><FormMessage /></FormItem> )} />
                <FormField control={form.control} name="employer" render={({ field }) => ( <FormItem><FormLabel>{t('employer')}</FormLabel><FormControl><Input placeholder={t('enterEmployer')} {...field} /></FormControl><FormMessage /></FormItem> )} />
              </>
            )}

            {!isDormitoryBooking && (
              <>
                <h3 className="text-lg font-medium pt-4 border-t">{t('companyInformation')}</h3>
                <FormField control={form.control} name="companyName" render={({ field }) => ( <FormItem><FormLabel>{t('companyName')}</FormLabel><FormControl><Input placeholder={t('enterCompanyName')} {...field} /></FormControl><FormMessage /></FormItem> )} />
                <FormField control={form.control} name="contactPerson" render={({ field }) => ( <FormItem><FormLabel>{t('contactPerson')}</FormLabel><FormControl><Input placeholder={t('enterContactPerson')} {...field} /></FormControl><FormMessage /></FormItem> )} />
                <FormField control={form.control} name="email" render={({ field }) => ( <FormItem><FormLabel>{t('email')}</FormLabel><FormControl><Input type="email" placeholder={t('enterEmail')} {...field} /></FormControl><FormMessage /></FormItem> )} />
                <FormField control={form.control} name="phone" render={({ field }) => ( <FormItem><FormLabel>{t('phone')}</FormLabel><FormControl><Input type="tel" placeholder={t('enterPhoneEthiopian')} {...field} /></FormControl><FormDescription>{t('phoneForTelegramIdentificationOptional')}</FormDescription><FormMessage /></FormItem> )} />
                <FormField control={form.control} name="numberOfAttendees" render={({ field }) => ( <FormItem><FormLabel>{t('numberOfAttendees')}</FormLabel><FormControl><Input type="number" min="1" placeholder={t('exampleAttendees')} {...field} /></FormControl><FormMessage /></FormItem> )} />
                
                <FormField
                  control={form.control}
                  name="services.lunch"
                  render={({ field }) => (
                    <FormItem className="space-y-3">
                      <FormLabel>{t('lunchLevel')}</FormLabel>
                      <RadioGroup
                        onValueChange={field.onChange}
                        value={field.value}
                        className="flex flex-col space-y-1"
                      >
                        <div className="flex items-center space-x-3">
                          <RadioGroupItem value="none" id="lunch-none" />
                          <Label htmlFor="lunch-none" className="font-normal">{t('serviceLevelNone')}</Label>
                        </div>
                        <div className="flex items-center space-x-3">
                          <RadioGroupItem value="level1" id="lunch-level1" />
                          <Label htmlFor="lunch-level1" className="font-normal">{t('serviceLevel1')} {t('lunch')}</Label>
                        </div>
                        <div className="flex items-center space-x-3">
                          <RadioGroupItem value="level2" id="lunch-level2" />
                          <Label htmlFor="lunch-level2" className="font-normal">{t('serviceLevel2')} {t('lunch')}</Label>
                        </div>
                      </RadioGroup>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                <FormField
                  control={form.control}
                  name="services.refreshment"
                  render={({ field }) => (
                    <FormItem className="space-y-3">
                      <FormLabel>{t('refreshmentLevel')}</FormLabel>
                       <RadioGroup
                        onValueChange={field.onChange}
                        value={field.value}
                        className="flex flex-col space-y-1"
                      >
                        <div className="flex items-center space-x-3">
                          <RadioGroupItem value="none" id="refreshment-none" />
                          <Label htmlFor="refreshment-none" className="font-normal">{t('serviceLevelNone')}</Label>
                        </div>
                        <div className="flex items-center space-x-3">
                          <RadioGroupItem value="level1" id="refreshment-level1" />
                          <Label htmlFor="refreshment-level1" className="font-normal">{t('serviceLevel1')} {t('refreshment')}</Label>
                        </div>
                        <div className="flex items-center space-x-3">
                          <RadioGroupItem value="level2" id="refreshment-level2" />
                          <Label htmlFor="refreshment-level2" className="font-normal">{t('serviceLevel2')} {t('refreshment')}</Label>
                        </div>
                      </RadioGroup>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                {showLedProjectorOption && (
                    <FormField
                        control={form.control}
                        name="services.ledProjector"
                        render={({ field }) => (
                        <FormItem className="flex flex-row items-start space-x-3 space-y-0 rounded-md border p-4">
                            <FormControl>
                            <Checkbox
                                checked={field.value}
                                onCheckedChange={field.onChange}
                                id="ledProjector"
                            />
                            </FormControl>
                            <div className="space-y-1 leading-none">
                            <FormLabel htmlFor="ledProjector" className="flex items-center">
                                <Film className="mr-2 h-4 w-4 text-primary" /> {t('addLedProjector')}
                            </FormLabel>
                            <FormDescription>
                                {t('addLedProjectorDescription')}
                            </FormDescription>
                            </div>
                        </FormItem>
                        )}
                    />
                )}
                <FormField control={form.control} name="notes" render={({ field }) => ( <FormItem><FormLabel>{t('notesOrSpecialRequests')}</FormLabel><FormControl><Textarea placeholder={t('anySpecialRequests')} {...field} /></FormControl><FormMessage /></FormItem> )} />
              </>
            )}
            <Button type="submit" className="w-full" disabled={authLoading || isLoadingPricing || isSubmitting || isCheckingAvailability || !!availabilityError}>
                {(authLoading || isLoadingPricing || isSubmitting || isCheckingAvailability) && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                {t('submitBookingRequest')}
            </Button>
          </form>
        </Form>
      </CardContent>
    </Card>
  );
}
