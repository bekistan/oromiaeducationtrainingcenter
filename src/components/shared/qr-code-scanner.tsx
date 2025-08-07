
"use client";

import React from 'react';
import { QrScanner } from '@yudiel/react-qr-scanner';

interface QRCodeScannerProps {
  onScan: (result: string | null) => void;
  onError: (error: any) => void;
}

export const QRCodeScanner: React.FC<QRCodeScannerProps> = ({ onScan, onError }) => {
  return (
    <QrScanner
        onDecode={onScan}
        onError={onError}
        containerStyle={{ width: '100%', height: '100%', paddingTop: 0 }}
        videoStyle={{ width: '100%', height: '100%', objectFit: 'cover' }}
    />
  );
};
