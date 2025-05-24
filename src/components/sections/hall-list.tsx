"use client";

import type { Hall } from "@/types";
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import Image from "next/image";
import { Presentation, Users, DollarSign, Utensils, Coffee, CheckCircle, XCircle } from "lucide-react";
import { useLanguage } from "@/hooks/use-language";
import { Badge } from "@/components/ui/badge";
import Link from "next/link";
import { PLACEHOLDER_THUMBNAIL_SIZE } from "@/constants";

interface HallListProps {
  halls: Hall[];
}

export function HallList({ halls }: HallListProps) {
  const { t } = useLanguage();

  if (!halls || halls.length === 0) {
    return <p className="text-center text-lg text-muted-foreground py-10">{t('noHallsAvailable')}</p>; // Add 'noHallsAvailable' to JSON
  }
  
  return (
    <div className="grid grid-cols-1 gap-6 md:grid-cols-2 lg:grid-cols-3">
      {halls.map((hall) => (
        <Card key={hall.id} className="flex flex-col overflow-hidden shadow-lg hover:shadow-xl transition-shadow duration-300">
          <div className="relative w-full h-56">
            <Image
              src={hall.images?.[0] || `https://placehold.co/${PLACEHOLDER_THUMBNAIL_SIZE}.png`}
              alt={hall.name}
              layout="fill"
              objectFit="cover"
              data-ai-hint="meeting hall interior"
            />
            <Badge 
              variant={hall.isAvailable ? "default" : "destructive"} 
              className="absolute top-2 right-2"
              style={hall.isAvailable ? {} : { backgroundColor: 'hsl(var(--destructive))', color: 'hsl(var(--destructive-foreground))' }}
            >
              {hall.isAvailable ? t('available') : t('unavailable')}
            </Badge>
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
             <div className="flex items-center text-sm text-muted-foreground mt-3">
              {hall.isAvailable ? (
                <CheckCircle className="w-4 h-4 mr-1 text-green-500" />
              ) : (
                <XCircle className="w-4 h-4 mr-1 text-red-500" />
              )}
              {hall.isAvailable ? t('available') : t('unavailable')}
            </div>
          </CardContent>
          <CardFooter className="p-4">
             <Link href={`/halls/${hall.id}/book`} className="w-full" passHref>
                <Button className="w-full" disabled={!hall.isAvailable}>
                  {t('bookNow')}
                </Button>
            </Link>
          </CardFooter>
        </Card>
      ))}
    </div>
  );
}
