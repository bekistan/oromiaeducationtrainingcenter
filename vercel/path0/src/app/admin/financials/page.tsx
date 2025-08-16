
"use client";

import React, { useEffect, useMemo } from 'react';
import { zodResolver } from "@hookform/resolvers/zod";
import { useForm } from "react-hook-form";
import * as z from "zod";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage, FormDescription as ShadFormDescription } from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { useLanguage } from "@/hooks/use-language";
import { useAuth } from "@/hooks/use-auth";
import { useToast } from "@/hooks/use-toast";
import { DollarSign, Save, Loader2, AlertCircle, Info, ShieldAlert } from "lucide-react";
import { db } from '@/lib/firebase';
import { doc, getDoc, setDoc, serverTimestamp, Timestamp } from 'firebase/firestore';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import type { PricingSettings } from '@/types';
import { PRICING_SETTINGS_DOC_PATH, DEFAULT_PRICING_SETTINGS } from '@/constants';
import { useRouter } from 'next/navigation';

const PRICING_SETTINGS_QUERY_KEY = "pricingSettings";

const pricingSettingsSchema = z.object({
  defaultDormitoryPricePerDay: z.coerce.number().min(0, "Price must be non-negative."),
  defaultHallRentalCostPerDay: z.coerce.number().min(0, "Cost must be non-negative."),
  defaultSectionRentalCostPerDay: z.coerce.number().min(0, "Cost must be non-negative."),
  lunchServiceCostLevel1: z.coerce.number().min(0, "Cost must be non-negative."),
  lunchServiceCostLevel2: z.coerce.number().min(0, "Cost must be non-negative."),
  refreshmentServiceCostLevel1: z.coerce.number().min(0, "Cost must be non-negative."),
  refreshmentServiceCostLevel2: z.coerce.number().min(0, "Cost must be non-negative."),
  defaultLedProjectorCostPerDay: z.coerce.number().min(0, "Cost must be non-negative."),
});

type PricingSettingsFormValues = z.infer<typeof pricingSettingsSchema>;

const fetchPricingSettings = async (): Promise<PricingSettings> => {
  const docRef = doc(db, PRICING_SETTINGS_DOC_PATH);
  const docSnap = await getDoc(docRef);
  if (docSnap.exists()) {
    const data = docSnap.data();
    return {
      id: docSnap.id,
      ...DEFAULT_PRICING_SETTINGS, 
      ...data, 
    } as PricingSettings;
  }
  return { ...DEFAULT_PRICING_SETTINGS, id: 'pricing_settings' }; 
};

const updatePricingSettings = async (details: PricingSettingsFormValues): Promise<void> => {
  const docRef = doc(db, PRICING_SETTINGS_DOC_PATH);
  await setDoc(docRef, { ...details, lastUpdated: serverTimestamp() }, { merge: true });
};

export default function FinancialManagementPage() {
  const { t } = useLanguage();
  const { user, loading: authLoading } = useAuth();
  const { toast } = useToast();
  const router = useRouter();
  const queryClient = useQueryClient();

  const canAccessPage = useMemo(() => {
    if (!user) return false;
    if (user.role === 'superadmin') return true;
    if (user.role === 'admin' && !user.buildingAssignment) return true;
    return false;
  }, [user]);

  const { data: currentPricingSettings, isLoading: isLoadingSettings, error: settingsError } = useQuery<PricingSettings, Error>({
    queryKey: [PRICING_SETTINGS_QUERY_KEY],
    queryFn: fetchPricingSettings,
    enabled: !authLoading && canAccessPage, 
  });

  const form = useForm<PricingSettingsFormValues>({
    resolver: zodResolver(pricingSettingsSchema),
    defaultValues: DEFAULT_PRICING_SETTINGS, 
  });

  useEffect(() => {
    if (currentPricingSettings) {
      form.reset({
        defaultDormitoryPricePerDay: currentPricingSettings.defaultDormitoryPricePerDay,
        defaultHallRentalCostPerDay: currentPricingSettings.defaultHallRentalCostPerDay,
        defaultSectionRentalCostPerDay: currentPricingSettings.defaultSectionRentalCostPerDay,
        lunchServiceCostLevel1: currentPricingSettings.lunchServiceCostLevel1,
        lunchServiceCostLevel2: currentPricingSettings.lunchServiceCostLevel2,
        refreshmentServiceCostLevel1: currentPricingSettings.refreshmentServiceCostLevel1,
        refreshmentServiceCostLevel2: currentPricingSettings.refreshmentServiceCostLevel2,
        defaultLedProjectorCostPerDay: currentPricingSettings.defaultLedProjectorCostPerDay,
      });
    }
  }, [currentPricingSettings, form]);

  const mutation = useMutation<void, Error, PricingSettingsFormValues>({
    mutationFn: updatePricingSettings,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: [PRICING_SETTINGS_QUERY_KEY] });
      toast({ title: t('success'), description: t('pricingSettingsUpdatedSuccess') });
    },
    onError: (error) => {
      toast({ variant: "destructive", title: t('error'), description: error.message || t('errorUpdatingPricingSettings') });
    },
  });

  async function onSubmit(values: PricingSettingsFormValues) {
    mutation.mutate(values);
  }

  if (authLoading || (isLoadingSettings && canAccessPage)) {
    return <div className="flex justify-center items-center h-40"><Loader2 className="h-8 w-8 animate-spin text-primary" /></div>;
  }

  if (!canAccessPage) {
    return (
         <Card className="w-full max-w-md mx-auto my-8">
            <CardHeader>
                <CardTitle className="text-destructive flex items-center"><ShieldAlert className="mr-2"/>{t('accessDenied')}</CardTitle>
            </CardHeader>
            <CardContent>
                <p>{t('financialsAccessRestricted')}</p>
                 <Button onClick={() => router.push('/admin/dashboard')} className="mt-4">{t('backToDashboard')}</Button>
            </CardContent>
         </Card>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-3xl font-bold text-foreground">{t('financialManagementTitle')}</h1>
      </div>
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center">
            <DollarSign className="mr-2 h-6 w-6 text-primary" />
            {t('manageGlobalPricingSettings')}
          </CardTitle>
          <CardDescription>{t('globalPricingSettingsDescription')}</CardDescription>
        </CardHeader>
        <CardContent>
          {settingsError && (
            <div className="mb-4 p-4 bg-destructive/10 text-destructive border border-destructive rounded-md flex items-center">
              <AlertCircle className="mr-2 h-5 w-5" />
              {t('errorFetchingPricingSettings')}: {settingsError.message}
            </div>
          )}
           <div className="mb-6 p-3 bg-blue-50 border border-blue-200 rounded-md text-blue-700 text-sm">
              <div className="flex items-start">
                <Info className="h-5 w-5 mr-2 mt-0.5 flex-shrink-0" />
                <div>
                  <p className="font-semibold">{t('pricingHierarchyInfoTitle')}</p>
                  <p>{t('pricingHierarchyInfoDesc')}</p>
                </div>
              </div>
          </div>
          <Form {...form}>
            <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-8">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <FormField control={form.control} name="defaultDormitoryPricePerDay" render={({ field }) => ( <FormItem><FormLabel>{t('defaultDormitoryPricePerDay')}</FormLabel><FormControl><Input type="number" placeholder="e.g., 500" {...field} /></FormControl><ShadFormDescription>{t('currencySymbol')}</ShadFormDescription><FormMessage /></FormItem> )} />
                <FormField control={form.control} name="defaultHallRentalCostPerDay" render={({ field }) => ( <FormItem><FormLabel>{t('defaultHallRentalCostPerDay')}</FormLabel><FormControl><Input type="number" placeholder="e.g., 3000" {...field} /></FormControl><ShadFormDescription>{t('currencySymbol')}</ShadFormDescription><FormMessage /></FormItem> )} />
                <FormField control={form.control} name="defaultSectionRentalCostPerDay" render={({ field }) => ( <FormItem><FormLabel>{t('defaultSectionRentalCostPerDay')}</FormLabel><FormControl><Input type="number" placeholder="e.g., 1500" {...field} /></FormControl><ShadFormDescription>{t('currencySymbol')}</ShadFormDescription><FormMessage /></FormItem> )} />
                <FormField control={form.control} name="defaultLedProjectorCostPerDay" render={({ field }) => ( <FormItem><FormLabel>{t('defaultLedProjectorCostPerDay')}</FormLabel><FormControl><Input type="number" placeholder="e.g., 500" {...field} /></FormControl><ShadFormDescription>{t('currencySymbol')} ({t('forSections')})</FormDescription><FormMessage /></FormItem> )} />
              </div>
              
              <>
                <h3 className="text-lg font-medium pt-4 border-t">{t('cateringServiceCosts')} ({t('perPersonPerDay')})</h3>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  <FormField control={form.control} name="lunchServiceCostLevel1" render={({ field }) => ( <FormItem><FormLabel>{t('lunchServiceCostLevel1')}</FormLabel><FormControl><Input type="number" placeholder="e.g., 150" {...field} /></FormControl><ShadFormDescription>{t('currencySymbol')}</ShadFormDescription><FormMessage /></FormItem> )} />
                  <FormField control={form.control} name="lunchServiceCostLevel2" render={({ field }) => ( <FormItem><FormLabel>{t('lunchServiceCostLevel2')}</FormLabel><FormControl><Input type="number" placeholder="e.g., 250" {...field} /></FormControl><ShadFormDescription>{t('currencySymbol')}</ShadFormDescription><FormMessage /></FormItem> )} />
                  <FormField control={form.control} name="refreshmentServiceCostLevel1" render={({ field }) => ( <FormItem><FormLabel>{t('refreshmentServiceCostLevel1')}</FormLabel><FormControl><Input type="number" placeholder="e.g., 50" {...field} /></FormControl><ShadFormDescription>{t('currencySymbol')}</ShadFormDescription><FormMessage /></FormItem> )} />
                  <FormField control={form.control} name="refreshmentServiceCostLevel2" render={({ field }) => ( <FormItem><FormLabel>{t('refreshmentServiceCostLevel2')}</FormLabel><FormControl><Input type="number" placeholder="e.g., 100" {...field} /></FormControl><ShadFormDescription>{t('currencySymbol')}</ShadFormDescription><FormMessage /></FormItem> )} />
                </div>
              </>
              
              {currentPricingSettings?.lastUpdated && (
                <p className="text-xs text-muted-foreground pt-4">
                    {t('lastUpdated')}: {
                        currentPricingSettings.lastUpdated instanceof Timestamp 
                        ? currentPricingSettings.lastUpdated.toDate().toLocaleString() 
                        : (typeof currentPricingSettings.lastUpdated === 'string' 
                            ? new Date(currentPricingSettings.lastUpdated).toLocaleString() 
                            : String(currentPricingSettings.lastUpdated))
                    }
                </p>
              )}
              <Button type="submit" disabled={mutation.isPending || isLoadingSettings}>
                {mutation.isPending ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Save className="mr-2 h-4 w-4" />}
                {t('savePricingSettings')}
              </Button>
            </form>
          </Form>
        </CardContent>
      </Card>
    </div>
  );
}
