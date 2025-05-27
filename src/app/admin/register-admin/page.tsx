
"use client";

import React, { useState, useEffect } from 'react';
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
import { UserPlus, ShieldAlert, Loader2, UserCog } from "lucide-react";
import { useRouter } from 'next/navigation';
import { db } from '@/lib/firebase';
import { collection, query, where, getDocs, limit } from 'firebase/firestore';

const adminRegistrationSchema = z.object({
  name: z.string().min(2, { message: "Full name must be at least 2 characters." }),
  email: z.string().email({ message: "Invalid email address." }),
  password: z.string().min(6, { message: "Password must be at least 6 characters." }),
});

type AdminRegistrationValues = z.infer<typeof adminRegistrationSchema>;

type PageMode = 'loading' | 'setupSuperAdmin' | 'registerAdmin' | 'accessDenied';

export default function RegisterAdminPage() {
  const { t } = useLanguage();
  const { user, loading: authLoading, signupAdmin, createInitialSuperAdmin } = useAuth();
  const { toast } = useToast();
  const router = useRouter();
  const [isSubmitting, setIsSubmitting] = React.useState(false);
  const [pageMode, setPageMode] = useState<PageMode>('loading');

  const form = useForm<AdminRegistrationValues>({
    resolver: zodResolver(adminRegistrationSchema),
    defaultValues: {
      name: "",
      email: "",
      password: "",
    },
  });

  useEffect(() => {
    if (authLoading) {
      setPageMode('loading');
      return;
    }

    const checkSuperAdminExists = async () => {
      const usersRef = collection(db, "users");
      const q = query(usersRef, where("role", "==", "superadmin"), limit(1));
      const snapshot = await getDocs(q);
      return !snapshot.empty;
    };

    const determineMode = async () => {
      if (user?.role === 'superadmin') {
        setPageMode('registerAdmin');
      } else {
        const superAdminExists = await checkSuperAdminExists();
        if (!superAdminExists) {
          // No superadmin in DB, allow initial setup even if current user is not superadmin or no user logged in
          setPageMode('setupSuperAdmin');
        } else {
          setPageMode('accessDenied');
        }
      }
    };

    determineMode();

  }, [user, authLoading]);


  async function onSubmit(data: AdminRegistrationValues) {
    setIsSubmitting(true);
    try {
      if (pageMode === 'setupSuperAdmin') {
        await createInitialSuperAdmin({
          name: data.name,
          email: data.email,
          password: data.password,
        });
        toast({
          title: t('superAdminCreatedTitle'), // Add to JSON
          description: t('superAdminCreatedMessage', { email: data.email }), // Add to JSON
        });
        router.push('/admin/dashboard'); // Redirect after initial setup
      } else if (pageMode === 'registerAdmin') {
        await signupAdmin({
          name: data.name,
          email: data.email,
          password: data.password,
        });
        toast({
          title: t('adminRegisteredTitle'),
          description: t('adminRegisteredMessage', { email: data.email }),
        });
      }
      form.reset();
    } catch (error: any) {
      console.error("Registration failed:", error);
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

  if (pageMode === 'loading' || authLoading) {
    return <div className="flex justify-center items-center h-screen"><Loader2 className="h-8 w-8 animate-spin text-primary" /><p className="ml-2">{t('loading')}...</p></div>;
  }

  if (pageMode === 'accessDenied') {
    return (
      <div className="flex flex-col items-center justify-center h-screen text-center p-4">
        <ShieldAlert className="w-16 h-16 text-destructive mb-4" />
        <h1 className="text-2xl font-bold text-destructive mb-2">{t('accessDenied')}</h1>
        <p className="text-muted-foreground">
          {user ? t('superAdminOnlyPage') : t('superAdminMustSetupOrLogin')} {/* Add to JSON: "A Super Admin account must exist or you must be logged in as Super Admin." */}
        </p>
        <Button onClick={() => router.push(user ? '/admin/dashboard' : '/auth/login')} className="mt-4">
          {user ? t('backToDashboard') : t('login')}
        </Button>
      </div>
    );
  }

  const title = pageMode === 'setupSuperAdmin' ? t('setupSuperAdminTitle') : t('registerAdminTitle'); // Add to JSON
  const description = pageMode === 'setupSuperAdmin' ? t('setupSuperAdminDescription') : t('registerAdminDescription'); // Add to JSON
  const buttonText = pageMode === 'setupSuperAdmin' ? t('createSuperAdminButton') : t('registerAdminButton'); // Add to JSON
  const Icon = pageMode === 'setupSuperAdmin' ? UserCog : UserPlus;


  return (
    <div className="container mx-auto py-8 px-4 max-w-lg">
      <Card className="shadow-xl">
        <CardHeader className="text-center space-y-1">
          <div className="mx-auto bg-primary/10 p-3 rounded-full w-fit mb-2">
            <Icon className="w-8 h-8 text-primary" />
          </div>
          <CardTitle className="text-2xl">{title}</CardTitle>
          <CardDescription>{description}</CardDescription>
        </CardHeader>
        <CardContent>
          <Form {...form}>
            <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
              <FormField control={form.control} name="name" render={({ field }) => ( <FormItem><FormLabel>{t('fullName')}</FormLabel><FormControl><Input placeholder={t('enterFullName')} {...field} /></FormControl><FormMessage /></FormItem> )} />
              <FormField control={form.control} name="email" render={({ field }) => ( <FormItem><FormLabel>{t('email')}</FormLabel><FormControl><Input type="email" placeholder={t('enterEmail')} {...field} /></FormControl><FormMessage /></FormItem> )} />
              <FormField control={form.control} name="password" render={({ field }) => ( <FormItem><FormLabel>{t('password')}</FormLabel><FormControl><Input type="password" placeholder={t('enterPassword')} {...field} /></FormControl><FormMessage /></FormItem> )} />
              <Button type="submit" className="w-full" disabled={isSubmitting}>
                {isSubmitting && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                {buttonText}
              </Button>
            </form>
          </Form>
        </CardContent>
      </Card>
    </div>
  );
}

