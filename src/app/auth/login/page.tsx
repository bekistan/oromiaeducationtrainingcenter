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

  // TODO: Implement form handling and authentication logic
  const handleSubmit = (event: React.FormEvent) => {
    event.preventDefault();
    // Placeholder for login logic
    alert("Login form submitted (placeholder)");
  };

  return (
    <Card className="w-full max-w-md shadow-2xl">
      <CardHeader className="text-center space-y-1">
        <div className="mx-auto bg-primary/10 p-3 rounded-full w-fit mb-2">
            <LockKeyhole className="w-8 h-8 text-primary" />
        </div>
        <CardTitle className="text-2xl">{t('adminLogin')}</CardTitle>
        <CardDescription>{t('enterCredentialsToAccessAdmin')}</CardDescription> {/* Add to JSON */}
      </CardHeader>
      <CardContent>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="email">{t('email')}</Label>
            <Input id="email" type="email" placeholder="admin@example.com" required />
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
        <Link href="/auth/forgot-password"> {/* Add to JSON and create page */}
          <Button variant="link" className="text-muted-foreground hover:text-primary">
            {t('forgotPassword')}
          </Button>
        </Link>
        <p className="text-muted-foreground">
          {t('needAccount')}{" "}
          <Button variant="link" className="text-primary p-0 h-auto" asChild>
            <Link href="/contact-support">{t('contactSupport')}</Link> {/* Add to JSON and create page */}
          </Button>
        </p>
      </CardFooter>
    </Card>
  );
}
