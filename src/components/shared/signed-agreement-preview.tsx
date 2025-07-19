
'use client';

import React from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Download, ExternalLink, File as FileIcon, Image as ImageIcon, X } from 'lucide-react';
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

  const handleDownload = () => {
    // This creates a link and simulates a click to trigger download
    const link = document.createElement('a');
    link.href = fileUrl;
    // The 'download' attribute suggests a filename to the browser.
    // For cross-origin URLs, this might not always work as expected due to security policies,
    // but it's the standard way to suggest a download.
    link.download = fileName || 'download';
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };
  
  const handleOpenFile = () => {
    window.open(fileUrl, '_blank');
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
                sizes="(max-width: 768px) 80vw, 50vw"
              />
            </div>
          ) : (
             <div className="text-center flex flex-col items-center justify-center gap-4 p-8">
               <FileIcon className="h-16 w-16 text-primary" />
               <p className="text-lg font-medium">{t('previewNotAvailableForFileType')}</p>
               <p className="text-sm text-muted-foreground">{t('clickToDownloadOrOpenFile')}</p>
               <Button onClick={handleOpenFile}>
                <ExternalLink className="mr-2 h-4 w-4" />
                {t('openInNewTab')}
              </Button>
            </div>
          )}
        </div>
        <DialogFooter className="mt-4 flex-row justify-between sm:justify-between items-center w-full">
           <Button onClick={handleDownload} variant="secondary">
                <Download className="mr-2 h-4 w-4" />
                {t('download')}
            </Button>
          <Button variant="outline" onClick={onClose}>
            <X className="mr-2 h-4 w-4" />
            {t('close')}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
