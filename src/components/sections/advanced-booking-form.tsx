
"use client";

import React, { useState, useEffect, useCallback } from 'react';
import { useForm, useFieldArray } from 'react-hook-form';
import * as z from 'zod';
import { zodResolver } from '@hookform/resolvers/zod';
import { eachDayOfInterval, format } from 'date-fns';
import { useLanguage } from '@/hooks/use-language';
import { useToast } from '@/hooks/use-toast';
import { useAuth } from '@/hooks/use-auth';
import type { Booking, Hall, BookingItem, PricingSettings } from '@/types';
import { db } from '@/lib/firebase';
import { collection, doc, getDocs, getDoc, addDoc, Timestamp, serverTimestamp, query, where } from 'firebase/firestore';
import { DatePickerWithRange } from '@/components/ui/date-picker-with-range';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Form, FormControl, FormDescription, FormField, FormItem, FormLabel, FormMessage } from '@/components/ui/form';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Checkbox } from '@/components/ui/checkbox';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { Loader2, PlusCircle, Trash2, Calendar, AlertCircle, Building, DollarSign } from 'lucide-react';
import { PRICING_SETTINGS_DOC_PATH, DEFAULT_PRICING_SETTINGS } from '@/constants';
import { useRouter } from 'next/navigation';
import { notifyAdminsOfNewBooking } from '@/actions/notification-actions';

const scheduleItemSchema = z.object({
  id: z.string(),
  date: z.date(),
  itemIds: z.array(z.string()).min(1, 'Please select at least one facility for this day.'),
});

const advancedBookingSchema = z.object({
  companyName: z.string().min(2, 'Company name is required.'),
  contactPerson: z.string().min(2, 'Contact person is required.'),
  email: z.string().email('A valid email is required.'),
  phone: z.string().min(7, 'A valid phone number is required.'),
  dateRange: z.custom<import('react-day-picker').DateRange>(
    (val) => val && val.from && val.to,
    'A valid date range is required.'
  ),
  schedule: z.array(scheduleItemSchema).min(1, 'Please add at least one day to the schedule.'),
  numberOfAttendees: z.coerce.number().min(1, 'At least one attendee is required.'),
  notes: z.string().optional(),
});

type AdvancedBookingValues = z.infer<typeof advancedBookingSchema>;

export function AdvancedBookingForm() {
  const { t } = useLanguage();
  const { toast } = useToast();
  const { user } = useAuth();
  const router = useRouter();
  
  const [allFacilities, setAllFacilities] = useState<Hall[]>([]);
  const [availableFacilitiesByDate, setAvailableFacilitiesByDate] = useState<Record<string, Hall[]>>({});
  const [pricingSettings, setPricingSettings] = useState<PricingSettings>(DEFAULT_PRICING_SETTINGS);
  const [isLoading, setIsLoading] = useState(true);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [totalCost, setTotalCost] = useState(0);

  const form = useForm<AdvancedBookingValues>({
    resolver: zodResolver(advancedBookingSchema),
    defaultValues: {
      companyName: user?.companyName || '',
      contactPerson: user?.name || '',
      email: user?.email || '',
      phone: user?.phone || '',
      dateRange: undefined,
      schedule: [],
      numberOfAttendees: 1,
      notes: '',
    },
  });

  const { fields, append, remove, update } = useFieldArray({
    control: form.control,
    name: "schedule",
  });
  
  const watchedDateRange = form.watch('dateRange');
  const watchedSchedule = form.watch('schedule');
  const watchedAttendees = form.watch('numberOfAttendees');

  // Fetch facilities and pricing settings on mount
  useEffect(() => {
    const fetchData = async () => {
      try {
        const facilitiesQuery = await getDocs(collection(db, 'halls'));
        setAllFacilities(facilitiesQuery.docs.map(d => ({ id: d.id, ...d.data() } as Hall)));

        const pricingDoc = await getDoc(doc(db, PRICING_SETTINGS_DOC_PATH));
        if (pricingDoc.exists()) {
          setPricingSettings(pricingDoc.data() as PricingSettings);
        }
      } catch (e) {
        toast({ variant: 'destructive', title: t('error'), description: t('errorFetchingInitialData') });
      } finally {
        setIsLoading(false);
      }
    };
    fetchData();
  }, [t, toast]);
  
  // Update schedule days when date range changes
  useEffect(() => {
    const currentSchedule = form.getValues('schedule');
    if (watchedDateRange?.from && watchedDateRange?.to) {
      const days = eachDayOfInterval({ start: watchedDateRange.from, end: watchedDateRange.to });
      const newSchedule = days.map(day => {
        const existingDay = currentSchedule.find(s => s.date.getTime() === day.getTime());
        return existingDay || { id: day.toISOString(), date: day, itemIds: [] };
      });
      form.setValue('schedule', newSchedule, { shouldValidate: true });
    } else {
        form.setValue('schedule', [], { shouldValidate: true });
    }
  }, [watchedDateRange?.from, watchedDateRange?.to, form]);
  
  // Calculate availability for each day in schedule
  useEffect(() => {
    const calculateAvailability = async () => {
      const availability: Record<string, Hall[]> = {};
      const bookingsQuery = query(collection(db, 'bookings'), where('bookingCategory', '==', 'facility'));
      const snapshot = await getDocs(bookingsQuery);
      const allBookings = snapshot.docs.map(d => d.data() as Booking);

      for (const day of fields) {
        const dateStr = format(day.date, 'yyyy-MM-dd');
        availability[dateStr] = allFacilities.filter(facility => {
          const isBooked = allBookings.some(booking =>
            booking.items.some(item => item.id === facility.id && 
            new Date(booking.startDate as string) <= day.date && 
            new Date(booking.endDate as string) >= day.date
          ));
          return !isBooked;
        });
      }
      setAvailableFacilitiesByDate(availability);
    };
    if (fields.length > 0) {
      calculateAvailability();
    }
  }, [fields, allFacilities]);
  
  // Recalculate total cost
  useEffect(() => {
    let cost = 0;
    watchedSchedule.forEach(day => {
      day.itemIds.forEach(id => {
        const facility = allFacilities.find(f => f.id === id);
        if (facility) {
          cost += facility.rentalCost ?? (facility.itemType === 'hall' 
            ? pricingSettings.defaultHallRentalCostPerDay 
            : pricingSettings.defaultSectionRentalCostPerDay);
        }
      });
    });
    setTotalCost(cost);
  }, [watchedSchedule, allFacilities, pricingSettings]);
  
  async function onSubmit(data: AdvancedBookingValues) {
    if (!user || !user.companyId) {
      toast({ variant: 'destructive', title: t('error'), description: 'Authentication error' });
      return;
    }
    setIsSubmitting(true);
    
    const itemsForBooking: BookingItem[] = [];
    data.schedule.forEach(day => {
      day.itemIds.forEach(id => {
        const facility = allFacilities.find(f => f.id === id);
        if (facility) {
          itemsForBooking.push({
            id: facility.id,
            name: facility.name,
            itemType: facility.itemType,
            date: format(day.date, 'yyyy-MM-dd'),
            rentalCost: facility.rentalCost ?? (facility.itemType === 'hall' ? pricingSettings.defaultHallRentalCostPerDay : pricingSettings.defaultSectionRentalCostPerDay),
          });
        }
      });
    });

    const bookingDataToSave: Omit<Booking, 'id' | 'bookedAt'> & { bookedAt: any, startDate: any, endDate: any } = {
        bookingCategory: 'facility',
        items: itemsForBooking,
        companyName: data.companyName,
        contactPerson: data.contactPerson,
        email: data.email,
        phone: data.phone,
        startDate: Timestamp.fromDate(data.dateRange!.from!),
        endDate: Timestamp.fromDate(data.dateRange!.to!),
        numberOfAttendees: data.numberOfAttendees,
        notes: data.notes,
        totalCost,
        paymentStatus: 'pending' as const,
        approvalStatus: 'pending' as const,
        agreementStatus: 'pending_admin_action' as const,
        bookedAt: serverTimestamp(),
        userId: user.id,
        companyId: user.companyId,
        schedule: data.schedule.map(s => ({...s, date: format(s.date, 'yyyy-MM-dd')})) as unknown as BookingItem[],
    };
    
    try {
        const docRef = await addDoc(collection(db, "bookings"), bookingDataToSave);
        const createdBookingForNotification: Booking = {
            ...(bookingDataToSave as any),
            id: docRef.id,
            bookedAt: new Date().toISOString(),
            startDate: Timestamp.fromDate(data.dateRange.from!).toDate().toISOString(),
            endDate: Timestamp.fromDate(data.dateRange.to!).toDate().toISOString(),
        };

        notifyAdminsOfNewBooking(createdBookingForNotification);

        toast({ title: t('bookingRequestSubmitted'), description: t('facilityBookingPendingApproval') });
        router.push(`/booking-confirmation?status=booking_pending_approval&bookingId=${docRef.id}&itemName=${t('multipleFacilities')}&amount=${totalCost}&category=facility`);
    } catch(err) {
        console.error(err);
        toast({ variant: "destructive", title: t('error'), description: t('errorSavingBooking') });
    } finally {
        setIsSubmitting(false);
    }
  }

  if(isLoading) return <div className="flex justify-center"><Loader2 className="h-8 w-8 animate-spin" /></div>;

  return (
    <Card className="max-w-4xl mx-auto">
      <CardHeader>
        <CardTitle className="text-2xl flex items-center gap-2"><Calendar />{t('bookBySchedule')}</CardTitle>
        <CardDescription>{t('bookByScheduleDesc')}</CardDescription>
      </CardHeader>
      <CardContent>
        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-8">
            <FormField control={form.control} name="dateRange" render={({ field }) => (
              <FormItem><FormLabel>{t('eventDateRange')}</FormLabel><DatePickerWithRange date={field.value} onDateChange={field.onChange} /><FormMessage /></FormItem>
            )}/>
            
            <div className="space-y-4">
              <h3 className="font-semibold">{t('schedule')}</h3>
              {fields.map((field, index) => {
                const dateStr = format(field.date, 'yyyy-MM-dd');
                const available = availableFacilitiesByDate[dateStr] || [];
                return (
                  <Card key={field.id} className="p-4">
                    <CardHeader className="p-0 pb-2 flex-row justify-between items-center">
                        <CardTitle className="text-lg">{format(field.date, 'EEEE, MMM d')}</CardTitle>
                    </CardHeader>
                    <CardContent className="p-0">
                      <FormField
                        control={form.control}
                        name={`schedule.${index}.itemIds`}
                        render={({ field: itemField }) => (
                          <FormItem>
                            <div className="grid grid-cols-2 md:grid-cols-3 gap-2">
                              {available.map((facility) => (
                                <FormField
                                  key={facility.id}
                                  control={form.control}
                                  name={`schedule.${index}.itemIds`}
                                  render={({ field }) => (
                                    <FormItem className="flex flex-row items-center space-x-3 space-y-0 p-2 border rounded-md">
                                      <FormControl>
                                        <Checkbox
                                          checked={field.value?.includes(facility.id)}
                                          onCheckedChange={(checked) => {
                                            return checked
                                              ? field.onChange([...(field.value || []), facility.id])
                                              : field.onChange(field.value?.filter((value) => value !== facility.id));
                                          }}
                                        />
                                      </FormControl>
                                      <FormLabel className="text-sm font-normal">{facility.name}</FormLabel>
                                    </FormItem>
                                  )}
                                />
                              ))}
                            </div>
                            {available.length === 0 && <p className="text-sm text-muted-foreground">{t('noFacilitiesAvailableOnThisDay')}</p>}
                            <FormMessage />
                          </FormItem>
                        )}
                      />
                    </CardContent>
                  </Card>
                );
              })}
            </div>
            
            <div className="grid md:grid-cols-2 gap-4">
                <FormField control={form.control} name="companyName" render={({ field }) => (<FormItem><FormLabel>{t('companyName')}</FormLabel><FormControl><Input {...field} /></FormControl><FormMessage /></FormItem>)} />
                <FormField control={form.control} name="contactPerson" render={({ field }) => (<FormItem><FormLabel>{t('contactPerson')}</FormLabel><FormControl><Input {...field} /></FormControl><FormMessage /></FormItem>)} />
                <FormField control={form.control} name="email" render={({ field }) => (<FormItem><FormLabel>{t('email')}</FormLabel><FormControl><Input type="email" {...field} /></FormControl><FormMessage /></FormItem>)} />
                <FormField control={form.control} name="phone" render={({ field }) => (<FormItem><FormLabel>{t('phone')}</FormLabel><FormControl><Input type="tel" {...field} /></FormControl><FormMessage /></FormItem>)} />
                <FormField control={form.control} name="numberOfAttendees" render={({ field }) => (<FormItem><FormLabel>{t('numberOfAttendees')}</FormLabel><FormControl><Input type="number" {...field} /></FormControl><FormMessage /></FormItem>)} />
            </div>

            <FormField control={form.control} name="notes" render={({ field }) => (<FormItem><FormLabel>{t('notes')}</FormLabel><FormControl><Textarea {...field} /></FormControl><FormMessage /></FormItem>)} />
            
            <Card>
                <CardHeader><CardTitle className="flex items-center gap-2"><DollarSign />{t('totalCost')}</CardTitle></CardHeader>
                <CardContent><p className="text-2xl font-bold">{totalCost.toLocaleString()} {t('currencySymbol')}</p></CardContent>
            </Card>

            <Button type="submit" className="w-full" disabled={isSubmitting}>
              {isSubmitting && <Loader2 className="animate-spin mr-2" />}
              {t('submitBooking')}
            </Button>
          </form>
        </Form>
      </CardContent>
    </Card>
  );
}
