
"use client";

import React, { useMemo } from 'react';
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { useLanguage } from "@/hooks/use-language";
import { useAuth } from "@/hooks/use-auth";
import { Settings, ShieldAlert, FileText, Megaphone, Palette } from "lucide-react";
import { useRouter } from 'next/navigation';
import Link from 'next/link';

export default function AdminSettingsPage() {
  const { t } = useLanguage();
  const { user, loading: authLoading } = useAuth();
  const router = useRouter();

  const canAccessSettings = useMemo(() => {
    if (!user) return false;
    return user.role === 'superadmin' || (user.role === 'admin' && !user.buildingAssignment);
  }, [user]);

  if (authLoading) {
    return (
      <div className="flex justify-center items-center h-40">
        <Settings className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }
  
  if (!canAccessSettings) {
    return (
      <Card className="w-full max-w-md mx-auto my-8">
        <CardHeader>
          <CardTitle className="text-destructive flex items-center"><ShieldAlert className="mr-2"/>{t('accessDenied')}</CardTitle>
        </CardHeader>
        <CardContent>
          <p>{t('buildingAdminAccessSettingsDenied')}</p>
          <Button onClick={() => router.push('/admin/dashboard')} className="mt-4">{t('backToDashboard')}</Button>
        </CardContent>
      </Card>
    );
  }

  const settingsCards = [
    {
      titleKey: 'siteContent',
      descriptionKey: 'siteContentDescription',
      link: '/admin/settings/site-content',
      icon: <Megaphone className="mr-2 h-6 w-6 text-primary" />
    },
    {
      titleKey: 'agreementTemplate',
      descriptionKey: 'manageTheDefaultAgreement',
      link: '/admin/settings/agreement-template',
      icon: <FileText className="mr-2 h-6 w-6 text-primary" />
    },
    {
      titleKey: 'siteBrandAssets',
      descriptionKey: 'manageBrandAssetsDesc',
      link: '/admin/settings/brand-assets',
      icon: <Palette className="mr-2 h-6 w-6 text-primary" />
    }
  ];

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-3xl font-bold text-foreground">{t('manageSettings')}</h1>
      </div>
       <Card>
          <CardHeader>
              <CardTitle className="flex items-center">
                  <Settings className="mr-2 h-6 w-6 text-primary" />
                  {t('generalSettings')}
              </CardTitle>
              <CardDescription>{t('generalSettingsDescription')}</CardDescription>
          </CardHeader>
          <CardContent className="grid grid-cols-1 md:grid-cols-2 gap-4">
             {settingsCards.map(card => (
                 <Card key={card.titleKey}>
                    <CardHeader>
                        <CardTitle className="flex items-center text-lg">{card.icon} {t(card.titleKey)}</CardTitle>
                    </CardHeader>
                    <CardContent>
                        <p className="text-sm text-muted-foreground mb-4">{t(card.descriptionKey)}</p>
                         <Button asChild>
                            <Link href={card.link}>
                                {t('manage')}
                            </Link>
                        </Button>
                    </CardContent>
                 </Card>
             ))}
          </CardContent>
      </Card>
    </div>
  );
}

    