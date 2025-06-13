
"use client";

import type { Hall } from "@/types";
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import Image from "next/image";
import { Users, DollarSign, Utensils, Coffee, CheckSquare, Square } from "lucide-react";
import { useLanguage } from "@/hooks/use-language";
import { useAuth } from "@/hooks/use-auth";
// Removed Badge import as it's no longer used for top-right availability
import Link from "next/link";
import { useRouter } from "next/navigation";
import { PLACEHOLDER_THUMBNAIL_SIZE } from "@/constants";
import React from "react";

interface HallListProps {
  halls: Hall[];
  selectable?: boolean;
  selectedItems?: Hall[];
  onSelectionChange?: (selected: Hall[]) => void;
}

export function HallList({ halls, selectable = false, selectedItems = [], onSelectionChange }: HallListProps) {
  const { t } = useLanguage();
  const { user, loading } = useAuth();
  const router = useRouter();

  const handleSelect = (hall: Hall) => {
    if (!selectable || !onSelectionChange) return;
    const isSelected = selectedItems.some(item => item.id === hall.id);
    if (isSelected) {
      onSelectionChange(selectedItems.filter(item => item.id !== hall.id));
    } else {
      onSelectionChange([...selectedItems, hall]);
    }
  };

  const handleBookNowClick = (hallId: string) => {
    if (loading) return;

    // Availability for individual booking is now primarily handled by the parent page filtering
    // or the individual booking page's date selection.
    // The `hall.isAvailable` (admin-set) is still relevant for the booking page itself.
    const hall = halls.find(h => h.id === hallId);
    if (!hall || !hall.isAvailable) {
        // This alert might be redundant if the list is already filtered by availability,
        // but kept as a fallback for direct navigation or edge cases.
        alert(t('itemNotAvailableError', { itemName: hall?.name || t('thisItem') }));
        return;
    }

    if (!user || user.role !== 'company_representative') {
      alert(t('loginAsCompanyToBook'));
      router.push(`/auth/login?redirect=/halls/${hallId}/book`);
      return;
    }
    router.push(`/halls/${hallId}/book`);
  };

  if (!halls || halls.length === 0) {
    return <p className="text-center text-lg text-muted-foreground py-10">{t('noItemsAvailable')}</p>;
  }
  
  return (
    <div className="grid grid-cols-1 gap-6 md:grid-cols-2 lg:grid-cols-3">
      {halls.map((hall) => {
        const isSelected = selectable && selectedItems.some(item => item.id === hall.id);
        return (
          <Card 
            key={hall.id} 
            className={`flex flex-col overflow-hidden shadow-lg hover:shadow-xl transition-shadow duration-300 ${selectable ? 'cursor-pointer' : ''} ${isSelected ? 'ring-2 ring-primary' : ''}`}
            onClick={selectable ? () => handleSelect(hall) : undefined}
          >
            <div className="relative w-full h-56">
              <Image
                src={hall.images?.[0] || `https://placehold.co/${PLACEHOLDER_THUMBNAIL_SIZE}.png`}
                alt={hall.name}
                fill
                style={{ objectFit: 'cover' }}
                sizes="(max-width: 768px) 100vw, (max-width: 1200px) 50vw, 33vw"
                data-ai-hint={hall.dataAiHint || "meeting space"}
              />
              {/* Removed the Badge component from here */}
              {selectable && (
                <div className="absolute top-2 left-2 bg-background/70 p-1 rounded-md">
                  {isSelected ? <CheckSquare className="w-6 h-6 text-primary" /> : <Square className="w-6 h-6 text-muted-foreground" />}
                </div>
              )}
            </div>
            <CardHeader className="p-4">
              <CardTitle className="text-xl">{hall.name}</CardTitle>
              <CardDescription className="flex items-center text-sm text-muted-foreground mt-1">
                <Users className="w-4 h-4 mr-1" /> {t('capacity')}: {hall.capacity}
              </CardDescription>
            </CardHeader>
            <CardContent className="p-4 flex-grow">
              {hall.description && <p className="text-sm text-foreground/80 mb-3">{hall.description}</p>}
              <div className="space-y-2 text-sm">
                <div className="flex items-center">
                  <DollarSign className="w-4 h-4 mr-2 text-primary" />
                  <span>{t('rentalCost')}: {hall.rentalCost} ETB</span>
                </div>
                {hall.lunchServiceCost && (
                  <div className="flex items-center">
                    <Utensils className="w-4 h-4 mr-2 text-primary" />
                    <span>{t('lunchService')}: {hall.lunchServiceCost} ETB / {t('perPerson')}</span>
                  </div>
                )}
                {hall.refreshmentServiceCost && (
                  <div className="flex items-center">
                    <Coffee className="w-4 h-4 mr-2 text-primary" />
                    <span>{t('refreshmentService')}: {hall.refreshmentServiceCost} ETB / {t('perPerson')}</span>
                  </div>
                )}
              </div>
            </CardContent>
            <CardFooter className="p-4">
               {!selectable && (
                  <Button 
                    className="w-full" 
                    disabled={!hall.isAvailable || loading} 
                    onClick={() => handleBookNowClick(hall.id)}
                  >
                    {loading ? t('loading') : t('bookNow')}
                  </Button>
               )}
            </CardFooter>
          </Card>
        )
      })}
    </div>
  );
}
