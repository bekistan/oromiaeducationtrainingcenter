"use client";

import { PublicLayout } from "@/components/layout/public-layout";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { useLanguage } from "@/hooks/use-language";
import { CreditCard } from "lucide-react";

export default function ChapaPaymentPage() {
  const { t } = useLanguage();

  // Dummy data, replace with actual booking/order details
  const bookingDetails = {
    item: "Dormitory Room 101A (3 nights)",
    amount: 1500, // ETB
  };

  const handlePayment = () => {
    // This is where Chapa SDK integration would happen
    alert("Redirecting to Chapa... (This is a placeholder)");
    // Example: window.location.href = 'chapa_payment_url';
  };

  return (
    <PublicLayout>
      <div className="container mx-auto py-12 px-4 flex justify-center items-center min-h-[calc(100vh-8rem)]">
        <Card className="w-full max-w-md shadow-xl">
          <CardHeader className="text-center">
            <div className="mx-auto bg-primary/10 p-3 rounded-full w-fit mb-4">
             <CreditCard className="w-10 h-10 text-primary" />
            </div>
            <CardTitle className="text-2xl">{t('chapaPaymentTitle')}</CardTitle>
            <CardDescription>{t('chapaPaymentDescription')}</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-4 mb-6">
              <div className="flex justify-between">
                <span className="font-medium">{t('item')}:</span>
                <span>{bookingDetails.item}</span>
              </div>
              <div className="flex justify-between">
                <span className="font-medium">{t('totalAmount')}:</span>
                <span className="font-semibold text-primary">{bookingDetails.amount} ETB</span>
              </div>
            </div>
            <Button className="w-full" onClick={handlePayment}>
              {t('payWithChapa')}
            </Button>
          </CardContent>
        </Card>
      </div>
    </PublicLayout>
  );
}
