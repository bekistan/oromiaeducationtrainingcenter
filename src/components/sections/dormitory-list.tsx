
"use client";

import type { Dormitory } from "@/types";
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import Image from "next/image";
import { BedDouble, Users, DollarSign, CheckCircle, XCircle } from "lucide-react";
import { useLanguage } from "@/hooks/use-language";
import { Badge } from "@/components/ui/badge";
import Link from "next/link";
import { PLACEHOLDER_THUMBNAIL_SIZE } from "@/constants";

interface DormitoryListProps {
  dormitories: Dormitory[];
}

export function DormitoryList({ dormitories }: DormitoryListProps) {
  const { t } = useLanguage();

  if (!dormitories || dormitories.length === 0) {
    return <p className="text-center text-lg text-muted-foreground py-10">{t('noDormitoriesAvailable')}</p>; // Add 'noDormitoriesAvailable' to JSON
  }

  return (
    <div className="grid grid-cols-1 gap-6 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
      {dormitories.map((dorm) => (
        <Card key={dorm.id} className="flex flex-col overflow-hidden shadow-lg hover:shadow-xl transition-shadow duration-300">
          <div className="relative w-full h-48">
            <Image
              src={dorm.images?.[0] || `https://placehold.co/${PLACEHOLDER_THUMBNAIL_SIZE}.png`}
              alt={`${t('dormitory')} ${dorm.roomNumber}`}
              fill
              style={{ objectFit: 'cover' }}
              sizes="(max-width: 640px) 100vw, (max-width: 768px) 50vw, (max-width: 1024px) 33vw, 25vw"
              data-ai-hint={dorm.dataAiHint || "dormitory room"}
            />
            <Badge 
              variant={dorm.isAvailable ? "default" : "destructive"} 
              className="absolute top-2 right-2"
              style={dorm.isAvailable ? {} : { backgroundColor: 'hsl(var(--destructive))', color: 'hsl(var(--destructive-foreground))' }}
            >
              {dorm.isAvailable ? t('available') : t('unavailable')}
            </Badge>
          </div>
          <CardHeader className="p-4">
            <CardTitle className="text-xl">
              {t('floor')} {dorm.floor} - {t('roomNumber')} {dorm.roomNumber}
            </CardTitle>
            <CardDescription className="flex items-center text-sm text-muted-foreground mt-1">
              <Users className="w-4 h-4 mr-1" /> {dorm.capacity} {t('beds')} {/* Add 'beds' to JSON */}
            </CardDescription>
          </CardHeader>
          <CardContent className="p-4 flex-grow">
            <div className="flex items-center text-lg font-semibold text-primary mb-2">
              <DollarSign className="w-5 h-5 mr-1" /> {dorm.pricePerDay} ETB / {t('day')} {/* Add 'day' to JSON */}
            </div>
             <div className="flex items-center text-sm text-muted-foreground">
              {dorm.isAvailable ? (
                <CheckCircle className="w-4 h-4 mr-1 text-green-500" />
              ) : (
                <XCircle className="w-4 h-4 mr-1 text-red-500" />
              )}
              {dorm.isAvailable ? t('available') : t('unavailable')}
            </div>
          </CardContent>
          <CardFooter className="p-4">
            <Link href={`/dormitories/${dorm.id}/book`} className="w-full" passHref>
              <Button className="w-full" disabled={!dorm.isAvailable}>
                {t('bookNow')}
              </Button>
            </Link>
          </CardFooter>
        </Card>
      ))}
    </div>
  );
}
