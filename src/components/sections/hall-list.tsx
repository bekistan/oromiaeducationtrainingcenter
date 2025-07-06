"use client";

import type { Hall } from "@/types";
import type { DateRange } from "react-day-picker";
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import Image from "next/image";
import { Users, DollarSign, CheckSquare, Square } from "lucide-react";
import { useLanguage } from "@/hooks/use-language";
import { useAuth } from "@/hooks/use-auth";
import { useRouter } from "next/navigation";
import { PLACEHOLDER_THUMBNAIL_SIZE } from "@/constants";
import React from "react";

interface HallListProps {
  halls: Hall[];
  selectable?: boolean;
  selectedItems?: Hall[];
  onSelectionChange?: (selected: Hall[]) => void;
  selectedDateRange?: DateRange;
}

export function HallList({ halls, selectable = false, selectedItems = [], onSelectionChange, selectedDateRange }: HallListProps) {
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

    if (!selectedDateRange?.from || !selectedDateRange?.to) {
        alert(t('selectDateRangeFirst'));
        return;
    }

    const hall = halls.find(h => h.id === hallId);
    if (!hall || !hall.isAvailable) {
        alert(t('itemNotAvailableError', { itemName: hall?.name || t('thisItem') }));
        return;
    }

    if (!user || user.role !== 'company_representative') {
      const redirectUrl = `/auth/login?redirect=/halls/${hallId}/book?startDate=${selectedDateRange.from.toISOString()}&endDate=${selectedDateRange.to.toISOString()}`;
      router.push(redirectUrl);
      return;
    }

    const bookingUrl = `/halls/${hallId}/book?startDate=${selectedDateRange.from.toISOString()}&endDate=${selectedDateRange.to.toISOString()}`;
    router.push(bookingUrl);
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
                src={hall.images?.[0] || '/images/hall2.jpg'}
                alt={hall.name}
                fill
                style={{ objectFit: 'cover' }}
                sizes="(max-width: 768px) 100vw, (max-width: 1200px) 50vw, 33vw"
                data-ai-hint={hall.dataAiHint || "meeting space"}
              />
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
                  <span>{t('rentalCost')}: {hall.rentalCost ? `${hall.rentalCost} ${t('currencySymbol')}` : t('priceAvailableOnRequest')}</span>
                </div>
              </div>
            </CardContent>
            <CardFooter className="p-4">
               {!selectable && (
                  <Button 
                    className="w-full" 
                    disabled={!hall.isAvailable || loading || !selectedDateRange?.from} 
                    onClick={(e) => {
                        e.stopPropagation();
                        handleBookNowClick(hall.id);
                    }}
                    title={!selectedDateRange?.from ? t('selectDateRangeFirst') : ''}
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
