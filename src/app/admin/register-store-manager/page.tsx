
"use client";

import React from 'react';
import { zodResolver } from "@hookform/resolvers/zod";
import { useForm } from "react-hook-form";
import * as z from "zod";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage, FormDescription } from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { useLanguage } from "@/hooks/use-language";
import { useAuth } from "@/hooks/use-auth";
import { useToast } from "@/hooks/use-toast";
import { Store, ShieldAlert, Loader2 } from "lucide-react"; 
import { useRouter } from 'next/navigation';

const storeManagerRegistrationSchema = z.object({
  name: z.string().min(2, { message: "Full name must be at least 2 characters." }),
  email: z.string().email({ message: "Invalid email address." }),
  password: z.string().min(6, { message: "Password must be at least 6 characters." }),
  phone: z.string().optional().or(z.literal('')),
});

type StoreManagerRegistrationValues = z.infer<typeof storeManagerRegistrationSchema>;

export default function RegisterStoreManagerPage() {
  const { t } = useLanguage();
  const { user, loading: authLoading, signupStoreManager } = useAuth();
  const { toast } = useToast();
  const router = useRouter();
  const [isSubmitting, setIsSubmitting] = React.useState(false);

  const form = useForm<StoreManagerRegistrationValues>({
    resolver: zodResolver(storeManagerRegistrationSchema),
    defaultValues: {
      name: "",
      email: "",
      password: "",
      phone: "",
    },
  });

  async function onSubmit(data: StoreManagerRegistrationValues) {
    setIsSubmitting(true);
    try {
      await signupStoreManager({ 
        name: data.name,
        email: data.email,
        password: data.password,
        phone: data.phone,
      });
      toast({
        title: t('storeManagerRegisteredTitle'),
        description: t('storeManagerRegisteredMessage', { email: data.email }),
      });
      form.reset();
    } catch (error: any) {
      console.error("Store Manager registration failed:", error);
      let errorMessage = error.message || t('unknownError');
      if (error.code === 'auth/email-already-in-use') {
        errorMessage = t('emailAlreadyInUseError');
      } else if (error.code === 'auth/weak-password') {
        errorMessage = t('weakPasswordError');
      }
      toast({
        variant: "destructive",
        title: t('registrationFailedTitle'),
        description: errorMessage,
      });
    } finally {
      setIsSubmitting(false);
    }
  }

  if (authLoading) {
    return <div className="flex justify-center items-center h-screen"><Loader2 className="h-8 w-8 animate-spin text-primary" /><p className="ml-2">{t('loading')}...</p></div>;
  }

  if (user?.role !== 'superadmin') {
    return (
      <div className="flex flex-col items-center justify-center h-screen text-center p-4">
        <ShieldAlert className="w-16 h-16 text-destructive mb-4" />
        <h1 className="text-2xl font-bold text-destructive mb-2">{t('accessDenied')}</h1>
        <p className="text-muted-foreground">{t('superAdminOnlyPage')}</p>
        <Button onClick={() => router.push(user ? '/admin/dashboard' : '/auth/login')} className="mt-4">
          {user ? t('backToDashboard') : t('login')}
        </Button>
      </div>
    );
  }

  return (
    <div className="container mx-auto py-8 px-4 max-w-lg">
      <Card className="shadow-xl">
        <CardHeader className="text-center space-y-1">
          <div className="mx-auto bg-primary/10 p-3 rounded-full w-fit mb-2">
            <Store className="w-8 h-8 text-primary" />
          </div>
          <CardTitle className="text-2xl">{t('registerStoreManagerTitle')}</CardTitle>
          <CardDescription>{t('registerStoreManagerDescription')}</CardDescription>
        </CardHeader>
        <CardContent>
          <Form {...form}>
            <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
              <FormField control={form.control} name="name" render={({ field }) => ( <FormItem><FormLabel>{t('fullName')}</FormLabel><FormControl><Input placeholder={t('enterFullName')} {...field} /></FormControl><FormMessage /></FormItem> )} />
              <FormField control={form.control} name="email" render={({ field }) => ( <FormItem><FormLabel>{t('email')}</FormLabel><FormControl><Input type="email" placeholder={t('enterEmail')} {...field} /></FormControl><FormMessage /></FormItem> )} />
              <FormField control={form.control} name="password" render={({ field }) => ( <FormItem><FormLabel>{t('password')}</FormLabel><FormControl><Input type="password" placeholder={t('enterPassword')} {...field} /></FormControl><FormMessage /></FormItem> )} />
              <FormField control={form.control} name="phone" render={({ field }) => ( <FormItem><FormLabel>{t('phone')} ({t('optional')})</FormLabel><FormControl><Input type="tel" placeholder={t('enterPhoneForSms')} {...field} /></FormControl><FormDescription>{t('phoneForSmsDescription')}</FormDescription><FormMessage /></FormItem> )} />
              <Button type="submit" className="w-full" disabled={isSubmitting}>
                {isSubmitting && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                {t('registerStoreManagerButton')}
              </Button>
            </form>
          </Form>
        </CardContent>
      </Card>
    </div>
  );
}
