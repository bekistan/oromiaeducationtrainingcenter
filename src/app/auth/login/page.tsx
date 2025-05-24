
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
import { useRouter } from 'next/navigation';
import { LockKeyhole, Loader2 } from "lucide-react";

export default function LoginPage() {
  const { t } = useLanguage();
  const { loginAsIndividual, loginAsCompany, loginAsAdmin, loginAsSuperAdmin } = useAuth();
  const { toast } = useToast();
  const router = useRouter();
  const [isLoading, setIsLoading] = useState(false);
  const [emailInput, setEmailInput] = useState('');
  const [password, setPassword] = useState('');

  const handleSubmit = async (event: React.FormEvent) => {
    event.preventDefault();
    setIsLoading(true);

    const normalizedEmail = emailInput.trim().toLowerCase();

    let loggedIn = false;
    let redirectPath = '/'; // Default redirect

    // Ensure you are using one of these exact emails. Password is ignored for this mock login.
    // Approved Company: company@example.com
    // Pending Company:  pending.company@example.com
    // Rejected Company: rejected.company@example.com
    // Individual User:  individual@example.com
    // Admin User:       admin@example.com
    // Super Admin User: superadmin@example.com

    if (normalizedEmail === 'individual@example.com') {
      loginAsIndividual();
      loggedIn = true;
      redirectPath = '/';
    } else if (normalizedEmail === 'company@example.com') {
      loginAsCompany('approved');
      loggedIn = true;
      redirectPath = '/company/dashboard';
    } else if (normalizedEmail === 'pending.company@example.com') {
      loginAsCompany('pending');
      loggedIn = true;
      redirectPath = '/company/dashboard';
    } else if (normalizedEmail === 'rejected.company@example.com') {
      loginAsCompany('rejected');
      loggedIn = true;
      redirectPath = '/company/dashboard';
    } else if (normalizedEmail === 'admin@example.com') {
      loginAsAdmin();
      loggedIn = true;
      redirectPath = '/admin/dashboard';
    } else if (normalizedEmail === 'superadmin@example.com') {
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
              value={emailInput}
              onChange={(e) => setEmailInput(e.target.value)}
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="password">{t('password')}</Label>
            <Input
              id="password"
              type="password"
              required
              placeholder="Password (ignored for mock)"
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
