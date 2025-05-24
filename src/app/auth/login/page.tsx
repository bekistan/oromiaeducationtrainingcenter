
"use client";

import React, { useState } from 'react'; // Added useState
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useLanguage } from "@/hooks/use-language";
import { useAuth } from "@/hooks/use-auth"; // Added useAuth
import { useToast } from "@/hooks/use-toast"; // Added useToast
import Link from "next/link";
import { useRouter } from 'next/navigation'; // Added useRouter
import { LockKeyhole, Loader2 } from "lucide-react"; // Added Loader2

export default function LoginPage() {
  const { t } = useLanguage();
  const { loginAsIndividual, loginAsCompany, loginAsAdmin, loginAsSuperAdmin } = useAuth();
  const { toast } = useToast();
  const router = useRouter();
  const [isLoading, setIsLoading] = useState(false);
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');

  const handleSubmit = async (event: React.FormEvent) => {
    event.preventDefault();
    setIsLoading(true);

    // Mock authentication logic
    // Password is not checked in this mock
    let loggedIn = false;
    let redirectPath = '/';

    if (email === 'individual@example.com') {
      loginAsIndividual();
      loggedIn = true;
      redirectPath = '/';
    } else if (email === 'company@example.com') {
      loginAsCompany('approved');
      loggedIn = true;
      redirectPath = '/company/dashboard';
    } else if (email === 'admin@example.com') {
      loginAsAdmin();
      loggedIn = true;
      redirectPath = '/admin/dashboard';
    } else if (email === 'superadmin@example.com') {
      loginAsSuperAdmin();
      loggedIn = true;
      redirectPath = '/admin/dashboard';
    }

    if (loggedIn) {
      toast({ title: t('loginSuccessful'), description: t('welcomeBack') });
      router.push(redirectPath);
    } else {
      toast({ variant: "destructive", title: t('loginFailed'), description: t('invalidCredentials') });
    }
    setIsLoading(false);
  };

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
        <Link href="/auth/forgot-password" legacyBehavior passHref>
          <a className="text-muted-foreground hover:text-primary hover:underline">{t('forgotPassword')}</a>
        </Link>
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
