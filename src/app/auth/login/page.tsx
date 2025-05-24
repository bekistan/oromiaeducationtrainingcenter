
"use client";

import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useLanguage } from "@/hooks/use-language";
import Link from "next/link";
import { LockKeyhole } from "lucide-react";

export default function LoginPage() {
  const { t } = useLanguage();

  // TODO: Implement form handling and authentication logic with backend
  const handleSubmit = (event: React.FormEvent) => {
    event.preventDefault();
    // Placeholder for login logic. In a real app, this would call an auth API.
    // The role would be determined by the backend upon successful authentication.
    alert("Login form submitted (placeholder). Please use mock login buttons in header for testing roles.");
  };

  return (
    <Card className="w-full max-w-md shadow-2xl">
      <CardHeader className="text-center space-y-1">
        <div className="mx-auto bg-primary/10 p-3 rounded-full w-fit mb-2">
            <LockKeyhole className="w-8 h-8 text-primary" />
        </div>
        <CardTitle className="text-2xl">{t('signIn')}</CardTitle> {/* Add 'signIn' to JSON */}
        <CardDescription>{t('enterCredentialsToAccessAccount')}</CardDescription> {/* Add 'enterCredentialsToAccessAccount' to JSON */}
      </CardHeader>
      <CardContent>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="email">{t('email')}</Label>
            <Input id="email" type="email" placeholder="user@example.com" required />
          </div>
          <div className="space-y-2">
            <Label htmlFor="password">{t('password')}</Label>
            <Input id="password" type="password" required />
          </div>
          <Button type="submit" className="w-full">
            {t('login')}
          </Button>
        </form>
      </CardContent>
      <CardFooter className="flex flex-col items-center space-y-2 text-sm">
        <Link href="/auth/forgot-password">
          <Button variant="link" className="text-muted-foreground hover:text-primary">
            {t('forgotPassword')}
          </Button>
        </Link>
        <p className="text-muted-foreground">
          {t('needAccount')}{" "}
          <Link href="/auth/register-company" passHref legacyBehavior>
             <Button variant="link" className="text-primary p-0 h-auto" asChild>
              <a>{t('registerCompanyLink')}</a> {/* Add 'registerCompanyLink' to JSON e.g., "Register as a Company" */}
            </Button>
          </Link>
        </p>
         <p className="text-xs text-muted-foreground mt-2">
          {t('individualUserNote')}{" "} {/* Add 'individualUserNote' to JSON e.g., "Individual users for dormitory bookings do not need to register here." */}
        </p>
      </CardFooter>
    </Card>
  );
}
