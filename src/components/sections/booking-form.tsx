
"use client";

import React, { useState, useEffect, useCallback } from 'react';
import { zodResolver } from "@hookform/resolvers/zod";
import { useForm } from "react-hook-form";
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
import { useLanguage } from "@/hooks/use-language";
import { useAuth } from "@/hooks/use-auth";
import { useToast } from "@/hooks/use-toast";
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { DatePickerWithRange } from '@/components/ui/date-picker-with-range';
import type { DateRange } from 'react-day-picker';
import type { BookingServiceDetails, BookingItem, Booking } from "@/types";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { AlertCircle, List, Loader2 } from 'lucide-react';
import { differenceInCalendarDays, format, parseISO } from 'date-fns';
import { useRouter } from 'next/navigation';
import { db } from '@/lib/firebase';
import { collection, addDoc, Timestamp, query, where, getDocs, doc, getDoc, serverTimestamp } from 'firebase/firestore';

const LUNCH_PRICES_PER_DAY: Record<string, number> = { level1: 150, level2: 250 };
const REFRESHMENT_PRICES_PER_DAY: Record<string, number> = { level1: 50, level2: 100 };


interface BookingFormProps {
  bookingCategory: 'dormitory' | 'facility';
  itemsToBook: BookingItem[];
}

const dormitoryBookingSchema = z.object({
  fullName: z.string().min(2, { message: "Full name must be at least 2 characters." }),
  idCardScan: z.custom<File>((v) => v instanceof File, { message: "ID card scan is required." }).optional(), // Optional for now
  employer: z.string().min(2, { message: "Employer name must be at least 2 characters." }),
  dateRange: z.custom<DateRange | undefined>((val) => val !== undefined && val.from !== undefined && val.to !== undefined, {
    message: "Date range with start and end dates is required.",
  }),
});

const facilityBookingSchema = z.object({
  companyName: z.string().min(2, { message: "Company name must be at least 2 characters." }),
  contactPerson: z.string().min(2, { message: "Contact person must be at least 2 characters." }),
  email: z.string().email({ message: "Invalid email address." }),
  phone: z.string().min(7, { message: "Phone number seems too short." }),
  dateRange: z.custom<DateRange | undefined>((val) => val !== undefined && val.from !== undefined && val.to !== undefined, {
    message: "Date range with start and end dates is required.",
  }),
  numberOfAttendees: z.coerce.number().min(1, { message: "At least 1 attendee is required." }),
  services: z.object({
    lunch: z.enum(['none', 'level1', 'level2'], { errorMap: (issue, ctx) => ({ message: ctx.defaultError + " - " + issue.code }) }).default('none'),
    refreshment: z.enum(['none', 'level1', 'level2'], { errorMap: (issue, ctx) => ({ message: ctx.defaultError + " - " + issue.code }) }).default('none'),
  }),
  notes: z.string().optional(),
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

  const formSchema = isDormitoryBooking ? dormitoryBookingSchema : facilityBookingSchema;

  const defaultFacilityValues = {
    companyName: user?.role === 'company_representative' ? user.companyName || "" : "",
    contactPerson: user?.role === 'company_representative' ? user.name || "" : "",
    email: user?.email || "",
    phone: user?.phone || "",
    dateRange: undefined,
    numberOfAttendees: 1,
    services: { lunch: 'none' as const, refreshment: 'none' as const },
    notes: ""
  };

  const form = useForm<DormitoryBookingValues | FacilityBookingValues>({
    resolver: zodResolver(formSchema),
    defaultValues: isDormitoryBooking
      ? { fullName: "", employer: "", dateRange: undefined }
      : defaultFacilityValues,
  });

  const watchedDateRange = form.watch('dateRange');

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
        if (itemDocSnap.exists() && !itemDocSnap.data().isAvailable) {
          return t('facilityNotAvailableOverride', { itemName: item.name });
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
    console.log(`DORM CHECK INIT (${itemToCheck.name}): Capacity: ${itemToCheck.capacity}, Range: ${selectedRange.from?.toLocaleDateString()} - ${selectedRange.to?.toLocaleDateString()}`);
    if (!selectedRange.from || !selectedRange.to) return null;
    if (selectedRange.to < selectedRange.from) return t('invalidDateRange');
    
    if (!itemToCheck.capacity || itemToCheck.capacity <= 0) {
      console.warn(`Dormitory ${itemToCheck.name} has invalid capacity: ${itemToCheck.capacity}.`);
      return t('dormitoryCapacityNotConfigured');
    }

    const fromTimestamp = Timestamp.fromDate(selectedRange.from);
    const toTimestamp = Timestamp.fromDate(new Date(selectedRange.to.setHours(23, 59, 59, 999)));

    const q = query(
        collection(db, "bookings"),
        where("bookingCategory", "==", "dormitory"),
        where("approvalStatus", "==", "approved"), // Only consider approved (paid or awaiting verification after payment)
        where("startDate", "<=", toTimestamp) 
    );

    try {
        const querySnapshot = await getDocs(q);
        let bookedBedsDuringPeriod = 0;
        console.log(`DORM CHECK (${itemToCheck.name}): Found ${querySnapshot.docs.length} potentially conflicting approved dorm bookings starting before or on ${selectedRange.to.toLocaleDateString()}`);

        querySnapshot.forEach(docSnap => {
            const booking = docSnap.data() as Booking;
            const bookingStartDate = booking.startDate instanceof Timestamp ? booking.startDate.toDate() : parseISO(booking.startDate as string);
            const bookingEndDate = booking.endDate instanceof Timestamp ? booking.endDate.toDate() : parseISO(booking.endDate as string);
            
            console.log(` DORM CHECK - Evaluating existing booking ${docSnap.id} for room ${itemToCheck.id} (${itemToCheck.name}): Dates ${bookingStartDate.toLocaleDateString()} to ${bookingEndDate.toLocaleDateString()}`);

            // Check for date overlap
            if (bookingStartDate <= selectedRange.to! && bookingEndDate >= selectedRange.from!) {
                console.log(`  Overlap detected with booking ${docSnap.id}. Checking items...`);
                const isForThisRoom = booking.items.some(bookedItem =>
                    bookedItem.id === itemToCheck.id &&
                    bookedItem.itemType === "dormitory"
                );

                if (isForThisRoom) {
                    bookedBedsDuringPeriod++;
                    console.log(`   Booking ${docSnap.id} IS for room ${itemToCheck.name}. Booked beds for period now: ${bookedBedsDuringPeriod}`);
                } else {
                    console.log(`   Booking ${docSnap.id} is NOT for room ${itemToCheck.name}. Items:`, booking.items);
                }
            } else {
                 console.log(`  No date overlap with booking ${docSnap.id}.`);
            }
        });
        
        console.log(`DORM CHECK FINAL (${itemToCheck.name}): Total booked beds in period: ${bookedBedsDuringPeriod}. Capacity: ${itemToCheck.capacity}`);
        if (bookedBedsDuringPeriod >= itemToCheck.capacity) {
            console.log(`   RESULT: Beds unavailable.`);
            return t('dormitoryBedsUnavailable', { roomName: itemToCheck.name });
        }
        console.log(`   RESULT: Beds available.`);
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

    performCheck();
    return () => { isActive = false; };
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [
    JSON.stringify(itemsToBook.map(item => ({id: item.id, capacity: item.capacity}))), 
    watchedDateRange?.from?.toISOString(), 
    watchedDateRange?.to?.toISOString(),   
    bookingCategory,
    t 
  ]);


  React.useEffect(() => {
    if (!isDormitoryBooking && user && user.role === 'company_representative') {
      form.reset({
        companyName: user.companyName || "",
        contactPerson: user.name || "",
        email: user.email || "",
        phone: (form.getValues() as FacilityBookingValues).phone || user.phone || "",
        dateRange: (form.getValues() as FacilityBookingValues).dateRange,
        numberOfAttendees: (form.getValues() as FacilityBookingValues).numberOfAttendees || 1,
        services: (form.getValues() as FacilityBookingValues).services || { lunch: 'none', refreshment: 'none' },
        notes: (form.getValues() as FacilityBookingValues).notes || "",
      });
    }
  }, [user, form, isDormitoryBooking]);


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
      if (item && typeof item.pricePerDay === 'number') {
        totalCost = numberOfDays * item.pricePerDay;

        const bookingDataToSave: Omit<Booking, 'id' | 'bookedAt'> & { bookedAt: any, startDate: any, endDate: any } = {
          bookingCategory: 'dormitory',
          items: itemsToBook.map(i => ({ id: i.id, name: i.name, itemType: i.itemType, capacity: i.capacity, pricePerDay: i.pricePerDay })),
          guestName: dormData.fullName,
          guestEmployer: dormData.employer,
          startDate: Timestamp.fromDate(startDateObject),
          endDate: Timestamp.fromDate(endDateObject),
          totalCost,
          paymentStatus: 'pending_transfer' as const,
          approvalStatus: 'approved' as const, // Dorms auto-approved, payment pending
          bookedAt: serverTimestamp(),
          ...(user?.id && { userId: user.id }),
        };
        
        try {
          const docRef = await addDoc(collection(db, "bookings"), bookingDataToSave);
          const queryParams = new URLSearchParams({
              bookingId: docRef.id,
              amount: totalCost.toString(),
              itemName: itemNameForConfirmation,
              category: 'dormitory',
          });
          router.push(`/submit-payment-proof?${queryParams.toString()}`);
        } catch (error) {
            console.error("Error saving dormitory booking:", error);
            toast({ variant: "destructive", title: t('error'), description: t('errorSavingBooking') });
            setIsSubmitting(false);
            return;
        }
      } else {
        toast({ title: t('error'), description: t('couldNotCalculatePrice'), variant: "destructive" });
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

      totalCost = rentalCostComponent + lunchCostComponent + refreshmentCostComponent;

      const serviceDetails: BookingServiceDetails = {};
      if (facilityData.services.lunch && facilityData.services.lunch !== 'none') {
        serviceDetails.lunch = facilityData.services.lunch;
      }
      if (facilityData.services.refreshment && facilityData.services.refreshment !== 'none') {
        serviceDetails.refreshment = facilityData.services.refreshment;
      }

      const bookingDataToSave: Omit<Booking, 'id' | 'bookedAt' | 'customAgreementTerms' | 'agreementStatus' | 'agreementSentAt' | 'agreementSignedAt' | 'transactionProofDetails'> & { bookedAt: any, startDate: any, endDate: any } = {
        bookingCategory,
        items: itemsToBook.map(item => ({ id: item.id, name: item.name, itemType: item.itemType, rentalCost: item.rentalCost })), 
        companyName: facilityData.companyName,
        contactPerson: facilityData.contactPerson,
        email: facilityData.email,
        phone: facilityData.phone,
        startDate: Timestamp.fromDate(startDateObject),
        endDate: Timestamp.fromDate(endDateObject),
        numberOfAttendees: facilityData.numberOfAttendees,
        ...(Object.keys(serviceDetails).length > 0 && { serviceDetails }),
        notes: facilityData.notes,
        totalCost,
        paymentStatus: 'pending' as const, // Facility bookings need admin approval first
        approvalStatus: 'pending' as const,
        bookedAt: serverTimestamp(),
        userId: user?.id,
        companyId: user?.companyId,
      };

      try {
        const docRef = await addDoc(collection(db, "bookings"), bookingDataToSave);
        toast({ title: t('bookingRequestSubmitted'), description: t('facilityBookingPendingApproval') });
        
        const queryParams = new URLSearchParams({
            status: 'booking_pending_approval', // New status for confirmation page
            bookingId: docRef.id,
            itemName: itemNameForConfirmation,
            amount: totalCost.toString(),
            category: 'facility'
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

  const itemsDisplayList = itemsToBook.map(item => item.name).join(', ');

  return (
    <Card className="w-full max-w-2xl mx-auto my-8 shadow-xl">
      <CardHeader>
        <CardTitle className="text-2xl text-center text-primary">
          {isDormitoryBooking ? t('dormitoryBooking') : t('facilityBooking')}
        </CardTitle>
        <p className="text-sm text-muted-foreground text-center flex items-center justify-center">
            <List className="mr-2 h-4 w-4"/> {t('bookingForItems')}: {itemsDisplayList}
        </p>
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
                <FormField control={form.control} name="idCardScan" render={({ field: { onChange, value, ...rest } }) => ( <FormItem><FormLabel>{t('idCardScan')} ({t('optional')})</FormLabel><FormControl><Input type="file" onChange={(e) => onChange(e.target.files?.[0])} {...rest} /></FormControl><FormDescription>{t('uploadScannedIdDescription')}</FormDescription><FormMessage /></FormItem> )} />
                <FormField control={form.control} name="employer" render={({ field }) => ( <FormItem><FormLabel>{t('employer')}</FormLabel><FormControl><Input placeholder={t('enterEmployer')} {...field} /></FormControl><FormMessage /></FormItem> )} />
              </>
            )}

            {!isDormitoryBooking && (
              <>
                <h3 className="text-lg font-medium pt-4 border-t">{t('companyInformation')}</h3>
                <FormField control={form.control} name="companyName" render={({ field }) => ( <FormItem><FormLabel>{t('companyName')}</FormLabel><FormControl><Input placeholder={t('enterCompanyName')} {...field} /></FormControl><FormMessage /></FormItem> )} />
                <FormField control={form.control} name="contactPerson" render={({ field }) => ( <FormItem><FormLabel>{t('contactPerson')}</FormLabel><FormControl><Input placeholder={t('enterContactPerson')} {...field} /></FormControl><FormMessage /></FormItem> )} />
                <FormField control={form.control} name="email" render={({ field }) => ( <FormItem><FormLabel>{t('email')}</FormLabel><FormControl><Input type="email" placeholder={t('enterEmail')} {...field} /></FormControl><FormMessage /></FormItem> )} />
                <FormField control={form.control} name="phone" render={({ field }) => ( <FormItem><FormLabel>{t('phone')}</FormLabel><FormControl><Input type="tel" placeholder={t('enterPhone')} {...field} /></FormControl><FormMessage /></FormItem> )} />
                <FormField control={form.control} name="numberOfAttendees" render={({ field }) => ( <FormItem><FormLabel>{t('numberOfAttendees')}</FormLabel><FormControl><Input type="number" min="1" placeholder={t('exampleAttendees')} {...field} /></FormControl><FormMessage /></FormItem> )} />
                <FormField control={form.control} name="services.lunch" render={({ field }) => ( <FormItem className="space-y-3"><FormLabel>{t('lunchLevel')}</FormLabel><FormControl><RadioGroup onValueChange={field.onChange} defaultValue={field.value} className="flex flex-col space-y-1"><FormItem className="flex items-center space-x-3 space-y-0"><FormControl><RadioGroupItem value="none" /></FormControl><FormLabel className="font-normal">{t('serviceLevelNone')}</FormLabel></FormItem><FormItem className="flex items-center space-x-3 space-y-0"><FormControl><RadioGroupItem value="level1" /></FormControl><FormLabel className="font-normal">{t('serviceLevel1')} {t('lunch')}</FormLabel></FormItem><FormItem className="flex items-center space-x-3 space-y-0"><FormControl><RadioGroupItem value="level2" /></FormControl><FormLabel className="font-normal">{t('serviceLevel2')} {t('lunch')}</FormLabel></FormItem></RadioGroup></FormControl><FormMessage /></FormItem> )} />
                <FormField control={form.control} name="services.refreshment" render={({ field }) => ( <FormItem className="space-y-3"><FormLabel>{t('refreshmentLevel')}</FormLabel><FormControl><RadioGroup onValueChange={field.onChange} defaultValue={field.value} className="flex flex-col space-y-1"><FormItem className="flex items-center space-x-3 space-y-0"><FormControl><RadioGroupItem value="none" /></FormControl><FormLabel className="font-normal">{t('serviceLevelNone')}</FormLabel></FormItem><FormItem className="flex items-center space-x-3 space-y-0"><FormControl><RadioGroupItem value="level1" /></FormControl><FormLabel className="font-normal">{t('serviceLevel1')} {t('refreshment')}</FormLabel></FormItem><FormItem className="flex items-center space-x-3 space-y-0"><FormControl><RadioGroupItem value="level2" /></FormControl><FormLabel className="font-normal">{t('serviceLevel2')} {t('refreshment')}</FormLabel></FormItem></RadioGroup></FormControl><FormMessage /></FormItem> )} />
                <FormField control={form.control} name="notes" render={({ field }) => ( <FormItem><FormLabel>{t('notesOrSpecialRequests')}</FormLabel><FormControl><Textarea placeholder={t('anySpecialRequests')} {...field} /></FormControl><FormMessage /></FormItem> )} />
              </>
            )}
            <Button type="submit" className="w-full" disabled={authLoading || isSubmitting || isCheckingAvailability || !!availabilityError}>
                {(authLoading || isSubmitting || isCheckingAvailability) && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                {isDormitoryBooking ? t('submitAndProceedToPaymentInfo') : t('submitBookingRequest')}
            </Button>
          </form>
        </Form>
      </CardContent>
    </Card>
  );
}

