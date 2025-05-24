
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
import { useAuth } from "@/hooks/use-auth";
import { useToast } from "@/hooks/use-toast";
import Link from "next/link";
import { Building } from "lucide-react";
import AuthLayout from '../layout'; // Using the auth layout

const companyRegistrationSchema = z.object({
  companyName: z.string().min(2, { message: "Company name must be at least 2 characters." }),
  contactPerson: z.string().min(2, { message: "Contact person name must be at least 2 characters." }),
  email: z.string().email({ message: "Invalid email address." }),
  phone: z.string().min(7, { message: "Phone number seems too short." }),
  password: z.string().min(6, { message: "Password must be at least 6 characters." }),
});

type CompanyRegistrationValues = z.infer<typeof companyRegistrationSchema>;

export default function RegisterCompanyPage() {
  const { t } = useLanguage();
  const { toast } = useToast();
  const { registerCompany } = useAuth(); // Using mock registration

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

  function onSubmit(data: CompanyRegistrationValues) {
    // In a real app, this would make an API call.
    // For mock, we use the registerCompany function from useAuth.
    try {
      const newCompany = registerCompany({
        companyName: data.companyName,
        name: data.contactPerson, // Assuming contactPerson is the user's name for the company_representative
        email: data.email,
        // Phone is not directly on User type, but could be stored elsewhere or on company profile.
        // Password would be handled by auth provider.
      });
      console.log("Mock company registered:", newCompany);

      toast({
        title: t('registrationSubmittedTitle'), // Add to JSON e.g., "Registration Submitted"
        description: t('registrationSubmittedMessage'), // Add to JSON e.g., "Your company registration has been submitted and is pending approval."
      });
      form.reset();
      // Optionally redirect or clear form
    } catch (error) {
      toast({
        variant: "destructive",
        title: t('registrationFailedTitle'), // Add to JSON e.g., "Registration Failed"
        description: (error instanceof Error) ? error.message : t('unknownError'), // Add 'unknownError' to JSON
      });
    }
  }

  return (
    <AuthLayout>
      <Card className="w-full max-w-lg shadow-2xl">
        <CardHeader className="text-center space-y-1">
           <div className="mx-auto bg-primary/10 p-3 rounded-full w-fit mb-2">
            <Building className="w-8 h-8 text-primary" />
          </div>
          <CardTitle className="text-2xl">{t('companyRegistrationTitle')}</CardTitle> {/* Add to JSON e.g., "Company Registration" */}
          <CardDescription>{t('companyRegistrationDescription')}</CardDescription> {/* Add to JSON e.g., "Fill in the details to register your company." */}
        </CardHeader>
        <CardContent>
          <Form {...form}>
            <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
              <FormField
                control={form.control}
                name="companyName"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>{t('companyName')}</FormLabel>
                    <FormControl><Input placeholder={t('enterCompanyName')} {...field} /></FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <FormField
                control={form.control}
                name="contactPerson"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>{t('contactPersonName')}</FormLabel> {/* Add 'contactPersonName' to JSON */}
                    <FormControl><Input placeholder={t('enterContactPersonName')} {...field} /></FormControl> {/* Add 'enterContactPersonName' to JSON */}
                    <FormMessage />
                  </FormItem>
                )}
              />
              <FormField
                control={form.control}
                name="email"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>{t('email')}</FormLabel>
                    <FormControl><Input type="email" placeholder={t('enterEmail')} {...field} /></FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <FormField
                control={form.control}
                name="phone"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>{t('phone')}</FormLabel>
                    <FormControl><Input type="tel" placeholder={t('enterPhone')} {...field} /></FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <FormField
                control={form.control}
                name="password"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>{t('password')}</FormLabel>
                    <FormControl><Input type="password" placeholder={t('enterPassword')} {...field} /></FormControl> {/* Add 'enterPassword' to JSON */}
                    <FormMessage />
                  </FormItem>
                )}
              />
              <Button type="submit" className="w-full">
                {t('registerButton')} {/* Add 'registerButton' to JSON e.g., "Register" */}
              </Button>
            </form>
          </Form>
        </CardContent>
        <CardFooter className="text-center text-sm">
          <p className="text-muted-foreground">
            {t('alreadyHaveAccount')}{" "} {/* Add 'alreadyHaveAccount' to JSON */}
            <Link href="/auth/login" className="text-primary hover:underline">
              {t('loginHere')} {/* Add 'loginHere' to JSON */}
            </Link>
          </p>
        </CardFooter>
      </Card>
    </AuthLayout>
  );
}
