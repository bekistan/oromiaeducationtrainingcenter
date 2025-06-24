
"use client";

import React, { useEffect, useMemo } from 'react';
import { zodResolver } from "@hookform/resolvers/zod";
import { useForm } from "react-hook-form";
import * as z from "zod";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Form, FormControl, FormDescription, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Checkbox } from "@/components/ui/checkbox";
import { useLanguage } from "@/hooks/use-language";
import { useAuth } from "@/hooks/use-auth";
import { useToast } from "@/hooks/use-toast";
import { Settings, Save, Loader2, AlertCircle, Megaphone, ShieldAlert } from "lucide-react";
import { db } from '@/lib/firebase';
import { doc, getDoc, setDoc, serverTimestamp, Timestamp } from 'firebase/firestore';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import type { BankAccountDetails, SiteSettings } from '@/types';
import { BANK_DETAILS_DOC_PATH, SITE_SETTINGS_DOC_PATH, DEFAULT_SITE_SETTINGS } from '@/constants';
import { useRouter } from 'next/navigation';

const BANK_DETAILS_QUERY_KEY = "bankAccountDetails";
const SITE_SETTINGS_QUERY_KEY = "siteSettings";

const bankDetailsSchema = z.object({
  bankName: z.string().min(1, { message: "Bank name is required." }),
  accountName: z.string().min(1, { message: "Account name is required." }),
  accountNumber: z.string().min(1, { message: "Account number is required." }),
});
type BankDetailsFormValues = z.infer<typeof bankDetailsSchema>;

const siteSettingsSchema = z.object({
  siteAnnouncementMessage: z.string().max(500, "Announcement cannot exceed 500 characters.").optional(),
  isAnnouncementVisible: z.boolean().default(false),
});
type SiteSettingsFormValues = z.infer<typeof siteSettingsSchema>;


const fetchBankDetails = async (): Promise<BankAccountDetails | null> => {
  const docRef = doc(db, BANK_DETAILS_DOC_PATH);
  const docSnap = await getDoc(docRef);
  if (docSnap.exists()) {
    const data = docSnap.data();
    return {
      id: docSnap.id,
      bankName: data.bankName || "",
      accountName: data.accountName || "",
      accountNumber: data.accountNumber || "",
      lastUpdated: data.lastUpdated,
    } as BankAccountDetails;
  }
  return null;
};

const updateBankDetails = async (details: BankDetailsFormValues): Promise<void> => {
  const docRef = doc(db, BANK_DETAILS_DOC_PATH);
  await setDoc(docRef, { ...details, lastUpdated: serverTimestamp() }, { merge: true });
};

const fetchSiteSettings = async (): Promise<SiteSettings> => {
  const docRef = doc(db, SITE_SETTINGS_DOC_PATH);
  const docSnap = await getDoc(docRef);
  if (docSnap.exists()) {
    const data = docSnap.data();
    return {
      id: docSnap.id,
      siteAnnouncementMessage: data.siteAnnouncementMessage || DEFAULT_SITE_SETTINGS.siteAnnouncementMessage,
      isAnnouncementVisible: data.isAnnouncementVisible === undefined ? DEFAULT_SITE_SETTINGS.isAnnouncementVisible : data.isAnnouncementVisible,
      lastUpdated: data.lastUpdated,
    } as SiteSettings;
  }
  return { ...DEFAULT_SITE_SETTINGS, id: 'general_settings' };
};

const updateSiteSettings = async (settings: SiteSettingsFormValues): Promise<void> => {
  const docRef = doc(db, SITE_SETTINGS_DOC_PATH);
  await setDoc(docRef, { ...settings, lastUpdated: serverTimestamp() }, { merge: true });
};


export default function AdminSettingsPage() {
  const { t } = useLanguage();
  const { user, loading: authLoading } = useAuth();
  const { toast } = useToast();
  const router = useRouter();
  const queryClient = useQueryClient();

  const canAccessSettings = useMemo(() => {
    if (!user) return false;
    return user.role === 'superadmin' || (user.role === 'admin' && !user.buildingAssignment);
  }, [user]);


  const { data: currentBankDetails, isLoading: isLoadingBankDetails, error: bankDetailsError } = useQuery<BankAccountDetails | null, Error>({
    queryKey: [BANK_DETAILS_QUERY_KEY],
    queryFn: fetchBankDetails,
    enabled: !authLoading && canAccessSettings,
  });

  const { data: currentSiteSettings, isLoading: isLoadingSiteSettings, error: siteSettingsError } = useQuery<SiteSettings, Error>({
    queryKey: [SITE_SETTINGS_QUERY_KEY],
    queryFn: fetchSiteSettings,
    enabled: !authLoading && canAccessSettings,
  });

  const bankDetailsForm = useForm<BankDetailsFormValues>({
    resolver: zodResolver(bankDetailsSchema),
    defaultValues: { bankName: "", accountName: "", accountNumber: "" },
  });

  const siteSettingsForm = useForm<SiteSettingsFormValues>({
    resolver: zodResolver(siteSettingsSchema),
    defaultValues: DEFAULT_SITE_SETTINGS,
  });

  useEffect(() => {
    if (currentBankDetails) {
      bankDetailsForm.reset({
        bankName: currentBankDetails.bankName,
        accountName: currentBankDetails.accountName,
        accountNumber: currentBankDetails.accountNumber,
      });
    }
  }, [currentBankDetails, bankDetailsForm]);

  useEffect(() => {
    if (currentSiteSettings) {
      siteSettingsForm.reset({
        siteAnnouncementMessage: currentSiteSettings.siteAnnouncementMessage || "",
        isAnnouncementVisible: currentSiteSettings.isAnnouncementVisible || false,
      });
    }
  }, [currentSiteSettings, siteSettingsForm]);

  const bankDetailsMutation = useMutation<void, Error, BankDetailsFormValues>({
    mutationFn: updateBankDetails,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: [BANK_DETAILS_QUERY_KEY] });
      toast({ title: t('success'), description: t('bankDetailsUpdatedSuccess') });
    },
    onError: (error) => {
      toast({ variant: "destructive", title: t('error'), description: error.message || t('errorUpdatingBankDetails') });
    },
  });

  const siteSettingsMutation = useMutation<void, Error, SiteSettingsFormValues>({
    mutationFn: updateSiteSettings,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: [SITE_SETTINGS_QUERY_KEY] });
      toast({ title: t('success'), description: t('siteSettingsUpdatedSuccess') });
    },
    onError: (error) => {
      toast({ variant: "destructive", title: t('error'), description: error.message || t('errorUpdatingSiteSettings') });
    },
  });

  async function onBankDetailsSubmit(values: BankDetailsFormValues) {
    bankDetailsMutation.mutate(values);
  }

  async function onSiteSettingsSubmit(values: SiteSettingsFormValues) {
    siteSettingsMutation.mutate(values);
  }

  if (authLoading) {
    return <div className="flex justify-center items-center h-40"><Loader2 className="h-8 w-8 animate-spin text-primary" /></div>;
  }
  
  if (!canAccessSettings) {
    return (
      <Card className="w-full max-w-md mx-auto my-8">
        <CardHeader>
          <CardTitle className="text-destructive flex items-center"><ShieldAlert className="mr-2"/>{t('accessDenied')}</CardTitle>
        </CardHeader>
        <CardContent>
          <p>{t('buildingAdminAccessSettingsDenied')}</p>
          <Button onClick={() => router.push('/admin/dashboard')} className="mt-4">{t('backToDashboard')}</Button>
        </CardContent>
      </Card>
    );
  }
  
  if ((isLoadingBankDetails && !bankDetailsError) || (isLoadingSiteSettings && !siteSettingsError)) {
     return <div className="flex justify-center items-center h-40"><Loader2 className="h-8 w-8 animate-spin text-primary" /></div>;
  }


  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-3xl font-bold text-foreground">{t('manageSettings')}</h1>
      </div>
      
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center">
            <Settings className="mr-2 h-6 w-6 text-primary" />
            {t('bankAccountConfiguration')}
          </CardTitle>
          <CardDescription>{t('bankDetailsDescriptionAdmin')}</CardDescription>
        </CardHeader>
        <CardContent>
          {bankDetailsError && (
            <div className="mb-4 p-4 bg-destructive/10 text-destructive border border-destructive rounded-md flex items-center">
              <AlertCircle className="mr-2 h-5 w-5" />
              {t('errorFetchingBankDetails')}: {bankDetailsError.message}
            </div>
          )}
          <Form {...bankDetailsForm}>
            <form onSubmit={bankDetailsForm.handleSubmit(onBankDetailsSubmit)} className="space-y-6">
              <FormField control={bankDetailsForm.control} name="bankName" render={({ field }) => ( <FormItem><FormLabel>{t('bankName')}</FormLabel><FormControl><Input placeholder={t('enterBankName')} {...field} /></FormControl><FormMessage /></FormItem> )} />
              <FormField control={bankDetailsForm.control} name="accountName" render={({ field }) => ( <FormItem><FormLabel>{t('accountName')}</FormLabel><FormControl><Input placeholder={t('enterAccountName')} {...field} /></FormControl><FormMessage /></FormItem> )} />
              <FormField control={bankDetailsForm.control} name="accountNumber" render={({ field }) => ( <FormItem><FormLabel>{t('accountNumber')}</FormLabel><FormControl><Input placeholder={t('enterAccountNumber')} {...field} /></FormControl><FormMessage /></FormItem> )} />
              {currentBankDetails?.lastUpdated && (
                <p className="text-xs text-muted-foreground">
                    {t('lastUpdated')}: { currentBankDetails.lastUpdated instanceof Timestamp ? currentBankDetails.lastUpdated.toDate().toLocaleString() : (typeof currentBankDetails.lastUpdated === 'string' ? new Date(currentBankDetails.lastUpdated).toLocaleString() : String(currentBankDetails.lastUpdated)) }
                </p>
              )}
              <Button type="submit" disabled={bankDetailsMutation.isPending}>
                {bankDetailsMutation.isPending ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Save className="mr-2 h-4 w-4" />}
                {t('saveBankDetails')}
              </Button>
            </form>
          </Form>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center">
            <Megaphone className="mr-2 h-6 w-6 text-primary" />
            {t('siteAnnouncementSettings')}
          </CardTitle>
          <CardDescription>{t('siteAnnouncementSettingsDescription')}</CardDescription>
        </CardHeader>
        <CardContent>
          {siteSettingsError && (
            <div className="mb-4 p-4 bg-destructive/10 text-destructive border border-destructive rounded-md flex items-center">
              <AlertCircle className="mr-2 h-5 w-5" />
              {t('errorFetchingSiteSettings')}: {siteSettingsError.message}
            </div>
          )}
          <Form {...siteSettingsForm}>
            <form onSubmit={siteSettingsForm.handleSubmit(onSiteSettingsSubmit)} className="space-y-6">
              <FormField
                control={siteSettingsForm.control}
                name="siteAnnouncementMessage"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>{t('announcementMessage')}</FormLabel>
                    <FormControl>
                      <Textarea placeholder={t('enterAnnouncementMessagePlaceholder')} {...field} />
                    </FormControl>
                    <FormDescription>{t('announcementMessageDescription')}</FormDescription>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <FormField
                control={siteSettingsForm.control}
                name="isAnnouncementVisible"
                render={({ field }) => (
                  <FormItem className="flex flex-row items-center space-x-3 space-y-0 rounded-md border p-4">
                    <FormControl>
                      <Checkbox
                        checked={field.value}
                        onCheckedChange={field.onChange}
                        id="isAnnouncementVisible"
                      />
                    </FormControl>
                    <div className="space-y-1 leading-none">
                      <FormLabel htmlFor="isAnnouncementVisible">{t('showAnnouncementOnSite')}</FormLabel>
                      <FormDescription>{t('showAnnouncementOnSiteDescription')}</FormDescription>
                    </div>
                    <FormMessage />
                  </FormItem>
                )}
              />
              {currentSiteSettings?.lastUpdated && (
                <p className="text-xs text-muted-foreground">
                  {t('lastUpdated')}: { currentSiteSettings.lastUpdated instanceof Timestamp ? currentSiteSettings.lastUpdated.toDate().toLocaleString() : (typeof currentSiteSettings.lastUpdated === 'string' ? new Date(currentSiteSettings.lastUpdated).toLocaleString() : String(currentSiteSettings.lastUpdated)) }
                </p>
              )}
              <Button type="submit" disabled={siteSettingsMutation.isPending}>
                {siteSettingsMutation.isPending ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Save className="mr-2 h-4 w-4" />}
                {t('saveSiteSettings')}
              </Button>
            </form>
          </Form>
        </CardContent>
      </Card>
    </div>
  );
}
