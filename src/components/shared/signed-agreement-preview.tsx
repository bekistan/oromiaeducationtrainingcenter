
'use client';

import React from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Download, File, Image as ImageIcon, X } from 'lucide-react';
import { useLanguage } from '@/hooks/use-language';
import Image from 'next/image';

interface SignedAgreementPreviewDialogProps {
  isOpen: boolean;
  onClose: () => void;
  fileUrl: string;
  fileName: string;
}

export function SignedAgreementPreviewDialog({ isOpen, onClose, fileUrl, fileName }: SignedAgreementPreviewDialogProps) {
  const { t } = useLanguage();
  const isImage = /\.(jpg|jpeg|png|gif|webp)$/i.test(fileName);
  const isPdf = /\.pdf$/i.test(fileName);

  const handleDownload = () => {
    const link = document.createElement('a');
    link.href = fileUrl;
    link.setAttribute('download', fileName);
    link.setAttribute('target', '_blank'); // Open in new tab as fallback
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-4xl max-h-[90vh] flex flex-col">
        <DialogHeader>
          <DialogTitle>{t('signedAgreementPreview')}</DialogTitle>
          <DialogDescription className="truncate">
            {t('file')}: {fileName}
          </DialogDescription>
        </DialogHeader>
        <div className="flex-grow min-h-0 overflow-auto flex items-center justify-center p-4 bg-muted/50 rounded-md">
          {isImage ? (
            <div className="relative w-full h-full max-h-[60vh]">
              <Image
                src={fileUrl}
                alt={t('signedAgreementPreview')}
                fill
                className="object-contain"
              />
            </div>
          ) : (
            <div className="text-center flex flex-col items-center justify-center gap-4">
              <div className="p-4 bg-primary/10 rounded-full">
                {isPdf ? <File className="h-16 w-16 text-primary" /> : <ImageIcon className="h-16 w-16 text-primary" />}
              </div>
              <p className="text-lg font-medium">{t('previewNotAvailableForFileType')}</p>
              <p className="text-sm text-muted-foreground">{t('clickToDownloadOrOpenFile')}</p>
              <Button onClick={() => window.open(fileUrl, '_blank')}>
                <Download className="mr-2 h-4 w-4" />
                {t('openOrDownloadFile')}
              </Button>
            </div>
          )}
        </div>
        <DialogFooter className="mt-4">
          <Button variant="outline" onClick={onClose}>
            <X className="mr-2 h-4 w-4" />
            {t('close')}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
