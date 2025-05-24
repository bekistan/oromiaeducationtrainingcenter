
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
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { DatePickerWithRange } from '@/components/ui/date-picker-with-range';
import type { DateRange } from 'react-day-picker';
import type { BookingServiceDetails, BookingItem } from '@/types';
import { AlertCircle, List } from 'lucide-react';

interface BookingFormProps {
  bookingCategory: 'dormitory' | 'facility'; // 'facility' for halls/sections
  itemsToBook: BookingItem[]; 
}

const dormitoryBookingSchema = z.object({
  fullName: z.string().min(2, { message: "Full name must be at least 2 characters." }),
  idCardScan: z.custom<File>((v) => v instanceof File, { message: "ID card scan is required." }).optional(),
  employer: z.string().min(2, { message: "Employer name must be at least 2 characters." }),
  dateRange: z.custom<DateRange | undefined>((val) => val !== undefined && val.from !== undefined, {
    message: "Date range is required.",
  }),
});

const facilityBookingSchema = z.object({
  // Company info might come from auth user, but can be overridden or filled if not present
  companyName: z.string().min(2, { message: "Company name must be at least 2 characters." }),
  contactPerson: z.string().min(2, { message: "Contact person must be at least 2 characters." }),
  email: z.string().email({ message: "Invalid email address." }),
  phone: z.string().min(7, { message: "Phone number seems too short." }),
  dateRange: z.custom<DateRange | undefined>((val) => val !== undefined && val.from !== undefined, {
    message: "Date range is required.",
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
  const isDormitoryBooking = bookingCategory === 'dormitory';

  const formSchema = isDormitoryBooking ? dormitoryBookingSchema : facilityBookingSchema;
  
  const defaultFacilityValues = {
    companyName: user?.role === 'company_representative' ? user.companyName || "" : "",
    contactPerson: user?.role === 'company_representative' ? user.name || "" : "",
    email: user?.email || "",
    phone: "", // No phone in mock user, so empty
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
      form.reset({ // Pre-fill company details if user changes or logs in
        companyName: user.companyName || "",
        contactPerson: user.name || "",
        email: user.email || "",
        phone: (form.getValues() as FacilityBookingValues).phone || "", // Keep phone if already entered
        dateRange: (form.getValues() as FacilityBookingValues).dateRange,
        numberOfAttendees: (form.getValues() as FacilityBookingValues).numberOfAttendees || 1,
        services: (form.getValues() as FacilityBookingValues).services || { lunch: 'none', refreshment: 'none' },
        notes: (form.getValues() as FacilityBookingValues).notes || "",
      });
    }
  }, [user, form, isDormitoryBooking]);


  function onSubmit(data: DormitoryBookingValues | FacilityBookingValues) {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const submissionData: any = { 
      bookingCategory, 
      items: itemsToBook,
      approvalStatus: 'pending', // Default approval status
      ...data 
    };

    if (!isDormitoryBooking && user && user.role === 'company_representative') {
        submissionData.userId = user.id;
        submissionData.companyId = user.companyId;
        // Ensure form values override auth user values if different and valid
        const facilityValues = data as FacilityBookingValues;
        submissionData.companyName = facilityValues.companyName;
        submissionData.contactPerson = facilityValues.contactPerson;
        submissionData.email = facilityValues.email;
        submissionData.phone = facilityValues.phone;


      const serviceDetails: BookingServiceDetails = {};
      if (facilityValues.services.lunch && facilityValues.services.lunch !== 'none') {
        serviceDetails.lunch = facilityValues.services.lunch;
      }
      if (facilityValues.services.refreshment && facilityValues.services.refreshment !== 'none') {
        serviceDetails.refreshment = facilityValues.services.refreshment;
      }
      
      delete submissionData.services; 
      if (Object.keys(serviceDetails).length > 0) {
          submissionData.serviceDetails = serviceDetails;
      }
    } else if (isDormitoryBooking && user && user.role === 'individual') {
        submissionData.userId = user.id;
        // For dormitory, guestName comes from fullName field
        submissionData.guestName = (data as DormitoryBookingValues).fullName;
        submissionData.guestEmployer = (data as DormitoryBookingValues).employer;
    } else if (isDormitoryBooking) {
        submissionData.guestName = (data as DormitoryBookingValues).fullName;
        submissionData.guestEmployer = (data as DormitoryBookingValues).employer;
    }
    
    console.log("Processed submission data:", submissionData);
    alert(t('bookingSubmittedPlaceholder'));
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
          <p>{t('mustBeLoggedInAsCompany')}</p> {/* Add to JSON */}
          {/* Optionally, add a login button here */}
        </CardContent>
      </Card>
    );
  }

  const itemsDisplayList = itemsToBook.map(item => item.name).join(', ');

  return (
    <Card className="w-full max-w-2xl mx-auto my-8 shadow-xl">
      <CardHeader>
        <CardTitle className="text-2xl text-center text-primary">
          {isDormitoryBooking ? t('dormitoryBooking') : t('facilityBooking')} {/* Add 'facilityBooking' to JSON */}
        </CardTitle>
        <p className="text-sm text-muted-foreground text-center flex items-center justify-center">
            <List className="mr-2 h-4 w-4"/> {t('bookingForItems')}: {itemsDisplayList} {/* Add 'bookingForItems' to JSON */}
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
                  <FormMessage />
                </FormItem>
              )}
            />

            {isDormitoryBooking && (
              <>
                <h3 className="text-lg font-medium pt-4 border-t">{t('personalInformation')}</h3>
                <FormField
                  control={form.control}
                  name="fullName" // This will be guestName for dormitory
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
                  name="employer" // This will be guestEmployer
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
                {authLoading ? t('loading') : t('submitBooking')}
            </Button>
          </form>
        </Form>
      </CardContent>
    </Card>
  );
}

