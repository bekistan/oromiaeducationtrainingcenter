
"use client";

import React from 'react';
import { zodResolver } from "@hookform/resolvers/zod";
import { useForm } from "react-hook-form";
import * as z from "zod";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { useLanguage } from "@/hooks/use-language";
// Removed useAuth import as we are directly interacting with Firebase
import { useToast } from "@/hooks/use-toast";
import Link from "next/link";
import { Building, Loader2 } from "lucide-react";
import AuthLayout from '../layout';
import { db } from '@/lib/firebase';
import { collection, addDoc } from 'firebase/firestore';
// Firebase auth for creating user credentials would go here in a real app
// import { createUserWithEmailAndPassword } from "firebase/auth";
// import { auth } from '@/lib/firebase'; // Assuming auth is exported from firebase.ts

const companyRegistrationSchema = z.object({
  companyName: z.string().min(2, { message: "Company name must be at least 2 characters." }),
  contactPerson: z.string().min(2, { message: "Contact person name must be at least 2 characters." }),
  email: z.string().email({ message: "Invalid email address." }),
  phone: z.string().min(7, { message: "Phone number seems too short." }),
  password: z.string().min(6, { message: "Password must be at least 6 characters." }), // Password for Firebase Auth
});

type CompanyRegistrationValues = z.infer<typeof companyRegistrationSchema>;

export default function RegisterCompanyPage() {
  const { t } = useLanguage();
  const { toast } = useToast();
  const [isSubmitting, setIsSubmitting] = React.useState(false);

  const form = useForm<CompanyRegistrationValues>({
    resolver: zodResolver(companyRegistrationSchema),
    defaultValues: {
      companyName: "",
      contactPerson: "",
      email: "",
      phone: "",
      password: "",
    },
  });

  async function onSubmit(data: CompanyRegistrationValues) {
    setIsSubmitting(true);
    try {
      // In a real app, first create the user with Firebase Auth:
      // const userCredential = await createUserWithEmailAndPassword(auth, data.email, data.password);
      // const firebaseUser = userCredential.user;

      // Then, save company details to Firestore 'users' collection (or a dedicated 'companies' collection)
      // For now, we'll mock the user creation and just save to Firestore.
      const companyData = {
        companyName: data.companyName,
        name: data.contactPerson, // User's name
        email: data.email,
        phone: data.phone, // You might store this separately or as part of company profile
        role: 'company_representative',
        approvalStatus: 'pending',
        // userId: firebaseUser.uid, // Link to Firebase Auth user
        companyId: `comp-${Date.now()}`, // Mock company ID, generate properly in backend
      };

      await addDoc(collection(db, "users"), companyData); // Or use 'companies' collection

      toast({
        title: t('registrationSubmittedTitle'),
        description: t('registrationSubmittedMessage'),
      });
      form.reset();
    } catch (error: any) {
      console.error("Registration failed:", error);
      let errorMessage = t('unknownError');
      if (error.code === 'auth/email-already-in-use') {
        errorMessage = t('emailAlreadyInUseError'); // Add to JSON
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

  return (
    <AuthLayout>
      <Card className="w-full max-w-lg shadow-2xl">
        <CardHeader className="text-center space-y-1">
           <div className="mx-auto bg-primary/10 p-3 rounded-full w-fit mb-2">
            <Building className="w-8 h-8 text-primary" />
          </div>
          <CardTitle className="text-2xl">{t('companyRegistrationTitle')}</CardTitle>
          <CardDescription>{t('companyRegistrationDescription')}</CardDescription>
        </CardHeader>
        <CardContent>
          <Form {...form}>
            <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
              <FormField control={form.control} name="companyName" render={({ field }) => ( <FormItem><FormLabel>{t('companyName')}</FormLabel><FormControl><Input placeholder={t('enterCompanyName')} {...field} /></FormControl><FormMessage /></FormItem> )} />
              <FormField control={form.control} name="contactPerson" render={({ field }) => ( <FormItem><FormLabel>{t('contactPersonName')}</FormLabel><FormControl><Input placeholder={t('enterContactPersonName')} {...field} /></FormControl><FormMessage /></FormItem> )} />
              <FormField control={form.control} name="email" render={({ field }) => ( <FormItem><FormLabel>{t('email')}</FormLabel><FormControl><Input type="email" placeholder={t('enterEmail')} {...field} /></FormControl><FormMessage /></FormItem> )} />
              <FormField control={form.control} name="phone" render={({ field }) => ( <FormItem><FormLabel>{t('phone')}</FormLabel><FormControl><Input type="tel" placeholder={t('enterPhone')} {...field} /></FormControl><FormMessage /></FormItem> )} />
              <FormField control={form.control} name="password" render={({ field }) => ( <FormItem><FormLabel>{t('password')}</FormLabel><FormControl><Input type="password" placeholder={t('enterPassword')} {...field} /></FormControl><FormMessage /></FormItem> )} />
              <Button type="submit" className="w-full" disabled={isSubmitting}>
                {isSubmitting && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                {t('registerButton')}
              </Button>
            </form>
          </Form>
        </CardContent>
        <CardFooter className="text-center text-sm">
          <p className="text-muted-foreground">
            {t('alreadyHaveAccount')}{" "}
            <Link href="/auth/login" className="text-primary hover:underline">
              {t('loginHere')}
            </Link>
          </p>
        </CardFooter>
      </Card>
    </AuthLayout>
  );
}
