
"use client";

import React from 'react';
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
import type { BookingServiceDetails, BookingItem } from '@/types';
import { AlertCircle, List } from 'lucide-react';
import { differenceInCalendarDays } from 'date-fns';
import { useRouter } from 'next/navigation'; // Added for redirection

interface BookingFormProps {
  bookingCategory: 'dormitory' | 'facility'; // 'facility' for halls/sections
  itemsToBook: BookingItem[]; 
}

const dormitoryBookingSchema = z.object({
  fullName: z.string().min(2, { message: "Full name must be at least 2 characters." }),
  idCardScan: z.custom<File>((v) => v instanceof File, { message: "ID card scan is required." }).optional(),
  employer: z.string().min(2, { message: "Employer name must be at least 2 characters." }),
  dateRange: z.custom<DateRange | undefined>((val) => val !== undefined && val.from !== undefined && val.to !== undefined, { // Ensure 'to' is also defined for range
    message: "Date range with start and end dates is required.",
  }),
});

const facilityBookingSchema = z.object({
  companyName: z.string().min(2, { message: "Company name must be at least 2 characters." }),
  contactPerson: z.string().min(2, { message: "Contact person must be at least 2 characters." }),
  email: z.string().email({ message: "Invalid email address." }),
  phone: z.string().min(7, { message: "Phone number seems too short." }),
  dateRange: z.custom<DateRange | undefined>((val) => val !== undefined && val.from !== undefined && val.to !== undefined, { // Ensure 'to' is also defined
    message: "Date range with start and end dates is required.",
  }),
  numberOfAttendees: z.coerce.number().min(1, { message: "At least 1 attendee is required." }),
  services: z.object({
    lunch: z.enum(['none', 'level1', 'level2'], { errorMap: () => ({ message: "Please select a lunch option." }) }).default('none'),
    refreshment: z.enum(['none', 'level1', 'level2'], { errorMap: () => ({ message: "Please select a refreshment option." }) }).default('none'),
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

  const formSchema = isDormitoryBooking ? dormitoryBookingSchema : facilityBookingSchema;
  
  const defaultFacilityValues = {
    companyName: user?.role === 'company_representative' ? user.companyName || "" : "",
    contactPerson: user?.role === 'company_representative' ? user.name || "" : "",
    email: user?.email || "",
    phone: "",
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
  
  React.useEffect(() => {
    if (!isDormitoryBooking && user && user.role === 'company_representative') {
      form.reset({
        companyName: user.companyName || "",
        contactPerson: user.name || "",
        email: user.email || "",
        phone: (form.getValues() as FacilityBookingValues).phone || "",
        dateRange: (form.getValues() as FacilityBookingValues).dateRange,
        numberOfAttendees: (form.getValues() as FacilityBookingValues).numberOfAttendees || 1,
        services: (form.getValues() as FacilityBookingValues).services || { lunch: 'none', refreshment: 'none' },
        notes: (form.getValues() as FacilityBookingValues).notes || "",
      });
    }
  }, [user, form, isDormitoryBooking]);


  function onSubmit(data: DormitoryBookingValues | FacilityBookingValues) {
    const bookingId = `bk_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`; // Mock booking ID
    let totalCost = 0;
    const itemName = itemsToBook.map(item => item.name).join(', ');

    if (isDormitoryBooking) {
      const dormData = data as DormitoryBookingValues;
      const item = itemsToBook[0]; // Assuming single dormitory booking for now
      if (item && item.pricePerDay && dormData.dateRange?.from && dormData.dateRange.to) {
        const numberOfDays = differenceInCalendarDays(dormData.dateRange.to, dormData.dateRange.from) + 1;
        totalCost = numberOfDays * item.pricePerDay;
      } else {
        toast({ title: t('error'), description: t('couldNotCalculatePrice'), variant: "destructive" }); // Add 'couldNotCalculatePrice' to JSON
        return;
      }
      
      const queryParams = new URLSearchParams({
        bookingId,
        amount: totalCost.toString(),
        itemName: item.name,
        bookingCategory: 'dormitory',
      });
      router.push(`/payment/chapa?${queryParams.toString()}`);

    } else { // Facility Booking
      const facilityData = data as FacilityBookingValues;
      // Placeholder for facility cost calculation - rentalCost + service costs
      // For now, just using a mock total or rentalCost if available
      totalCost = itemsToBook.reduce((acc, curr) => acc + (curr.rentalCost || 0), 0); 
      // Add service costs (mock)
      if (facilityData.services.lunch !== 'none') totalCost += (facilityData.numberOfAttendees * 50); // Mock price
      if (facilityData.services.refreshment !== 'none') totalCost += (facilityData.numberOfAttendees * 25); // Mock price


      // For facility bookings, usually admin approval comes first, then payment.
      // Simulating submission for now.
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const submissionData: any = { 
        id: bookingId,
        bookingCategory, 
        items: itemsToBook,
        approvalStatus: 'pending', 
        paymentStatus: 'pending', // Payment will be handled later for facilities
        totalCost,
        bookedAt: new Date().toISOString(),
        startDate: facilityData.dateRange?.from?.toISOString(),
        endDate: facilityData.dateRange?.to?.toISOString(),
        ...facilityData 
      };
      
      if (user && user.role === 'company_representative') {
        submissionData.userId = user.id;
        submissionData.companyId = user.companyId;
      }
      
      const serviceDetails: BookingServiceDetails = {};
      if (facilityData.services.lunch && facilityData.services.lunch !== 'none') {
        serviceDetails.lunch = facilityData.services.lunch;
      }
      if (facilityData.services.refreshment && facilityData.services.refreshment !== 'none') {
        serviceDetails.refreshment = facilityData.services.refreshment;
      }
      delete submissionData.services; 
      if (Object.keys(serviceDetails).length > 0) {
          submissionData.serviceDetails = serviceDetails;
      }
      
      console.log("Processed facility submission data:", submissionData);
      // In a real app, you'd save this to a database.
      // Then redirect to a company dashboard or booking status page.
      toast({ title: t('bookingRequestSubmitted'), description: t('facilityBookingPendingApproval') }); // Add to JSON
      router.push('/'); // Or a dedicated company dashboard page
    }
  }
  
  if (authLoading) {
    return <p>{t('loading')}...</p>;
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
            <FormField
              control={form.control}
              name="dateRange"
              render={({ field }) => (
                <FormItem className="flex flex-col">
                  <FormLabel>{t('selectDates')}</FormLabel>
                  <DatePickerWithRange 
                    date={field.value}
                    // eslint-disable-next-line @typescript-eslint/no-explicit-any
                    onDateChange={field.onChange as (date: DateRange | undefined) => void}
                  />
                  <FormDescription>{t('selectBothStartAndEndDates')}</FormDescription> {/* Add to JSON */}
                  <FormMessage />
                </FormItem>
              )}
            />

            {isDormitoryBooking && (
              <>
                <h3 className="text-lg font-medium pt-4 border-t">{t('personalInformation')}</h3>
                <FormField
                  control={form.control}
                  name="fullName"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>{t('fullName')}</FormLabel>
                      <FormControl><Input placeholder={t('enterFullName')} {...field} /></FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                <FormField
                  control={form.control}
                  name="idCardScan"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>{t('idCardScan')}</FormLabel>
                      <FormControl><Input type="file" onChange={(e) => field.onChange(e.target.files?.[0])} /></FormControl>
                      <FormDescription>{t('uploadScannedIdDescription')}</FormDescription>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                <FormField
                  control={form.control}
                  name="employer"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>{t('employer')}</FormLabel>
                      <FormControl><Input placeholder={t('enterEmployer')} {...field} /></FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </>
            )}

            {!isDormitoryBooking && (
              <>
                <h3 className="text-lg font-medium pt-4 border-t">{t('companyInformation')}</h3>
                <FormField
                  control={form.control}
                  name="companyName"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>{t('companyName')}</FormLabel>
                      <FormControl><Input placeholder={t('enterCompanyName')} {...field} /></FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                <FormField
                  control={form.control}
                  name="contactPerson"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>{t('contactPerson')}</FormLabel>
                      <FormControl><Input placeholder={t('enterContactPerson')} {...field} /></FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                 <FormField
                  control={form.control}
                  name="email"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>{t('email')}</FormLabel>
                      <FormControl><Input type="email" placeholder={t('enterEmail')} {...field} /></FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                 <FormField
                  control={form.control}
                  name="phone"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>{t('phone')}</FormLabel>
                      <FormControl><Input type="tel" placeholder={t('enterPhone')} {...field} /></FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                <FormField
                  control={form.control}
                  name="numberOfAttendees"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>{t('numberOfAttendees')}</FormLabel>
                      <FormControl><Input type="number" min="1" placeholder="e.g., 25" {...field} /></FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                
                <FormField
                  control={form.control}
                  // eslint-disable-next-line @typescript-eslint/ban-ts-comment
                  // @ts-ignore 
                  name="services.lunch" 
                  render={({ field }) => (
                    <FormItem className="space-y-3">
                      <FormLabel>{t('lunchLevel')}</FormLabel>
                      <FormControl>
                        <RadioGroup
                          onValueChange={field.onChange}
                          defaultValue={field.value}
                          className="flex flex-col space-y-1"
                        >
                          <FormItem className="flex items-center space-x-3 space-y-0">
                            <FormControl><RadioGroupItem value="none" /></FormControl>
                            <FormLabel className="font-normal">{t('serviceLevelNone')}</FormLabel>
                          </FormItem>
                          <FormItem className="flex items-center space-x-3 space-y-0">
                            <FormControl><RadioGroupItem value="level1" /></FormControl>
                            <FormLabel className="font-normal">{t('serviceLevel1')} {t('lunch')}</FormLabel>
                          </FormItem>
                          <FormItem className="flex items-center space-x-3 space-y-0">
                            <FormControl><RadioGroupItem value="level2" /></FormControl>
                            <FormLabel className="font-normal">{t('serviceLevel2')} {t('lunch')}</FormLabel>
                          </FormItem>
                        </RadioGroup>
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <FormField
                  control={form.control}
                  // eslint-disable-next-line @typescript-eslint/ban-ts-comment
                  // @ts-ignore
                  name="services.refreshment"
                  render={({ field }) => (
                    <FormItem className="space-y-3">
                      <FormLabel>{t('refreshmentLevel')}</FormLabel>
                      <FormControl>
                        <RadioGroup
                          onValueChange={field.onChange}
                          defaultValue={field.value}
                          className="flex flex-col space-y-1"
                        >
                          <FormItem className="flex items-center space-x-3 space-y-0">
                            <FormControl><RadioGroupItem value="none" /></FormControl>
                            <FormLabel className="font-normal">{t('serviceLevelNone')}</FormLabel>
                          </FormItem>
                          <FormItem className="flex items-center space-x-3 space-y-0">
                            <FormControl><RadioGroupItem value="level1" /></FormControl>
                            <FormLabel className="font-normal">{t('serviceLevel1')} {t('refreshment')}</FormLabel>
                          </FormItem>
                          <FormItem className="flex items-center space-x-3 space-y-0">
                            <FormControl><RadioGroupItem value="level2" /></FormControl>
                            <FormLabel className="font-normal">{t('serviceLevel2')} {t('refreshment')}</FormLabel>
                          </FormItem>
                        </RadioGroup>
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                
                 <FormField
                  control={form.control}
                  name="notes"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>{t('notesOrSpecialRequests')}</FormLabel>
                      <FormControl><Textarea placeholder={t('anySpecialRequests')} {...field} /></FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </>
            )}
            <Button type="submit" className="w-full" disabled={authLoading}>
                {authLoading ? t('loading') : (isDormitoryBooking ? t('proceedToPayment') : t('submitBooking'))} {/* Add 'proceedToPayment' to JSON */}
            </Button>
          </form>
        </Form>
      </CardContent>
    </Card>
  );
}
