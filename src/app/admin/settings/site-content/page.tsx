
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
import { FileText, Save, Loader2, AlertCircle, ShieldAlert, PlusCircle, Trash2, Languages } from "lucide-react";
import { db } from '@/lib/firebase';
import { doc, getDoc, setDoc, serverTimestamp, Timestamp } from 'firebase/firestore';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import type { SiteContentSettings, FAQItem, Locale, ServiceItem } from '@/types';
import { SITE_CONTENT_DOC_PATH, DEFAULT_SITE_CONTENT, SUPPORTED_LOCALES, SITE_NAME } from '@/constants';
import { useRouter } from 'next/navigation';
import { v4 as uuidv4 } from 'uuid';
import { translateText } from '@/ai/flows/translate-flow';

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

const serviceItemSchema = z.object({
  id: z.string(),
  title: localeSchema,
  description: localeSchema,
  image: z.string(),
});

const siteContentSchema = z.object({
  welcomeMessage: localeSchema,
  tagline: localeSchema,
  featuredDormitoriesTitle: localeSchema,
  featuredDormitoriesSubtitle: localeSchema,
  featuredHallsTitle: localeSchema,
  featuredHallsSubtitle: localeSchema,
  discoverSectionTitle: localeSchema,
  discoverSectionDescription: localeSchema,
  servicesSectionTitle: localeSchema,
  services: z.array(serviceItemSchema),
  faqs: z.array(faqItemSchema),
  privacyPolicy: localeSchema,
  termsOfService: localeSchema,
});

type SiteContentFormValues = z.infer<typeof siteContentSchema>;

const SITE_CONTENT_QUERY_KEY = "siteContentSettings";

const fetchSiteContent = async (): Promise<SiteContentSettings> => {
  if (!db) {
      console.warn("Database not configured. Using default site content.");
      return { ...DEFAULT_SITE_CONTENT, id: 'site_content' };
  }
  const docRef = doc(db, SITE_CONTENT_DOC_PATH);
  const docSnap = await getDoc(docRef);
  if (docSnap.exists()) {
    const data = docSnap.data();
    return {
      id: docSnap.id,
      ...DEFAULT_SITE_CONTENT,
      ...data,
      faqs: data.faqs && data.faqs.length > 0 ? data.faqs : DEFAULT_SITE_CONTENT.faqs,
      services: data.services && data.services.length > 0 ? data.services : DEFAULT_SITE_CONTENT.services,
    } as SiteContentSettings;
  }
  return { ...DEFAULT_SITE_CONTENT, id: 'site_content' };
};

const updateSiteContent = async (details: SiteContentFormValues): Promise<void> => {
  if (!db) throw new Error("Database not configured. Cannot update site content.");
  const docRef = doc(db, SITE_CONTENT_DOC_PATH);
  await setDoc(docRef, { ...details, lastUpdated: serverTimestamp() }, { merge: true });
};

export default function AdminSiteContentPage() {
  const { t } = useLanguage();
  const { user, loading: authLoading } = useAuth();
  const { toast } = useToast();
  const router = useRouter();
  const queryClient = useQueryClient();
  const [isTranslating, setIsTranslating] = React.useState<Record<string, boolean>>({});

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
  
  // Services are managed but not added/removed, so we just get their fields
  const { fields: serviceFields } = useFieldArray({
    control: form.control,
    name: "services",
  });

  useEffect(() => {
    if (currentContent) {
      form.reset({
        ...DEFAULT_SITE_CONTENT, // Ensure all defaults are present
        ...currentContent, // Override with fetched content
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

  const handleTranslate = async (fieldName: string, sourceText: string | undefined | null) => {
    if (!sourceText || sourceText.trim() === '') {
        toast({
            variant: "destructive",
            title: t('translationSourceMissingTitle'),
            description: t('translationSourceMissingDesc'),
        });
        return;
    }

    const fieldKey = fieldName;
    setIsTranslating(prev => ({ ...prev, [fieldKey]: true }));

    try {
        const result = await translateText({
            textToTranslate: sourceText,
            sourceLanguage: 'English',
        });

        if (result.Oromo) {
            form.setValue(`${fieldName}.om` as any, result.Oromo, { shouldValidate: true, shouldDirty: true });
        }
        if (result.Amharic) {
            form.setValue(`${fieldName}.am` as any, result.Amharic, { shouldValidate: true, shouldDirty: true });
        }
        
        toast({
            title: t('translationSuccessfulTitle'),
            description: t('translationSuccessfulDesc'),
        });
    } catch (err: any) {
        toast({
            variant: "destructive",
            title: t('translationFailedTitle'),
            description: err.message || t('translationFailedDesc'),
        });
    } finally {
        setIsTranslating(prev => ({ ...prev, [fieldKey]: false }));
    }
  };


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
          <TabsList className="h-auto flex-col items-stretch sm:flex-row">
            <TabsTrigger value="homepage">{t('homepageContent')}</TabsTrigger>
            <TabsTrigger value="services">{t('servicesContent')}</TabsTrigger>
            <TabsTrigger value="privacy">{t('privacyPolicy')}</TabsTrigger>
            <TabsTrigger value="terms">{t('termsOfService')}</TabsTrigger>
          </TabsList>

          <TabsContent value="homepage" className="mt-6">
            <Card>
              <CardHeader>
                <CardTitle>{t('homepageContent')}</CardTitle>
                <CardDescription>{t('homepageContentDescription')}</CardDescription>
              </CardHeader>
              <CardContent className="space-y-6">
                <Card>
                  <CardHeader>
                    <CardTitle className="text-lg">{t('heroSection')}</CardTitle>
                  </CardHeader>
                  <CardContent className="space-y-4">
                    <div className="flex justify-between items-center mb-2">
                        <h4 className="text-base font-semibold">{t('welcomeMessage')}</h4>
                        <Button type="button" variant="ghost" size="sm" onClick={() => handleTranslate('welcomeMessage', form.getValues('welcomeMessage.en'))} disabled={isTranslating['welcomeMessage']} >
                            {isTranslating['welcomeMessage'] ? <Loader2 className="h-4 w-4 animate-spin" /> : <Languages className="h-4 w-4" />}<span className="ml-2 hidden sm:inline">{t('autoTranslate')}</span>
                        </Button>
                    </div>
                    <div className="space-y-3 pl-2 border-l-2">
                      {SUPPORTED_LOCALES.map(lang => (
                          <FormField key={`welcome-${lang.code}`} control={form.control} name={`welcomeMessage.${lang.code}`} render={({ field }) => ( <FormItem><FormLabel>({lang.name})</FormLabel><FormControl><Input {...field} placeholder={`${t('welcomeTo')} ${SITE_NAME}`} /></FormControl><FormMessage /></FormItem> )}/>
                      ))}
                    </div>
                     <div className="flex justify-between items-center mb-2 pt-6">
                        <h4 className="text-base font-semibold">{t('tagline')}</h4>
                        <Button type="button" variant="ghost" size="sm" onClick={() => handleTranslate('tagline', form.getValues('tagline.en'))} disabled={isTranslating['tagline']} >
                            {isTranslating['tagline'] ? <Loader2 className="h-4 w-4 animate-spin" /> : <Languages className="h-4 w-4" />}<span className="ml-2 hidden sm:inline">{t('autoTranslate')}</span>
                        </Button>
                    </div>
                     <div className="space-y-3 pl-2 border-l-2">
                        {SUPPORTED_LOCALES.map(lang => (
                            <FormField key={`tagline-${lang.code}`} control={form.control} name={`tagline.${lang.code}`} render={({ field }) => ( <FormItem><FormLabel>({lang.name})</FormLabel><FormControl><Textarea {...field} placeholder={t('siteDescriptionPlaceholder')} /></FormControl><FormMessage /></FormItem> )}/>
                        ))}
                    </div>
                  </CardContent>
                </Card>
                <Card>
                  <CardHeader>
                    <CardTitle className="text-lg">{t('featuredSections')}</CardTitle>
                  </CardHeader>
                  <CardContent className="space-y-6">
                    {/* Featured Dormitories */}
                    <div className="space-y-4 rounded-md border p-4">
                      <div className="flex justify-between items-center mb-2">
                        <h4 className="text-base font-semibold">{t('featuredDormitoriesSection')}</h4>
                        <Button type="button" variant="ghost" size="sm" onClick={() => handleTranslate('featuredDormitoriesTitle', form.getValues('featuredDormitoriesTitle.en'))} disabled={isTranslating['featuredDormitoriesTitle']} >
                            {isTranslating['featuredDormitoriesTitle'] ? <Loader2 className="h-4 w-4 animate-spin" /> : <Languages className="h-4 w-4" />}<span className="ml-2 hidden sm:inline">{t('autoTranslate')}</span>
                        </Button>
                      </div>
                      <div className="space-y-3 pl-2 border-l-2">
                        {SUPPORTED_LOCALES.map(lang => (
                            <FormField key={`dorm-title-${lang.code}`} control={form.control} name={`featuredDormitoriesTitle.${lang.code}`} render={({ field }) => ( <FormItem><FormLabel>{t('title')} ({lang.name})</FormLabel><FormControl><Input {...field} /></FormControl><FormMessage /></FormItem> )}/>
                        ))}
                      </div>
                      <div className="flex justify-between items-center mb-2 pt-4">
                        <h4 className="text-base font-semibold">{t('featuredDormitoriesSubtitle')}</h4>
                        <Button type="button" variant="ghost" size="sm" onClick={() => handleTranslate('featuredDormitoriesSubtitle', form.getValues('featuredDormitoriesSubtitle.en'))} disabled={isTranslating['featuredDormitoriesSubtitle']} >
                            {isTranslating['featuredDormitoriesSubtitle'] ? <Loader2 className="h-4 w-4 animate-spin" /> : <Languages className="h-4 w-4" />}<span className="ml-2 hidden sm:inline">{t('autoTranslate')}</span>
                        </Button>
                      </div>
                      <div className="space-y-3 pl-2 border-l-2">
                        {SUPPORTED_LOCALES.map(lang => (
                            <FormField key={`dorm-subtitle-${lang.code}`} control={form.control} name={`featuredDormitoriesSubtitle.${lang.code}`} render={({ field }) => ( <FormItem><FormLabel>{t('subtitle')} ({lang.name})</FormLabel><FormControl><Textarea {...field} rows={2} /></FormControl><FormMessage /></FormItem> )}/>
                        ))}
                      </div>
                    </div>
                    
                    {/* Featured Halls */}
                    <div className="space-y-4 rounded-md border p-4">
                      <div className="flex justify-between items-center mb-2">
                        <h4 className="text-base font-semibold">{t('featuredHallsSection')}</h4>
                        <Button type="button" variant="ghost" size="sm" onClick={() => handleTranslate('featuredHallsTitle', form.getValues('featuredHallsTitle.en'))} disabled={isTranslating['featuredHallsTitle']} >
                            {isTranslating['featuredHallsTitle'] ? <Loader2 className="h-4 w-4 animate-spin" /> : <Languages className="h-4 w-4" />}<span className="ml-2 hidden sm:inline">{t('autoTranslate')}</span>
                        </Button>
                      </div>
                      <div className="space-y-3 pl-2 border-l-2">
                        {SUPPORTED_LOCALES.map(lang => (
                            <FormField key={`hall-title-${lang.code}`} control={form.control} name={`featuredHallsTitle.${lang.code}`} render={({ field }) => ( <FormItem><FormLabel>{t('title')} ({lang.name})</FormLabel><FormControl><Input {...field} /></FormControl><FormMessage /></FormItem> )}/>
                        ))}
                      </div>
                      <div className="flex justify-between items-center mb-2 pt-4">
                        <h4 className="text-base font-semibold">{t('featuredHallsSubtitle')}</h4>
                        <Button type="button" variant="ghost" size="sm" onClick={() => handleTranslate('featuredHallsSubtitle', form.getValues('featuredHallsSubtitle.en'))} disabled={isTranslating['featuredHallsSubtitle']} >
                            {isTranslating['featuredHallsSubtitle'] ? <Loader2 className="h-4 w-4 animate-spin" /> : <Languages className="h-4 w-4" />}<span className="ml-2 hidden sm:inline">{t('autoTranslate')}</span>
                        </Button>
                      </div>
                      <div className="space-y-3 pl-2 border-l-2">
                        {SUPPORTED_LOCALES.map(lang => (
                            <FormField key={`hall-subtitle-${lang.code}`} control={form.control} name={`featuredHallsSubtitle.${lang.code}`} render={({ field }) => ( <FormItem><FormLabel>{t('subtitle')} ({lang.name})</FormLabel><FormControl><Textarea {...field} rows={2} /></FormControl><FormMessage /></FormItem> )}/>
                        ))}
                      </div>
                    </div>
                  </CardContent>
                </Card>
                <Card>
                    <CardHeader>
                        <div className="flex justify-between items-center">
                            <CardTitle className="text-lg">{t('discoverSection')}</CardTitle>
                            <Button type="button" variant="ghost" size="sm" onClick={() => handleTranslate('discoverSectionTitle', form.getValues('discoverSectionTitle.en'))} disabled={isTranslating['discoverSectionTitle']} >
                                {isTranslating['discoverSectionTitle'] ? <Loader2 className="h-4 w-4 animate-spin" /> : <Languages className="h-4 w-4" />}<span className="ml-2 hidden sm:inline">{t('autoTranslate')}</span>
                            </Button>
                        </div>
                    </CardHeader>
                    <CardContent className="space-y-4">
                        <div className="space-y-3 pl-2 border-l-2">
                            {SUPPORTED_LOCALES.map(lang => (
                                <FormField key={`discover-title-${lang.code}`} control={form.control} name={`discoverSectionTitle.${lang.code}`} render={({ field }) => ( <FormItem><FormLabel>{t('title')} ({lang.name})</FormLabel><FormControl><Input {...field} /></FormControl><FormMessage /></FormItem> )}/>
                            ))}
                        </div>
                        <div className="flex justify-between items-center mb-2 pt-6">
                            <h4 className="text-base font-semibold">{t('description')}</h4>
                            <Button type="button" variant="ghost" size="sm" onClick={() => handleTranslate('discoverSectionDescription', form.getValues('discoverSectionDescription.en'))} disabled={isTranslating['discoverSectionDescription']} >
                                {isTranslating['discoverSectionDescription'] ? <Loader2 className="h-4 w-4 animate-spin" /> : <Languages className="h-4 w-4" />}<span className="ml-2 hidden sm:inline">{t('autoTranslate')}</span>
                            </Button>
                        </div>
                        <div className="space-y-3 pl-2 border-l-2">
                            {SUPPORTED_LOCALES.map(lang => (
                                <FormField key={`discover-desc-${lang.code}`} control={form.control} name={`discoverSectionDescription.${lang.code}`} render={({ field }) => ( <FormItem><FormLabel>({lang.name})</FormLabel><FormControl><Textarea {...field} rows={3} /></FormControl><FormMessage /></FormItem> )}/>
                            ))}
                        </div>
                    </CardContent>
                </Card>
                <Card>
                  <CardHeader>
                    <div className="flex justify-between items-center">
                      <CardTitle className="text-lg">{t('manageFaqs')}</CardTitle>
                      <Button type="button" size="sm" variant="outline" onClick={() => append({ id: uuidv4(), question: {en:'',om:'',am:''}, answer: {en:'',om:'',am:''} })}>
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
                        <div className="space-y-4 pr-10">
                           <div className="flex justify-between items-center mb-2">
                              <h4 className="text-base font-semibold">{t('question')} #{index + 1}</h4>
                              <Button type="button" variant="ghost" size="sm" onClick={() => handleTranslate(`faqs.${index}.question`, form.getValues(`faqs.${index}.question.en`))} disabled={isTranslating[`faqs.${index}.question`]} >
                                {isTranslating[`faqs.${index}.question`] ? <Loader2 className="h-4 w-4 animate-spin" /> : <Languages className="h-4 w-4" />}<span className="ml-2 hidden sm:inline">{t('autoTranslate')}</span>
                              </Button>
                           </div>
                           <div className="space-y-3 pl-2 border-l-2">
                              {SUPPORTED_LOCALES.map(lang => (
                                <FormField key={`${field.id}-q-${lang.code}`} control={form.control} name={`faqs.${index}.question.${lang.code}`} render={({ field: formField }) => ( <FormItem><FormLabel>({lang.name})</FormLabel><FormControl><Input {...formField} /></FormControl><FormMessage /></FormItem> )}/>
                              ))}
                            </div>
                           <div className="flex justify-between items-center mb-2 pt-6">
                              <h4 className="text-base font-semibold">{t('answer')} #{index + 1}</h4>
                              <Button type="button" variant="ghost" size="sm" onClick={() => handleTranslate(`faqs.${index}.answer`, form.getValues(`faqs.${index}.answer.en`))} disabled={isTranslating[`faqs.${index}.answer`]} >
                                {isTranslating[`faqs.${index}.answer`] ? <Loader2 className="h-4 w-4 animate-spin" /> : <Languages className="h-4 w-4" />}<span className="ml-2 hidden sm:inline">{t('autoTranslate')}</span>
                              </Button>
                           </div>
                           <div className="space-y-3 pl-2 border-l-2">
                              {SUPPORTED_LOCALES.map(lang => (
                                <FormField key={`${field.id}-a-${lang.code}`} control={form.control} name={`faqs.${index}.answer.${lang.code}`} render={({ field: formField }) => ( <FormItem><FormLabel>({lang.name})</FormLabel><FormControl><Textarea {...formField} rows={4} /></FormControl><FormMessage /></FormItem> )}/>
                              ))}
                            </div>
                        </div>
                      </Card>
                    ))}
                    {fields.length === 0 && <p className="text-muted-foreground text-sm text-center py-4">{t('noFaqsAdded')}</p>}
                  </CardContent>
                </Card>
              </CardContent>
            </Card>
          </TabsContent>
          
          <TabsContent value="services" className="mt-6">
            <Card>
              <CardHeader>
                <CardTitle>{t('servicesSection')}</CardTitle>
                <CardDescription>{t('servicesSectionDescription')}</CardDescription>
              </CardHeader>
              <CardContent className="space-y-6">
                <Card>
                    <CardHeader>
                         <div className="flex justify-between items-center">
                            <CardTitle className="text-lg">{t('sectionHeader')}</CardTitle>
                            <Button type="button" variant="ghost" size="sm" onClick={() => handleTranslate('servicesSectionTitle', form.getValues('servicesSectionTitle.en'))} disabled={isTranslating['servicesSectionTitle']} >
                                {isTranslating['servicesSectionTitle'] ? <Loader2 className="h-4 w-4 animate-spin" /> : <Languages className="h-4 w-4" />}<span className="ml-2 hidden sm:inline">{t('autoTranslate')}</span>
                            </Button>
                        </div>
                    </CardHeader>
                    <CardContent className="space-y-3 pl-2 border-l-2">
                        {SUPPORTED_LOCALES.map(lang => (
                            <FormField key={`services-title-${lang.code}`} control={form.control} name={`servicesSectionTitle.${lang.code}`} render={({ field }) => ( <FormItem><FormLabel>{t('title')} ({lang.name})</FormLabel><FormControl><Input {...field} /></FormControl><FormMessage /></FormItem> )}/>
                        ))}
                    </CardContent>
                </Card>
                {serviceFields.map((field, index) => (
                  <Card key={field.id}>
                    <CardHeader>
                        <CardTitle className="text-lg capitalize">{t('serviceCardTitle', { serviceName: field.id })}</CardTitle>
                    </CardHeader>
                    <CardContent className="space-y-4">
                        <div className="flex justify-between items-center mb-2">
                            <h4 className="text-base font-semibold">{t('cardTitle')}</h4>
                            <Button type="button" variant="ghost" size="sm" onClick={() => handleTranslate(`services.${index}.title`, form.getValues(`services.${index}.title.en`))} disabled={isTranslating[`services.${index}.title`]} >
                                {isTranslating[`services.${index}.title`] ? <Loader2 className="h-4 w-4 animate-spin" /> : <Languages className="h-4 w-4" />}<span className="ml-2 hidden sm:inline">{t('autoTranslate')}</span>
                            </Button>
                        </div>
                        <div className="space-y-3 pl-2 border-l-2">
                            {SUPPORTED_LOCALES.map(lang => (
                                <FormField key={`${field.id}-title-${lang.code}`} control={form.control} name={`services.${index}.title.${lang.code}`} render={({ field: formField }) => ( <FormItem><FormLabel>({lang.name})</FormLabel><FormControl><Input {...formField} /></FormControl><FormMessage /></FormItem> )}/>
                            ))}
                        </div>
                        <div className="flex justify-between items-center mb-2 pt-6">
                            <h4 className="text-base font-semibold">{t('cardDescription')}</h4>
                            <Button type="button" variant="ghost" size="sm" onClick={() => handleTranslate(`services.${index}.description`, form.getValues(`services.${index}.description.en`))} disabled={isTranslating[`services.${index}.description`]} >
                                {isTranslating[`services.${index}.description`] ? <Loader2 className="h-4 w-4 animate-spin" /> : <Languages className="h-4 w-4" />}<span className="ml-2 hidden sm:inline">{t('autoTranslate')}</span>
                            </Button>
                        </div>
                        <div className="space-y-3 pl-2 border-l-2">
                            {SUPPORTED_LOCALES.map(lang => (
                                <FormField key={`${field.id}-desc-${lang.code}`} control={form.control} name={`services.${index}.description.${lang.code}`} render={({ field: formField }) => ( <FormItem><FormLabel>({lang.name})</FormLabel><FormControl><Textarea {...formField} /></FormControl><FormMessage /></FormItem> )}/>
                            ))}
                        </div>
                    </CardContent>
                  </Card>
                ))}
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="privacy" className="mt-6">
            <Card>
                <CardHeader>
                    <div className="flex justify-between items-center">
                        <div>
                            <CardTitle>{t('privacyPolicy')}</CardTitle>
                            <CardDescription>{t('privacyPolicyContentDescription')}</CardDescription>
                        </div>
                        <Button type="button" variant="ghost" size="sm" onClick={() => handleTranslate('privacyPolicy', form.getValues('privacyPolicy.en'))} disabled={isTranslating['privacyPolicy']} >
                            {isTranslating['privacyPolicy'] ? <Loader2 className="h-4 w-4 animate-spin" /> : <Languages className="h-4 w-4" />}<span className="ml-2 hidden sm:inline">{t('autoTranslate')}</span>
                        </Button>
                    </div>
                </CardHeader>
              <CardContent className="space-y-4">
                {SUPPORTED_LOCALES.map(lang => (
                  <FormField key={`privacy-${lang.code}`} control={form.control} name={`privacyPolicy.${lang.code}`} render={({ field }) => ( <FormItem><FormLabel>{t('content')} ({lang.name})</FormLabel><FormControl><Textarea {...field} rows={15} placeholder={t('enterContentPlaceholder')} /></FormControl><FormMessage /></FormItem> )}/>
                ))}
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="terms" className="mt-6">
            <Card>
                <CardHeader>
                    <div className="flex justify-between items-center">
                        <div>
                            <CardTitle>{t('termsOfService')}</CardTitle>
                            <CardDescription>{t('termsOfServiceContentDescription')}</CardDescription>
                        </div>
                        <Button type="button" variant="ghost" size="sm" onClick={() => handleTranslate('termsOfService', form.getValues('termsOfService.en'))} disabled={isTranslating['termsOfService']} >
                            {isTranslating['termsOfService'] ? <Loader2 className="h-4 w-4 animate-spin" /> : <Languages className="h-4 w-4" />}<span className="ml-2 hidden sm:inline">{t('autoTranslate')}</span>
                        </Button>
                    </div>
                </CardHeader>
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
