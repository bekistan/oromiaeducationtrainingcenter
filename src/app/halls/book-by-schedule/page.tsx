
"use client";

import React from 'react';
import { PublicLayout } from "@/components/layout/public-layout";
import { useLanguage } from "@/hooks/use-language";
import { useAuth } from "@/hooks/use-auth";
import { useRouter } from 'next/navigation';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Loader2, AlertCircle } from 'lucide-react';
import { AdvancedBookingForm } from '@/components/sections/advanced-booking-form';

export default function BookBySchedulePage() {
    const { t } = useLanguage();
    const { user, loading: authLoading } = useAuth();
    const router = useRouter();

    if (authLoading) {
        return (
          <PublicLayout>
            <div className="container mx-auto py-8 px-4 text-center flex flex-col items-center justify-center min-h-[calc(100vh-12rem)]">
              <Loader2 className="h-12 w-12 animate-spin text-primary mb-4" />
              <p>{t('loadingPage')}</p>
            </div>
          </PublicLayout>
        );
    }
    
    if (!user || user.role !== 'company_representative') {
        return (
         <PublicLayout>
           <div className="container mx-auto py-12 px-4 flex justify-center items-center min-h-[calc(100vh-8rem)]">
               <Card className="w-full max-w-md shadow-xl">
                   <CardHeader className="text-center">
                       <AlertCircle className="w-12 h-12 text-destructive mx-auto mb-4" />
                       <CardTitle className="text-2xl text-destructive">{t('accessDenied')}</CardTitle>
                   </CardHeader>
                   <CardContent className="text-center">
                       <p className="mb-4">{t('mustBeLoggedInAsCompanyToBookFacility')}</p>
                       <Button onClick={() => router.push(`/auth/login?redirect=/halls/book-by-schedule`)}>{t('login')}</Button>
                   </CardContent>
               </Card>
           </div>
         </PublicLayout>
       );
    }

    if (user.approvalStatus !== 'approved') {
        return (
           <PublicLayout>
             <Card className="w-full max-w-2xl mx-auto my-8 shadow-xl">
               <CardHeader>
                 <CardTitle className="text-2xl text-center text-yellow-600 flex items-center justify-center">
                   <AlertCircle className="mr-2 h-8 w-8" /> {t('accountPendingApprovalTitle')}
                 </CardTitle>
               </CardHeader>
               <CardContent className="text-center">
                 <p>{t('accountPendingApprovalBookFacility')}</p>
                 <Button onClick={() => router.push('/company/dashboard')} className="mt-4">
                   {t('backToCompanyDashboard')}
                 </Button>
               </CardContent>
             </Card>
           </PublicLayout>
        );
    }

    return (
        <PublicLayout>
            <div className="container mx-auto py-8 px-4">
                <AdvancedBookingForm />
            </div>
        </PublicLayout>
    );
}
