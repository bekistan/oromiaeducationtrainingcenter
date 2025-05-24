"use client";

import Link from 'next/link';
import { Button } from '@/components/ui/button';
import { useLanguage } from '@/hooks/use-language';
import { Frown } from 'lucide-react';
import { PublicLayout } from '@/components/layout/public-layout'; // Use public layout for consistency

export default function NotFound() {
  const { t } = useLanguage();

  return (
    <PublicLayout>
      <div className="flex flex-col items-center justify-center min-h-[calc(100vh-12rem)] text-center px-4">
        <Frown className="w-24 h-24 text-destructive mb-6" />
        <h1 className="text-5xl font-bold text-primary mb-4">
          404
        </h1>
        <h2 className="text-2xl font-semibold text-foreground mb-3">
          {t('pageNotFound')}
        </h2>
        <p className="text-muted-foreground mb-8 max-w-md">
          {t('pageNotFoundMessage')}
        </p>
        <Link href="/" passHref>
          <Button size="lg">{t('goToHomepage')}</Button>
        </Link>
      </div>
    </PublicLayout>
  );
}
