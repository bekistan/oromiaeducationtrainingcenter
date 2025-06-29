
"use client";

import React, { useState } from 'react';
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useLanguage } from "@/hooks/use-language";
import { useAuth } from "@/hooks/use-auth";
import { useToast } from "@/hooks/use-toast";
import Link from "next/link";
import { useRouter, useSearchParams } from 'next/navigation';
import { LockKeyhole, Loader2 } from "lucide-react";

export default function LoginPageContent() {
  const { t } = useLanguage();
  const { login, user, loading: authLoading } = useAuth(); 
  const { toast } = useToast();
  const router = useRouter();
  const searchParams = useSearchParams();
  const [isLoading, setIsLoading] = useState(false);
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');

  const handleSubmit = async (event: React.FormEvent) => {
    event.preventDefault();
    setIsLoading(true);

    try {
      const loggedInUser = await login(email, password);
      toast({ title: t('loginSuccessful'), description: t('welcomeBack') });
      
      const redirectParam = searchParams.get('redirect');

      if (loggedInUser) {
        if (redirectParam) {
          router.push(redirectParam);
        } else if (loggedInUser.role === 'admin' || loggedInUser.role === 'superadmin') {
          router.push('/admin/dashboard');
        } else if (loggedInUser.role === 'company_representative') {
          router.push('/company/dashboard');
        } else if (loggedInUser.role === 'keyholder') {
          router.push('/keyholder/dashboard');
        } else {
          router.push('/'); // Default redirect for individual users or other roles
        }
      } 
      // No explicit else needed here, as login() will throw an error if userCredential or Firestore doc is missing
      // which is caught below.

    } catch (error: any) {
      let errorMessage = t('invalidCredentials'); // Default error
      if (error.code === 'auth/user-not-found' || 
          error.code === 'auth/wrong-password' || 
          error.code === 'auth/invalid-credential') {
        errorMessage = t('invalidCredentials');
      } else if (error.code === 'auth/invalid-email') {
        errorMessage = t('invalidEmailFormat'); 
      } else if (error.code === 'auth/network-request-failed') {
        errorMessage = t('networkRequestFailedError'); // Specific message for network errors
      } else if (error.message === "userDataMissing") {
        errorMessage = t('userDataMissingError'); 
      } else if (error.message) {
        // For other errors thrown from useAuth or Firebase that have a message
        errorMessage = error.message;
      }
      
      toast({ variant: "destructive", title: t('loginFailed'), description: errorMessage });
    } finally {
      setIsLoading(false);
    }
  };
  
  // Redirect if user is already logged in and tries to access login page
  React.useEffect(() => {
    // Do not run redirect logic until the authentication state is fully resolved.
    if (authLoading) {
      return;
    }

    if (user) {
        const redirectParam = searchParams.get('redirect');
        if (redirectParam) {
            router.push(redirectParam);
        } else {
            // More specific default redirects based on role if already logged in
            if (user.role === 'admin' || user.role === 'superadmin') {
                router.push('/admin/dashboard');
            } else if (user.role === 'company_representative') {
                router.push('/company/dashboard');
            } else if (user.role === 'keyholder') {
                router.push('/keyholder/dashboard');
            } else {
                router.push('/'); 
            }
        }
    }
  }, [user, authLoading, router, searchParams]);


  return (
    <Card className="w-full max-w-md shadow-2xl">
      <CardHeader className="text-center space-y-1">
        <div className="mx-auto bg-primary/10 p-3 rounded-full w-fit mb-2">
            <LockKeyhole className="w-8 h-8 text-primary" />
        </div>
        <CardTitle className="text-2xl">{t('signIn')}</CardTitle>
        <CardDescription>{t('enterCredentialsToAccessAccount')}</CardDescription>
      </CardHeader>
      <CardContent>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="email">{t('email')}</Label>
            <Input
              id="email"
              type="email"
              placeholder="user@example.com"
              required
              value={email}
              onChange={(e) => setEmail(e.target.value)}
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="password">{t('password')}</Label>
            <Input
              id="password"
              type="password"
              required
              placeholder={t('enterPassword')}
              value={password}
              onChange={(e) => setPassword(e.target.value)}
            />
          </div>
          <Button type="submit" className="w-full" disabled={isLoading}>
            {isLoading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
            {t('login')}
          </Button>
        </form>
      </CardContent>
      <CardFooter className="flex flex-col items-center space-y-2 text-sm">
        {/* <Link href="/auth/forgot-password" legacyBehavior passHref>
          <a className="text-muted-foreground hover:text-primary hover:underline">{t('forgotPassword')}</a>
        </Link> */}
        <p className="text-muted-foreground">
          {t('needAccount')}{" "}
          <Button variant="link" className="text-primary p-0 h-auto" asChild>
            <Link href="/auth/register-company">{t('registerCompanyLink')}</Link>
          </Button>
        </p>
         <p className="text-xs text-muted-foreground mt-2">
          {t('individualUserNote')}
        </p>
      </CardFooter>
    </Card>
  );
}
