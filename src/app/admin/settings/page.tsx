
"use client";

import React from 'react';
import { zodResolver } from "@hookform/resolvers/zod";
import { useForm } from "react-hook-form";
import * as z from "zod";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { useLanguage } from "@/hooks/use-language";
import { useAuth } from "@/hooks/use-auth";
import { useToast } from "@/hooks/use-toast";
import { Settings, Save, Loader2, AlertCircle } from "lucide-react";
import { db } from '@/lib/firebase';
import { doc, getDoc, setDoc, serverTimestamp, Timestamp } from 'firebase/firestore';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import type { BankAccountDetails } from '@/types';

const BANK_DETAILS_DOC_PATH = "site_configuration/bank_account_details";
const BANK_DETAILS_QUERY_KEY = "bankAccountDetails";

const bankDetailsSchema = z.object({
  bankName: z.string().min(1, { message: "Bank name is required." }),
  accountName: z.string().min(1, { message: "Account name is required." }),
  accountNumber: z.string().min(1, { message: "Account number is required." }),
});

type BankDetailsFormValues = z.infer<typeof bankDetailsSchema>;

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

export default function AdminSettingsPage() {
  const { t } = useLanguage();
  const { user, loading: authLoading } = useAuth();
  const { toast } = useToast();
  const queryClient = useQueryClient();

  const { data: currentBankDetails, isLoading: isLoadingBankDetails, error: bankDetailsError, refetch } = useQuery<BankAccountDetails | null, Error>({
    queryKey: [BANK_DETAILS_QUERY_KEY],
    queryFn: fetchBankDetails,
  });

  const form = useForm<BankDetailsFormValues>({
    resolver: zodResolver(bankDetailsSchema),
    defaultValues: {
      bankName: "",
      accountName: "",
      accountNumber: "",
    },
  });

  React.useEffect(() => {
    if (currentBankDetails) {
      form.reset({
        bankName: currentBankDetails.bankName,
        accountName: currentBankDetails.accountName,
        accountNumber: currentBankDetails.accountNumber,
      });
    }
  }, [currentBankDetails, form]);

  const mutation = useMutation<void, Error, BankDetailsFormValues>({
    mutationFn: updateBankDetails,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: [BANK_DETAILS_QUERY_KEY] });
      toast({ title: t('success'), description: t('bankDetailsUpdatedSuccess') });
    },
    onError: (error) => {
      toast({ variant: "destructive", title: t('error'), description: error.message || t('errorUpdatingBankDetails') });
    },
  });

  async function onSubmit(values: BankDetailsFormValues) {
    mutation.mutate(values);
  }

  if (authLoading || isLoadingBankDetails) {
    return <div className="flex justify-center items-center h-40"><Loader2 className="h-8 w-8 animate-spin text-primary" /></div>;
  }

  if (!user || (user.role !== 'admin' && user.role !== 'superadmin')) {
    return <p>{t('accessDenied')}</p>; 
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
          <Form {...form}>
            <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
              <FormField
                control={form.control}
                name="bankName"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>{t('bankName')}</FormLabel>
                    <FormControl><Input placeholder={t('enterBankName')} {...field} /></FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <FormField
                control={form.control}
                name="accountName"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>{t('accountName')}</FormLabel>
                    <FormControl><Input placeholder={t('enterAccountName')} {...field} /></FormControl>
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
                    <FormControl><Input placeholder={t('enterAccountNumber')} {...field} /></FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              {currentBankDetails?.lastUpdated && (
                <p className="text-xs text-muted-foreground">
                    {t('lastUpdated')}: {
                        currentBankDetails.lastUpdated instanceof Timestamp 
                        ? currentBankDetails.lastUpdated.toDate().toLocaleString() 
                        : (typeof currentBankDetails.lastUpdated === 'string' 
                            ? new Date(currentBankDetails.lastUpdated).toLocaleString() 
                            : String(currentBankDetails.lastUpdated))
                    }
                </p>
              )}
              <Button type="submit" disabled={mutation.isPending}>
                {mutation.isPending ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Save className="mr-2 h-4 w-4" />}
                {t('saveBankDetails')}
              </Button>
            </form>
          </Form>
        </CardContent>
      </Card>
    </div>
  );
}

