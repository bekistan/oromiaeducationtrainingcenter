'use client';

import React, { useState, useEffect } from 'react';
import { Dialog, DialogContent } from '@/components/ui/dialog';
import Image from 'next/image';
import { Button } from '@/components/ui/button';
import { ChevronLeft, ChevronRight, X } from 'lucide-react';

interface ImageViewerProps {
  images: { src: string; title: string }[];
  startIndex?: number;
  isOpen: boolean;
  onClose: () => void;
}

export function ImageViewer({ images, startIndex = 0, isOpen, onClose }: ImageViewerProps) {
  const [currentIndex, setCurrentIndex] = useState(startIndex);

  useEffect(() => {
    setCurrentIndex(startIndex);
  }, [startIndex, isOpen]);

  const goToPrevious = (e: React.MouseEvent) => {
    e.stopPropagation();
    const isFirstSlide = currentIndex === 0;
    const newIndex = isFirstSlide ? images.length - 1 : currentIndex - 1;
    setCurrentIndex(newIndex);
  };

  const goToNext = (e: React.MouseEvent) => {
    e.stopPropagation();
    const isLastSlide = currentIndex === images.length - 1;
    const newIndex = isLastSlide ? 0 : currentIndex + 1;
    setCurrentIndex(newIndex);
  };

  useEffect(() => {
    const handleKeyDown = (event: KeyboardEvent) => {
      if (!isOpen) return;
      if (event.key === 'ArrowRight') {
        goToNext(event as any);
      } else if (event.key === 'ArrowLeft') {
        goToPrevious(event as any);
      } else if (event.key === 'Escape') {
        onClose();
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => {
      window.removeEventListener('keydown', handleKeyDown);
    };
  }, [isOpen, currentIndex, images.length, onClose]);
  
  if (!images || images.length === 0 || !isOpen) {
    return null;
  }

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="bg-black/80 backdrop-blur-sm border-none p-0 w-screen h-screen max-w-none max-h-none flex items-center justify-center">
        <div className="relative w-full h-full flex items-center justify-center" onClick={onClose}>
          {/* Close Button */}
          <Button
            variant="ghost"
            size="icon"
            className="absolute top-4 right-4 z-50 text-white hover:bg-white/20 hover:text-white"
            onClick={onClose}
          >
            <X className="h-8 w-8" />
          </Button>

          {/* Previous Button */}
          {images.length > 1 && (
            <Button
              variant="ghost"
              size="icon"
              className="absolute left-4 top-1/2 -translate-y-1/2 z-50 text-white hover:bg-white/20 hover:text-white h-12 w-12 rounded-full"
              onClick={goToPrevious}
            >
              <ChevronLeft className="h-10 w-10" />
            </Button>
          )}

          {/* Image and Title */}
          <div className="flex flex-col items-center justify-center w-full h-full p-16" onClick={(e) => e.stopPropagation()}>
            <div className="relative w-full h-full">
              <Image
                src={images[currentIndex].src}
                alt={images[currentIndex].title}
                fill
                className="object-contain"
              />
            </div>
             <h3 className="text-white text-lg font-semibold mt-4 bg-black/50 px-4 py-2 rounded-lg">
                {images[currentIndex].title}
            </h3>
          </div>

          {/* Next Button */}
          {images.length > 1 && (
            <Button
              variant="ghost"
              size="icon"
              className="absolute right-4 top-1/2 -translate-y-1/2 z-50 text-white hover:bg-white/20 hover:text-white h-12 w-12 rounded-full"
              onClick={goToNext}
            >
              <ChevronRight className="h-10 w-10" />
            </Button>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}
