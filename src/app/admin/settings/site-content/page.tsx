
"use client";

import React, { useEffect, useMemo } from 'react';
import { zodResolver } from "@hookform/resolvers/zod";
import { useForm, useFieldArray } from "react-hook-form";
import * as z from "zod";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Form, FormControl, FormDescription, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { useLanguage } from "@/hooks/use-language";
import { useAuth } from "@/hooks/use-auth";
import { useToast } from "@/hooks/use-toast";
import { FileText, Save, Loader2, AlertCircle, ShieldAlert, PlusCircle, Trash2 } from "lucide-react";
import { db } from '@/lib/firebase';
import { doc, getDoc, setDoc, serverTimestamp, Timestamp } from 'firebase/firestore';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import type { SiteContentSettings, FAQItem, Locale } from '@/types';
import { SITE_CONTENT_DOC_PATH, DEFAULT_SITE_CONTENT, SUPPORTED_LOCALES, SITE_NAME } from '@/constants';
import { useRouter } from 'next/navigation';
import { v4 as uuidv4 } from 'uuid';

const localeSchema = z.object({
  en: z.string().optional(),
  om: z.string().optional(),
  am: z.string().optional(),
});

const faqItemSchema = z.object({
  id: z.string(),
  question: localeSchema,
  answer: localeSchema,
});

const siteContentSchema = z.object({
  welcomeMessage: localeSchema,
  tagline: localeSchema,
  faqs: z.array(faqItemSchema),
  privacyPolicy: localeSchema,
  termsOfService: localeSchema,
});

type SiteContentFormValues = z.infer<typeof siteContentSchema>;

const SITE_CONTENT_QUERY_KEY = "siteContentSettings";

const fetchSiteContent = async (): Promise<SiteContentSettings> => {
  const docRef = doc(db, SITE_CONTENT_DOC_PATH);
  const docSnap = await getDoc(docRef);
  if (docSnap.exists()) {
    const data = docSnap.data();
    return {
      id: docSnap.id,
      ...DEFAULT_SITE_CONTENT, 
      ...data,
      faqs: data.faqs && data.faqs.length > 0 ? data.faqs : DEFAULT_SITE_CONTENT.faqs,
    } as SiteContentSettings;
  }
  return { ...DEFAULT_SITE_CONTENT, id: 'site_content' }; 
};

const updateSiteContent = async (details: SiteContentFormValues): Promise<void> => {
  const docRef = doc(db, SITE_CONTENT_DOC_PATH);
  await setDoc(docRef, { ...details, lastUpdated: serverTimestamp() }, { merge: true });
};

export default function AdminSiteContentPage() {
  const { t } = useLanguage();
  const { user, loading: authLoading } = useAuth();
  const { toast } = useToast();
  const router = useRouter();
  const queryClient = useQueryClient();

  const canAccessPage = useMemo(() => {
    if (!user) return false;
    return user.role === 'superadmin' || (user.role === 'admin' && !user.buildingAssignment);
  }, [user]);

  const { data: currentContent, isLoading: isLoadingContent, error: contentError } = useQuery<SiteContentSettings, Error>({
    queryKey: [SITE_CONTENT_QUERY_KEY],
    queryFn: fetchSiteContent,
    enabled: !authLoading && canAccessPage,
  });

  const form = useForm<SiteContentFormValues>({
    resolver: zodResolver(siteContentSchema),
    defaultValues: DEFAULT_SITE_CONTENT,
  });

  const { fields, append, remove } = useFieldArray({
    control: form.control,
    name: "faqs",
  });

  useEffect(() => {
    if (currentContent) {
      form.reset({
        welcomeMessage: currentContent.welcomeMessage,
        tagline: currentContent.tagline,
        faqs: currentContent.faqs,
        privacyPolicy: currentContent.privacyPolicy,
        termsOfService: currentContent.termsOfService,
      });
    }
  }, [currentContent, form]);

  const mutation = useMutation<void, Error, SiteContentFormValues>({
    mutationFn: updateSiteContent,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: [SITE_CONTENT_QUERY_KEY] });
      toast({ title: t('success'), description: t('siteContentUpdatedSuccess') });
    },
    onError: (error) => {
      toast({ variant: "destructive", title: t('error'), description: error.message || t('errorUpdatingSiteContent') });
    },
  });

  async function onSubmit(values: SiteContentFormValues) {
    mutation.mutate(values);
  }

  if (authLoading || (isLoadingContent && canAccessPage)) {
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
    <Form {...form}>
      <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
        <div className="flex items-center justify-between">
          <h1 className="text-3xl font-bold text-foreground">{t('manageSiteContent')}</h1>
          <Button type="submit" disabled={mutation.isPending}>
            {mutation.isPending ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Save className="mr-2 h-4 w-4" />}
            {t('saveAllContent')}
          </Button>
        </div>

        {contentError && (
            <div className="mb-4 p-4 bg-destructive/10 text-destructive border border-destructive rounded-md flex items-center">
              <AlertCircle className="mr-2 h-5 w-5" />
              {t('errorFetchingContent')}: {contentError.message}
            </div>
        )}

        <Tabs defaultValue="homepage" className="w-full">
          <TabsList className="grid w-full grid-cols-3">
            <TabsTrigger value="homepage">{t('homepageContent')}</TabsTrigger>
            <TabsTrigger value="privacy">{t('privacyPolicyContent')}</TabsTrigger>
            <TabsTrigger value="terms">{t('termsOfServiceContent')}</TabsTrigger>
          </TabsList>

          <TabsContent value="homepage" className="mt-6">
            <Card>
              <CardHeader><CardTitle>{t('homepageContent')}</CardTitle><CardDescription>{t('homepageContentDescription')}</CardDescription></CardHeader>
              <CardContent className="space-y-6">
                <Card>
                  <CardHeader><CardTitle className="text-lg">{t('heroSection')}</CardTitle></CardHeader>
                  <CardContent className="space-y-4">
                    {SUPPORTED_LOCALES.map(lang => (
                        <FormField key={`welcome-${lang.code}`} control={form.control} name={`welcomeMessage.${lang.code}`} render={({ field }) => ( <FormItem><FormLabel>{t('welcomeMessage')} ({lang.name})</FormLabel><FormControl><Input {...field} placeholder={`${t('welcomeTo')} ${SITE_NAME}`} /></FormControl><FormMessage /></FormItem> )}/>
                    ))}
                    {SUPPORTED_LOCALES.map(lang => (
                        <FormField key={`tagline-${lang.code}`} control={form.control} name={`tagline.${lang.code}`} render={({ field }) => ( <FormItem><FormLabel>{t('tagline')} ({lang.name})</FormLabel><FormControl><Textarea {...field} placeholder={t('siteDescriptionPlaceholder')} /></FormControl><FormMessage /></FormItem> )}/>
                    ))}
                  </CardContent>
                </Card>
                <Card>
                  <CardHeader>
                    <div className="flex justify-between items-center">
                      <CardTitle className="text-lg">{t('manageFaqs')}</CardTitle>
                      <Button type="button" size="sm" variant="outline" onClick={() => append({ id: uuidv4(), question: {}, answer: {} })}>
                        <PlusCircle className="mr-2 h-4 w-4" /> {t('addFaq')}
                      </Button>
                    </div>
                  </CardHeader>
                  <CardContent className="space-y-4">
                    {fields.map((field, index) => (
                      <Card key={field.id} className="p-4 relative">
                        <Button type="button" variant="ghost" size="icon" className="absolute top-2 right-2 text-destructive hover:bg-destructive/10" onClick={() => remove(index)}>
                          <Trash2 className="h-4 w-4" />
                        </Button>
                        <div className="space-y-4">
                          {SUPPORTED_LOCALES.map(lang => (
                            <FormField key={`${field.id}-q-${lang.code}`} control={form.control} name={`faqs.${index}.question.${lang.code}`} render={({ field: formField }) => ( <FormItem><FormLabel>{t('question')} ({lang.name})</FormLabel><FormControl><Input {...formField} /></FormControl><FormMessage /></FormItem> )}/>
                          ))}
                          {SUPPORTED_LOCALES.map(lang => (
                            <FormField key={`${field.id}-a-${lang.code}`} control={form.control} name={`faqs.${index}.answer.${lang.code}`} render={({ field: formField }) => ( <FormItem><FormLabel>{t('answer')} ({lang.name})</FormLabel><FormControl><Textarea {...formField} rows={4} /></FormControl><FormMessage /></FormItem> )}/>
                          ))}
                        </div>
                      </Card>
                    ))}
                    {fields.length === 0 && <p className="text-muted-foreground text-sm text-center py-4">{t('noFaqsAdded')}</p>}
                  </CardContent>
                </Card>
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="privacy" className="mt-6">
            <Card>
              <CardHeader><CardTitle>{t('privacyPolicyContent')}</CardTitle><CardDescription>{t('privacyPolicyContentDescription')}</CardDescription></CardHeader>
              <CardContent className="space-y-4">
                {SUPPORTED_LOCALES.map(lang => (
                  <FormField key={`privacy-${lang.code}`} control={form.control} name={`privacyPolicy.${lang.code}`} render={({ field }) => ( <FormItem><FormLabel>{t('content')} ({lang.name})</FormLabel><FormControl><Textarea {...field} rows={15} placeholder={t('enterContentPlaceholder')} /></FormControl><FormMessage /></FormItem> )}/>
                ))}
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="terms" className="mt-6">
            <Card>
              <CardHeader><CardTitle>{t('termsOfServiceContent')}</CardTitle><CardDescription>{t('termsOfServiceContentDescription')}</CardDescription></CardHeader>
              <CardContent className="space-y-4">
                {SUPPORTED_LOCALES.map(lang => (
                  <FormField key={`terms-${lang.code}`} control={form.control} name={`termsOfService.${lang.code}`} render={({ field }) => ( <FormItem><FormLabel>{t('content')} ({lang.name})</FormLabel><FormControl><Textarea {...field} rows={15} placeholder={t('enterContentPlaceholder')} /></FormControl><FormMessage /></FormItem> )}/>
                ))}
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>
      </form>
    </Form>
  );
}
