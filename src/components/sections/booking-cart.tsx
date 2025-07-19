
"use client";

import React, { useState, useEffect, useCallback } from 'react';
import { useForm, useFieldArray } from 'react-hook-form';
import * as z from 'zod';
import { zodResolver } from '@hookform/resolvers/zod';
import { eachDayOfInterval, format } from 'date-fns';
import { useLanguage } from '@/hooks/use-language';
import { useToast } from '@/hooks/use-toast';
import { useAuth } from '@/hooks/use-auth';
import type { Booking, Hall, BookingItem, PricingSettings, BookingServiceDetails } from '@/types';
import { db } from '@/lib/firebase';
import { collection, doc, getDoc, addDoc, Timestamp, serverTimestamp } from 'firebase/firestore';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Form, FormControl, FormDescription, FormField, FormItem, FormLabel, FormMessage } from '@/components/ui/form';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { Loader2, DollarSign, Trash2, Calendar, ShoppingCart } from 'lucide-react';
import { Checkbox } from '@/components/ui/checkbox';
import { PRICING_SETTINGS_DOC_PATH, DEFAULT_PRICING_SETTINGS } from '@/constants';
import { useRouter } from 'next/navigation';
import { notifyAdminsOfNewBooking } from '@/actions/notification-actions';
import type { DateRange } from 'react-day-picker';
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group';
import { Label } from '@/components/ui/label';

const scheduleItemSchema = z.object({
  date: z.date(),
  itemIds: z.array(z.string()),
});

const bookingCartSchema = z.object({
  schedule: z.array(scheduleItemSchema).min(1, 'Please configure your schedule.'),
  numberOfAttendees: z.coerce.number().min(1, 'At least one attendee is required.'),
  notes: z.string().optional(),
  services: z.object({
    lunch: z.enum(['none', 'level1', 'level2']).default('none'),
    refreshment: z.enum(['none', 'level1', 'level2']).default('none'),
  }),
});

type BookingCartValues = z.infer<typeof bookingCartSchema>;

interface BookingCartProps {
    selectedItems: Hall[];
    dateRange: DateRange;
    allFacilities: Hall[];
}

export function BookingCart({ selectedItems, dateRange, allFacilities }: BookingCartProps) {
  const { t } = useLanguage();
  const { toast } = useToast();
  const { user } = useAuth();
  const router = useRouter();
  
  const [pricingSettings, setPricingSettings] = useState<PricingSettings>(DEFAULT_PRICING_SETTINGS);
  const [isLoading, setIsLoading] = useState(true);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [totalCost, setTotalCost] = useState(0);

  const form = useForm<BookingCartValues>({
    resolver: zodResolver(bookingCartSchema),
    defaultValues: {
      schedule: [],
      numberOfAttendees: 1,
      notes: '',
      services: { lunch: 'none', refreshment: 'none' },
    },
  });

  const { fields, replace } = useFieldArray({
    control: form.control,
    name: "schedule",
  });

  const watchedSchedule = form.watch('schedule');
  const watchedAttendees = form.watch('numberOfAttendees');
  const watchedServices = form.watch('services');

  // Fetch pricing settings on mount
  useEffect(() => {
    const fetchPricing = async () => {
        setIsLoading(true);
        try {
            const pricingDoc = await getDoc(doc(db, PRICING_SETTINGS_DOC_PATH));
            if (pricingDoc.exists()) {
                setPricingSettings(pricingDoc.data() as PricingSettings);
            }
        } catch (e) {
            toast({ variant: 'destructive', title: t('error'), description: t('errorFetchingPricingSettings') });
        } finally {
            setIsLoading(false);
        }
    };
    fetchPricing();
  }, [t, toast]);
  
  // Populate schedule based on date range
  useEffect(() => {
    if (dateRange?.from && dateRange?.to) {
      const days = eachDayOfInterval({ start: dateRange.from, end: dateRange.to });
      const newSchedule = days.map(day => ({
        date: day,
        itemIds: [],
      }));
      replace(newSchedule);
    }
  }, [dateRange?.from, dateRange?.to, replace]);

  // Recalculate total cost when schedule or services change
  useEffect(() => {
    let cost = 0;
    const numberOfDays = watchedSchedule.length;
    
    // Calculate rental cost
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

    // Calculate services cost
    const { lunch, refreshment } = watchedServices;
    if (lunch !== 'none') {
        const lunchPrice = lunch === 'level1' ? pricingSettings.lunchServiceCostLevel1 : pricingSettings.lunchServiceCostLevel2;
        cost += lunchPrice * watchedAttendees * numberOfDays;
    }
    if (refreshment !== 'none') {
        const refreshmentPrice = refreshment === 'level1' ? pricingSettings.refreshmentServiceCostLevel1 : pricingSettings.refreshmentServiceCostLevel2;
        cost += refreshmentPrice * watchedAttendees * numberOfDays;
    }

    setTotalCost(cost);
  }, [watchedSchedule, watchedAttendees, watchedServices, allFacilities, pricingSettings]);
  
  async function onSubmit(data: BookingCartValues) {
    if (!user || !user.companyId || !dateRange.from || !dateRange.to) {
      toast({ variant: 'destructive', title: t('error'), description: 'Authentication error or missing data.' });
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

    if (itemsForBooking.length === 0) {
        toast({ variant: 'destructive', title: t('error'), description: t('pleaseAssignAtLeastOneFacility') });
        setIsSubmitting(false);
        return;
    }
    
    const serviceDetails: BookingServiceDetails = {};
    if (data.services.lunch !== 'none') serviceDetails.lunch = data.services.lunch;
    if (data.services.refreshment !== 'none') serviceDetails.refreshment = data.services.refreshment;

    const bookingDataToSave: Omit<Booking, 'id' | 'bookedAt'> & { bookedAt: any, startDate: any, endDate: any } = {
        bookingCategory: 'facility',
        items: itemsForBooking,
        companyName: user.companyName,
        contactPerson: user.name,
        email: user.email,
        phone: user.phone,
        startDate: Timestamp.fromDate(dateRange.from),
        endDate: Timestamp.fromDate(dateRange.to),
        numberOfAttendees: data.numberOfAttendees,
        notes: data.notes,
        totalCost,
        paymentStatus: 'pending' as const,
        approvalStatus: 'pending' as const,
        agreementStatus: 'pending_admin_action' as const,
        bookedAt: serverTimestamp(),
        userId: user.id,
        companyId: user.companyId,
        schedule: data.schedule.map(s => ({...s, date: format(s.date, 'yyyy-MM-dd')})) as any[],
        serviceDetails,
    };
    
    try {
        const docRef = await addDoc(collection(db, "bookings"), bookingDataToSave);
        const createdBookingForNotification: Booking = {
            ...(bookingDataToSave as any),
            id: docRef.id,
            bookedAt: new Date().toISOString(),
            startDate: Timestamp.fromDate(dateRange.from).toDate().toISOString(),
            endDate: Timestamp.fromDate(dateRange.to).toDate().toISOString(),
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
    <Card className="max-w-4xl mx-auto mt-8 shadow-2xl border-primary">
      <CardHeader>
        <CardTitle className="text-2xl flex items-center gap-2"><ShoppingCart />{t('finalizeSchedule')}</CardTitle>
        <CardDescription>{t('finalizeScheduleDesc')}</CardDescription>
      </CardHeader>
      <CardContent>
        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-8">
            <div className="space-y-4">
              <h3 className="font-semibold text-lg">{t('dailySchedule')}</h3>
              {fields.map((field, index) => (
                <Card key={field.id} className="p-4 bg-muted/50">
                  <FormLabel className="font-semibold">{format(field.date, 'EEEE, MMM d')}</FormLabel>
                  <div className="mt-2 grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-2">
                    {selectedItems.map((facility) => (
                       <FormField
                          key={facility.id}
                          control={form.control}
                          name={`schedule.${index}.itemIds`}
                          render={({ field: checkboxField }) => (
                            <FormItem className="flex flex-row items-center space-x-2 space-y-0 p-2 border rounded-md bg-background">
                              <FormControl>
                                <Checkbox
                                  checked={checkboxField.value?.includes(facility.id)}
                                  onCheckedChange={(checked) => {
                                    return checked
                                      ? checkboxField.onChange([...(checkboxField.value || []), facility.id])
                                      : checkboxField.onChange(checkboxField.value?.filter((value) => value !== facility.id));
                                  }}
                                />
                              </FormControl>
                              <FormLabel className="text-sm font-normal">{facility.name}</FormLabel>
                            </FormItem>
                          )}
                        />
                    ))}
                  </div>
                  {selectedItems.length === 0 && <p className="text-xs text-muted-foreground mt-2">{t('noFacilitiesSelectedForDay')}</p>}
                </Card>
              ))}
            </div>
            
            <h3 className="font-semibold text-lg pt-4 border-t">{t('additionalDetails')}</h3>
            <div className="grid md:grid-cols-2 gap-6">
                <FormField control={form.control} name="numberOfAttendees" render={({ field }) => (<FormItem><FormLabel>{t('numberOfAttendees')}</FormLabel><FormControl><Input type="number" {...field} /></FormControl><FormMessage /></FormItem>)} />
            </div>

            <div className="grid md:grid-cols-2 gap-6">
                <FormField control={form.control} name="services.lunch" render={({ field }) => (
                    <FormItem className="space-y-3"><FormLabel>{t('lunchService')}</FormLabel>
                      <RadioGroup onValueChange={field.onChange} value={field.value} className="flex flex-col space-y-1">
                        <FormItem className="flex items-center space-x-3 space-y-0"><FormControl><RadioGroupItem value="none" /></FormControl><Label className="font-normal">{t('serviceLevelNone')}</Label></FormItem>
                        <FormItem className="flex items-center space-x-3 space-y-0"><FormControl><RadioGroupItem value="level1" /></FormControl><Label className="font-normal">{t('serviceLevel1')}</Label></FormItem>
                        <FormItem className="flex items-center space-x-3 space-y-0"><FormControl><RadioGroupItem value="level2" /></FormControl><Label className="font-normal">{t('serviceLevel2')}</Label></FormItem>
                      </RadioGroup><FormMessage />
                    </FormItem>
                )}/>
                <FormField control={form.control} name="services.refreshment" render={({ field }) => (
                    <FormItem className="space-y-3"><FormLabel>{t('refreshmentService')}</FormLabel>
                      <RadioGroup onValueChange={field.onChange} value={field.value} className="flex flex-col space-y-1">
                        <FormItem className="flex items-center space-x-3 space-y-0"><FormControl><RadioGroupItem value="none" /></FormControl><Label className="font-normal">{t('serviceLevelNone')}</Label></FormItem>
                        <FormItem className="flex items-center space-x-3 space-y-0"><FormControl><RadioGroupItem value="level1" /></FormControl><Label className="font-normal">{t('serviceLevel1')}</Label></FormItem>
                        <FormItem className="flex items-center space-x-3 space-y-0"><FormControl><RadioGroupItem value="level2" /></FormControl><Label className="font-normal">{t('serviceLevel2')}</Label></FormItem>
                      </RadioGroup><FormMessage />
                    </FormItem>
                )}/>
            </div>

            <FormField control={form.control} name="notes" render={({ field }) => (<FormItem><FormLabel>{t('notes')}</FormLabel><FormControl><Textarea {...field} /></FormControl><FormMessage /></FormItem>)} />
            
            <Card className="bg-primary/10">
                <CardHeader><CardTitle className="flex items-center gap-2 text-primary"><DollarSign />{t('estimatedTotalCost')}</CardTitle></CardHeader>
                <CardContent><p className="text-3xl font-bold text-primary">{totalCost.toLocaleString()} {t('currencySymbol')}</p></CardContent>
            </Card>

            <Button type="submit" className="w-full text-lg py-6" disabled={isSubmitting}>
              {isSubmitting && <Loader2 className="animate-spin mr-2" />}
              {t('confirmAndSubmitBooking')}
            </Button>
          </form>
        </Form>
      </CardContent>
    </Card>
  );
}
