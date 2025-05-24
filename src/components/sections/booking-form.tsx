
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
// Removed Checkbox as it's replaced by RadioGroup for services
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { useLanguage } from "@/hooks/use-language";
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { DatePickerWithRange } from '@/components/ui/date-picker-with-range';
import type { DateRange } from 'react-day-picker';
import type { BookingServiceDetails } from '@/types';

interface BookingFormProps {
  type: 'dormitory' | 'hall';
  itemId: string; // ID of the dormitory or hall
  itemName: string; // Name or room number
}

const dormitoryBookingSchema = z.object({
  fullName: z.string().min(2, { message: "Full name must be at least 2 characters." }),
  idCardScan: z.custom<File>((v) => v instanceof File, { message: "ID card scan is required." }).optional(),
  employer: z.string().min(2, { message: "Employer name must be at least 2 characters." }),
  dateRange: z.custom<DateRange | undefined>((val) => val !== undefined && val.from !== undefined, {
    message: "Date range is required.",
  }),
});

const hallBookingSchema = z.object({
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
type HallBookingValues = z.infer<typeof hallBookingSchema>;

export function BookingForm({ type, itemId, itemName }: BookingFormProps) {
  const { t } = useLanguage();
  const isDormitory = type === 'dormitory';

  const formSchema = isDormitory ? dormitoryBookingSchema : hallBookingSchema;
  
  const form = useForm<DormitoryBookingValues | HallBookingValues>({
    resolver: zodResolver(formSchema),
    defaultValues: isDormitory 
      ? { fullName: "", employer: "", dateRange: undefined } 
      : { 
          companyName: "", 
          contactPerson: "", 
          email: "", 
          phone: "", 
          dateRange: undefined, 
          numberOfAttendees: 1, 
          services: { lunch: 'none', refreshment: 'none' }, 
          notes: "" 
        },
  });

  function onSubmit(data: DormitoryBookingValues | HallBookingValues) {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const submissionData: any = { bookingType: type, itemId, itemName, ...data };

    if (!isDormitory) {
      const hallValues = data as HallBookingValues;
      const serviceDetails: BookingServiceDetails = {};
      
      if (hallValues.services.lunch && hallValues.services.lunch !== 'none') {
        serviceDetails.lunch = hallValues.services.lunch;
      }
      if (hallValues.services.refreshment && hallValues.services.refreshment !== 'none') {
        serviceDetails.refreshment = hallValues.services.refreshment;
      }
      
      delete submissionData.services; // Remove the form's internal services structure
      if (Object.keys(serviceDetails).length > 0) {
          submissionData.serviceDetails = serviceDetails;
      }
    }
    
    console.log("Processed submission data:", submissionData);
    alert(t('bookingSubmittedPlaceholder'));
  }

  return (
    <Card className="w-full max-w-2xl mx-auto my-8 shadow-xl">
      <CardHeader>
        <CardTitle className="text-2xl text-center text-primary">
          {isDormitory ? t('dormitoryBooking') : t('hallBooking')} - {itemName}
        </CardTitle>
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

            {isDormitory && (
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

            {!isDormitory && (
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
                  name="services.lunch"
                  render={({ field }) => (
                    <FormItem className="space-y-3">
                      <FormLabel>{t('lunchLevel')}</FormLabel> {/* Add to JSON: "Lunch Options" */}
                      <FormControl>
                        <RadioGroup
                          onValueChange={field.onChange}
                          defaultValue={field.value}
                          className="flex flex-col space-y-1"
                        >
                          <FormItem className="flex items-center space-x-3 space-y-0">
                            <FormControl><RadioGroupItem value="none" /></FormControl>
                            <FormLabel className="font-normal">{t('serviceLevelNone')}</FormLabel> {/* Add to JSON: "None" */}
                          </FormItem>
                          <FormItem className="flex items-center space-x-3 space-y-0">
                            <FormControl><RadioGroupItem value="level1" /></FormControl>
                            <FormLabel className="font-normal">{t('serviceLevel1')} {t('lunch')}</FormLabel> {/* Add to JSON: "1st Level" */}
                          </FormItem>
                          <FormItem className="flex items-center space-x-3 space-y-0">
                            <FormControl><RadioGroupItem value="level2" /></FormControl>
                            <FormLabel className="font-normal">{t('serviceLevel2')} {t('lunch')}</FormLabel> {/* Add to JSON: "2nd Level" */}
                          </FormItem>
                        </RadioGroup>
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <FormField
                  control={form.control}
                  name="services.refreshment"
                  render={({ field }) => (
                    <FormItem className="space-y-3">
                      <FormLabel>{t('refreshmentLevel')}</FormLabel> {/* Add to JSON: "Refreshment Options" */}
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
            <Button type="submit" className="w-full">{t('submitBooking')}</Button>
          </form>
        </Form>
      </CardContent>
    </Card>
  );
}
