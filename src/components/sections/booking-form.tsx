"use client";

import React, { useState } from 'react';
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
import { Checkbox } from "@/components/ui/checkbox";
import { useLanguage } from "@/hooks/use-language";
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { DatePickerWithRange } from '@/components/ui/date-picker-with-range'; // Assuming this exists
import type { DateRange } from 'react-day-picker';

interface BookingFormProps {
  type: 'dormitory' | 'hall';
  itemId: string; // ID of the dormitory or hall
  itemName: string; // Name or room number
}

const dormitoryBookingSchema = z.object({
  fullName: z.string().min(2, { message: "Full name must be at least 2 characters." }),
  idCardScan: z.custom<File>((v) => v instanceof File, { message: "ID card scan is required." }).optional(), // Making optional for now as file handling is complex
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
    lunch: z.boolean().default(false),
    refreshment: z.boolean().default(false),
  }).optional(),
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
      : { companyName: "", contactPerson: "", email: "", phone: "", dateRange: undefined, numberOfAttendees: 1, services: { lunch: false, refreshment: false}, notes: "" },
  });

  function onSubmit(values: DormitoryBookingValues | HallBookingValues) {
    console.log({ bookingType: type, itemId, itemName, values });
    // Here you would typically send the data to your backend / Firebase
    alert(t('bookingSubmittedPlaceholder')); // Add to JSON
    // Potentially redirect to a confirmation page or payment page
    // e.g. router.push('/payment/chapa?bookingId=...')
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
                    onDateChange={field.onChange}
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
                      <FormControl><Input placeholder={t('enterFullName')} {...field} /></FormControl> {/* Add to JSON */}
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
                      <FormDescription>{t('uploadScannedIdDescription')}</FormDescription> {/* Add to JSON */}
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
                      <FormControl><Input placeholder={t('enterEmployer')} {...field} /></FormControl> {/* Add to JSON */}
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
                      <FormControl><Input placeholder={t('enterCompanyName')} {...field} /></FormControl> {/* Add to JSON */}
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
                      <FormControl><Input placeholder={t('enterContactPerson')} {...field} /></FormControl> {/* Add to JSON */}
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
                      <FormControl><Input type="email" placeholder={t('enterEmail')} {...field} /></FormControl> {/* Add to JSON */}
                      <FormMessage />
                    </FormItem>
                  )}
                />
                 <FormField
                  control={form.control}
                  name="phone"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>{t('phone')}</FormLabel> {/* Add to JSON */}
                      <FormControl><Input type="tel" placeholder={t('enterPhone')} {...field} /></FormControl> {/* Add to JSON */}
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
                <FormItem>
                  <FormLabel>{t('additionalServices')}</FormLabel>
                  <div className="space-y-2">
                    <FormField
                      control={form.control}
                      name="services.lunch"
                      render={({ field }) => (
                        <FormItem className="flex flex-row items-start space-x-3 space-y-0">
                          <FormControl>
                            <Checkbox checked={field.value} onCheckedChange={field.onChange} />
                          </FormControl>
                          <FormLabel className="font-normal">{t('lunchService')}</FormLabel>
                        </FormItem>
                      )}
                    />
                    <FormField
                      control={form.control}
                      name="services.refreshment"
                      render={({ field }) => (
                        <FormItem className="flex flex-row items-start space-x-3 space-y-0">
                          <FormControl>
                            <Checkbox checked={field.value} onCheckedChange={field.onChange} />
                          </FormControl>
                          <FormLabel className="font-normal">{t('refreshmentService')}</FormLabel>
                        </FormItem>
                      )}
                    />
                  </div>
                </FormItem>
                 <FormField
                  control={form.control}
                  name="notes"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>{t('notesOrSpecialRequests')}</FormLabel> {/* Add to JSON */}
                      <FormControl><Textarea placeholder={t('anySpecialRequests')} {...field} /></FormControl> {/* Add to JSON */}
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

