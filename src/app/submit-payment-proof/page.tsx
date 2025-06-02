
"use client";

// This page is no longer directly used in the primary booking flow
// as payment proof submission is now handled via Telegram instructions
// on the payment-details page.
// Keeping the file but returning null to avoid breaking any direct links
// and to signify its deprecation.
// In a future cleanup, this file could be removed.

import { PublicLayout } from "@/components/layout/public-layout";
import { useLanguage } from "@/hooks/use-language";
import { AlertCircle } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { useRouter } from "next/navigation";

export default function DeprecatedSubmitPaymentProofPage() {
  const { t } = useLanguage();
  const router = useRouter();

  return (
    <PublicLayout>
      <div className="container mx-auto py-12 px-4 flex justify-center items-center min-h-[calc(100vh-8rem)]">
         <Card className="w-full max-w-md shadow-xl text-center">
            <CardHeader>
              <AlertCircle className="w-12 h-12 text-muted-foreground mx-auto mb-4" />
              <CardTitle className="text-xl text-muted-foreground">{t('pageNoLongerInUseTitle')}</CardTitle>
            </CardHeader>
            <CardContent>
              <p className="mb-4">{t('pageNoLongerInUseMessage')}</p>
              <Button onClick={() => router.push('/')}>{t('goToHomepage')}</Button>
            </CardContent>
          </Card>
      </div>
    </PublicLayout>
  );
}
