
"use client";

import React, { useEffect, useMemo } from 'react';
import { zodResolver } from "@hookform/resolvers";
import { useForm } from "react-hook-form";
import * as z from "zod";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Form, FormControl, FormDescription, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { Textarea } from "@/components/ui/textarea";
import { useLanguage } from "@/hooks/use-language";
import { useAuth } from "@/hooks/use-auth";
import { useToast } from "@/hooks/use-toast";
import { FileText, Save, Loader2, AlertCircle, ShieldAlert } from "lucide-react";
import { db } from '@/lib/firebase';
import { doc, getDoc, setDoc, serverTimestamp, Timestamp } from 'firebase/firestore';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import type { AgreementTemplateSettings } from '@/types';
import { AGREEMENT_TEMPLATE_DOC_PATH, DEFAULT_AGREEMENT_TERMS } from '@/constants';
import { useRouter } from 'next/navigation';

const AGREEMENT_TEMPLATE_QUERY_KEY = "agreementTemplateSettings";

const agreementTemplateSchema = z.object({
  defaultTerms: z.string().min(10, { message: "Agreement terms must be at least 10 characters." }),
});

type AgreementTemplateFormValues = z.infer<typeof agreementTemplateSchema>;

const fetchAgreementTemplate = async (): Promise<AgreementTemplateSettings> => {
  const docRef = doc(db, AGREEMENT_TEMPLATE_DOC_PATH);
  const docSnap = await getDoc(docRef);
  if (docSnap.exists()) {
    const data = docSnap.data();
    return {
      id: docSnap.id,
      defaultTerms: data.defaultTerms || DEFAULT_AGREEMENT_TERMS,
      lastUpdated: data.lastUpdated,
    } as AgreementTemplateSettings;
  }
  return { id: 'agreement_template', defaultTerms: DEFAULT_AGREEMENT_TERMS };
};

const updateAgreementTemplate = async (details: AgreementTemplateFormValues): Promise<void> => {
  const docRef = doc(db, AGREEMENT_TEMPLATE_DOC_PATH);
  await setDoc(docRef, { ...details, lastUpdated: serverTimestamp() }, { merge: true });
};

export default function AdminAgreementTemplatePage() {
  const { t } = useLanguage();
  const { user, loading: authLoading } = useAuth();
  const { toast } = useToast();
  const router = useRouter();
  const queryClient = useQueryClient();

  const canAccessPage = useMemo(() => {
    if (!user) return false;
    return user.role === 'superadmin' || (user.role === 'admin' && !user.buildingAssignment);
  }, [user]);

  const { data: currentTemplate, isLoading: isLoadingTemplate, error: templateError } = useQuery<AgreementTemplateSettings, Error>({
    queryKey: [AGREEMENT_TEMPLATE_QUERY_KEY],
    queryFn: fetchAgreementTemplate,
    enabled: !authLoading && canAccessPage,
  });

  const form = useForm<AgreementTemplateFormValues>({
    resolver: zodResolver(agreementTemplateSchema),
    defaultValues: { defaultTerms: "" },
  });

  useEffect(() => {
    if (currentTemplate) {
      form.reset({
        defaultTerms: currentTemplate.defaultTerms,
      });
    }
  }, [currentTemplate, form]);

  const mutation = useMutation<void, Error, AgreementTemplateFormValues>({
    mutationFn: updateAgreementTemplate,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: [AGREEMENT_TEMPLATE_QUERY_KEY] });
      toast({ title: t('success'), description: t('agreementTemplateUpdatedSuccess') });
    },
    onError: (error) => {
      toast({ variant: "destructive", title: t('error'), description: error.message || t('errorUpdatingAgreementTemplate') });
    },
  });

  async function onSubmit(values: AgreementTemplateFormValues) {
    mutation.mutate(values);
  }

  if (authLoading || (isLoadingTemplate && canAccessPage)) {
    return <div className="flex justify-center items-center h-40"><Loader2 className="h-8 w-8 animate-spin text-primary" /></div>;
  }

  if (!canAccessPage) {
    return (
      <Card className="w-full max-w-md mx-auto my-8">
        <CardHeader>
          <CardTitle className="text-destructive flex items-center"><ShieldAlert className="mr-2"/>{t('accessDenied')}</CardTitle>
        </CardHeader>
        <CardContent>
          <p>{t('settingsAccessRestricted')}</p>
          <Button onClick={() => router.push('/admin/dashboard')} className="mt-4">{t('backToDashboard')}</Button>
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-3xl font-bold text-foreground">{t('manageAgreementTemplate')}</h1>
      </div>
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center">
            <FileText className="mr-2 h-6 w-6 text-primary" />
            {t('defaultAgreementTerms')}
          </CardTitle>
          <CardDescription>{t('agreementTemplateDescription')}</CardDescription>
        </CardHeader>
        <CardContent>
          {templateError && (
            <div className="mb-4 p-4 bg-destructive/10 text-destructive border border-destructive rounded-md flex items-center">
              <AlertCircle className="mr-2 h-5 w-5" />
              {t('errorFetchingTemplate')}: {templateError.message}
            </div>
          )}
          <Form {...form}>
            <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
              <FormField
                control={form.control}
                name="defaultTerms"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>{t('templateContent')}</FormLabel>
                    <FormControl>
                      <Textarea
                        placeholder={t('enterAgreementTermsPlaceholder')}
                        className="min-h-[400px] font-mono text-xs"
                        {...field}
                      />
                    </FormControl>
                    <FormDescription>{t('agreementTemplateInstructions')}</FormDescription>
                    <FormMessage />
                  </FormItem>
                )}
              />
              {currentTemplate?.lastUpdated && (
                <p className="text-xs text-muted-foreground">
                  {t('lastUpdated')}: {currentTemplate.lastUpdated instanceof Timestamp
                    ? currentTemplate.lastUpdated.toDate().toLocaleString()
                    : (typeof currentTemplate.lastUpdated === 'string'
                      ? new Date(currentTemplate.lastUpdated).toLocaleString()
                      : String(currentTemplate.lastUpdated))}
                </p>
              )}
              <Button type="submit" disabled={mutation.isPending}>
                {mutation.isPending ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Save className="mr-2 h-4 w-4" />}
                {t('saveTemplate')}
              </Button>
            </form>
          </Form>
        </CardContent>
      </Card>
    </div>
  );
}
