
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
import type { BookingServiceDetails, BookingItem, Booking, Hall as HallType, AdminNotification } from "@/types";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { AlertCircle, List, Loader2, Building, BedDouble, Film } from 'lucide-react';
import { differenceInCalendarDays, format, parseISO } from 'date-fns';
import { useRouter } from 'next/navigation';
import { db } from '@/lib/firebase';
import { collection, addDoc, Timestamp, query, where, getDocs, doc, getDoc, serverTimestamp, orderBy } from 'firebase/firestore';
import { ETHIOPIAN_BANKS } from '@/constants';

const LUNCH_PRICES_PER_DAY: Record<string, number> = { level1: 150, level2: 250 };
const REFRESHMENT_PRICES_PER_DAY: Record<string, number> = { level1: 50, level2: 100 };


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
  bankName: z.string().min(1, { message: "Bank name is required." }),
  accountNumber: z.string().min(1, { message: "Account number is required." }),
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
  const isDormitoryBooking = bookingCategory === 'dormitory';

  const [isSubmitting, setIsSubmitting] = useState(false);
  const [availabilityError, setAvailabilityError] = useState<string | null>(null);
  const [isCheckingAvailability, setIsCheckingAvailability] = useState(false);
  const [showLedProjectorOption, setShowLedProjectorOption] = useState(false);

  const formSchema = isDormitoryBooking ? dormitoryBookingSchema : facilityBookingSchema;

  const defaultDormitoryValues: DormitoryBookingValues = {
    fullName: "",
    phone: "",
    employer: "",
    dateRange: undefined,
    bankName: "",
    accountNumber: "",
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

  const watchedDateRange = form.watch('dateRange');

  useEffect(() => {
    if (bookingCategory === 'facility') {
      const hasProjectorOption = itemsToBook.some(item => item.itemType === 'section' && typeof item.ledProjectorCost === 'number' && item.ledProjectorCost > 0);
      setShowLedProjectorOption(hasProjectorOption);
    }
  }, [itemsToBook, bookingCategory]);


  const checkFacilityAvailability = useCallback(async (itemsToCheck: BookingItem[], selectedRange: DateRange): Promise<string | null> => {
    if (!selectedRange.from || !selectedRange.to) return null;
    if (selectedRange.to < selectedRange.from) return t('invalidDateRange');

    const fromTimestamp = Timestamp.fromDate(selectedRange.from);
    const toTimestamp = Timestamp.fromDate(new Date(selectedRange.to.setHours(23, 59, 59, 999)));

    const q = query(
      collection(db, "bookings"),
      where("bookingCategory", "==", "facility"),
      where("approvalStatus", "in", ["approved", "pending"]),
      where("startDate", "<=", toTimestamp)
    );

    try {
      const querySnapshot = await getDocs(q);
      const potentiallyConflictingBookings = querySnapshot.docs.map(docSnap => ({id: docSnap.id, ...docSnap.data()} as Booking));

      for (const item of itemsToCheck) {
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

        const conflictingBookingsForItem = potentiallyConflictingBookings.filter(booking => {
          const bookingEndDate = booking.endDate instanceof Timestamp ? booking.endDate.toDate() : parseISO(booking.endDate as string);
          const overlaps = bookingEndDate >= selectedRange.from!;
          if (!overlaps) return false;
          return booking.items.some(bookedItem => bookedItem.id === item.id);
        });

        if (conflictingBookingsForItem.length > 0) {
          return t('itemUnavailableConflict', { itemName: item.name });
        }
      }
      return null;
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
            const bookingStartDate = booking.startDate instanceof Timestamp ? booking.startDate.toDate() : parseISO(booking.startDate as string);
            const bookingEndDate = booking.endDate instanceof Timestamp ? booking.endDate.toDate() : parseISO(booking.endDate as string);
            if (bookingStartDate <= selectedRange.to! && bookingEndDate >= selectedRange.from!) {
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

      if (item && typeof item.pricePerDay === 'number') {
        totalCost = numberOfDays * item.pricePerDay;
      } else {
        toast({ title: t('error'), description: t('couldNotCalculatePrice'), variant: "destructive" });
        setIsSubmitting(false);
        return;
      }

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
        if (i.pricePerDay !== undefined) mappedItem.pricePerDay = i.pricePerDay;
        return mappedItem as BookingItem;
      });

      const bookingDataToSave: Omit<Booking, 'id' | 'bookedAt'> & { bookedAt: any, startDate: any, endDate: any } = {
        bookingCategory: 'dormitory',
        items: mappedItems,
        guestName: dormData.fullName,
        phone: dormData.phone,
        guestEmployer: dormData.employer,
        payerBankName: dormData.bankName,
        payerAccountNumber: dormData.accountNumber,
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
        toast({ title: t('bookingRequestSubmitted'), description: t('dormitoryBookingPendingApproval') });
        
        // Create notification for admin
        const notificationMessageDorm = t('notificationNewDormBooking', {
            guestName: dormData.fullName,
            itemName: itemNameForConfirmation
        });
        const adminNotificationDorm: Omit<AdminNotification, 'id'> = {
            message: notificationMessageDorm,
            type: 'new_dormitory_booking',
            relatedId: docRef.id,
            recipientRole: 'admin',
            isRead: false,
            createdAt: serverTimestamp(),
            link: `/admin/manage-dormitory-bookings#${docRef.id}`
        };
        await addDoc(collection(db, "notifications"), adminNotificationDorm);

        const queryParams = new URLSearchParams({
            status: 'booking_pending_approval', 
            bookingId: docRef.id,
            itemName: itemNameForConfirmation,
            amount: totalCost.toString(),
            category: 'dormitory',
            phone: dormData.phone,
        });
        router.push(`/booking-confirmation?${queryParams.toString()}`);
      } catch (error) {
          console.error("Error saving dormitory booking:", error);
          toast({ variant: "destructive", title: t('error'), description: t('errorSavingBooking') });
          setIsSubmitting(false);
          return;
      }

    } else { // Facility Booking
      const facilityData = data as FacilityBookingValues;
      let rentalCostComponent = 0;
      itemsToBook.forEach(item => {
        rentalCostComponent += (item.rentalCost || 0) * (numberOfDays > 0 ? numberOfDays : 1);
      });

      let lunchCostComponent = 0;
      if (facilityData.services.lunch !== 'none' && facilityData.numberOfAttendees > 0 && numberOfDays > 0) {
        const pricePerDay = LUNCH_PRICES_PER_DAY[facilityData.services.lunch];
        lunchCostComponent = pricePerDay * facilityData.numberOfAttendees * numberOfDays;
      }

      let refreshmentCostComponent = 0;
      if (facilityData.services.refreshment !== 'none' && facilityData.numberOfAttendees > 0 && numberOfDays > 0) {
        const pricePerDay = REFRESHMENT_PRICES_PER_DAY[facilityData.services.refreshment];
        refreshmentCostComponent = pricePerDay * facilityData.numberOfAttendees * numberOfDays;
      }

      let ledProjectorCostComponent = 0;
      if (facilityData.services.ledProjector) {
        itemsToBook.forEach(item => {
          if (item.itemType === 'section' && typeof item.ledProjectorCost === 'number' && item.ledProjectorCost > 0) {
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


      const mappedItems = itemsToBook.map(item => {
        const mappedItem: Partial<BookingItem> & { id: string; name: string; itemType: BookingItem['itemType'] } = {
          id: item.id,
          name: item.name,
          itemType: item.itemType,
        };
        if (item.rentalCost !== undefined) mappedItem.rentalCost = item.rentalCost;
        if (item.ledProjectorCost !== undefined) mappedItem.ledProjectorCost = item.ledProjectorCost;
        if (item.capacity !== undefined) mappedItem.capacity = item.capacity;
        return mappedItem as BookingItem;
      });


      const bookingDataToSave: Omit<Booking, 'id' | 'bookedAt' | 'customAgreementTerms' | 'agreementStatus' | 'agreementSentAt' | 'agreementSignedAt'> & { bookedAt: any, startDate: any, endDate: any } = {
        bookingCategory,
        items: mappedItems,
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
        bookedAt: serverTimestamp(),
        ...(user?.id && { userId: user.id }),
        ...(user?.companyId && { companyId: user.companyId }),
      };

      try {
        const docRef = await addDoc(collection(db, "bookings"), bookingDataToSave);
        
        // Create notification for admin
        const notificationMessageFacility = t('notificationNewFacilityBooking', {
            companyName: facilityData.companyName,
            itemName: itemNameForConfirmation
        });
        const adminNotificationFacility: Omit<AdminNotification, 'id'> = {
            message: notificationMessageFacility,
            type: 'new_facility_booking',
            relatedId: docRef.id,
            recipientRole: 'admin',
            isRead: false,
            createdAt: serverTimestamp(),
            link: `/admin/manage-facility-bookings#${docRef.id}`
        };
        await addDoc(collection(db, "notifications"), adminNotificationFacility);

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

      } catch (error) {
        console.error("Error submitting facility booking: ", error);
        toast({ variant: "destructive", title: t('error'), description: t('errorSubmittingBooking') });
      }
    }
    setIsSubmitting(false);
  }

  if (authLoading) {
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
                  <FormLabel>{t('selectDates')}</FormLabel>
                  <DatePickerWithRange
                    date={field.value}
                    onDateChange={field.onChange as (date: DateRange | undefined) => void}
                  />
                  <FormDescription>{t('selectBothStartAndEndDates')}</FormDescription>
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

                <h3 className="text-lg font-medium pt-4 border-t">{t('paymentTransferDetails')}</h3>
                <FormField
                  control={form.control}
                  name="bankName"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>{t('bankName')}</FormLabel>
                      <Select onValueChange={field.onChange} value={field.value || ""}>
                        <FormControl>
                          <SelectTrigger>
                            <SelectValue placeholder={t('selectBankPlaceholder')} />
                          </SelectTrigger>
                        </FormControl>
                        <SelectContent>
                          {ETHIOPIAN_BANKS.map(bank => (
                            <SelectItem key={bank} value={bank}>{bank}</SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                <FormField
                  control={form.control}
                  name="accountNumber"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>{t('accountNumber')}</FormLabel>
                      <FormControl>
                        <Input placeholder={t('enterAccountNumber')} {...field} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
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
            <Button type="submit" className="w-full" disabled={authLoading || isSubmitting || isCheckingAvailability || !!availabilityError}>
                {(authLoading || isSubmitting || isCheckingAvailability) && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                {t('submitBookingRequest')}
            </Button>
          </form>
        </Form>
      </CardContent>
    </Card>
  );
}

    
