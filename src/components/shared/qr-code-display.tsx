
"use client";

import React, { useEffect, useState } from 'react';
import QRCodeReact from 'qrcode.react';
import { useLanguage } from '@/hooks/use-language';
import { Loader2 } from 'lucide-react';

interface QRCodeDisplayProps {
  value: string;
  size?: number;
  level?: 'L' | 'M' | 'Q' | 'H';
  bgColor?: string;
  fgColor?: string;
}

export function QRCodeDisplay({
  value,
  size = 128,
  level = 'M',
  bgColor = '#FFFFFF', // White background
  fgColor = '#000000', // Black foreground
}: QRCodeDisplayProps) {
  const { t } = useLanguage();
  const [isMounted, setIsMounted] = useState(false);

  useEffect(() => {
    setIsMounted(true);
  }, []);

  if (!isMounted) {
    return (
      <div style={{ width: size, height: size }} className="flex items-center justify-center bg-muted rounded-md">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
        <span className="sr-only">{t('loadingQrCode')}</span>
      </div>
    );
  }

  return (
    <QRCodeReact
      value={value}
      size={size}
      level={level}
      bgColor={bgColor}
      fgColor={fgColor}
      renderAs="svg" // SVG is generally better for scaling and sharpness
      className="rounded-md"
    />
  );
}
