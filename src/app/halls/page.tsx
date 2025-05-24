
"use client";

import { PublicLayout } from "@/components/layout/public-layout";
import { HallList } from "@/components/sections/hall-list";
import type { Hall } from "@/types";
import { useLanguage } from "@/hooks/use-language";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Building, SquareStack } from "lucide-react";

// Placeholder data - replace with API call
const sampleHalls: Hall[] = [
  { 
    id: "h001", 
    name: "Grand Meeting Hall A", 
    capacity: 100, 
    isAvailable: true, 
    rentalCost: 5000, 
    lunchServiceCost: 300, 
    refreshmentServiceCost: 100,
    description: "Spacious hall perfect for conferences and large meetings.",
    images: [`https://placehold.co/600x400.png`],
    dataAiHint: "conference hall"
  },
];

const sampleSections: Hall[] = [
  { 
    id: "s001", 
    name: "Training Section Alpha", 
    capacity: 30, 
    isAvailable: true, 
    rentalCost: 2000, 
    refreshmentServiceCost: 80,
    description: "Ideal for workshops and training sessions.",
    images: [`https://placehold.co/600x400.png`],
    dataAiHint: "training room"
  },
  { 
    id: "s002", 
    name: "Workshop Area Beta", 
    capacity: 20, 
    isAvailable: true, 
    rentalCost: 1500,
    description: "Flexible space for collaborative workshops.",
    images: [`https://placehold.co/600x400.png`],
    dataAiHint: "workshop space"
  },
];


export default function HallsAndSectionsPage() {
  const { t } = useLanguage();

  return (
    <PublicLayout>
      <div className="container mx-auto py-12 px-4">
        <h1 className="text-3xl font-bold text-primary mb-8 text-center">
          {t('viewAvailableHallsAndSections')} {/* Add to JSON */}
        </h1>
        
        <Tabs defaultValue="halls" className="w-full">
          <TabsList className="grid w-full grid-cols-2 md:w-1/2 mx-auto mb-8">
            <TabsTrigger value="halls">
              <Building className="mr-2 h-5 w-5" /> {t('halls')}
            </TabsTrigger>
            <TabsTrigger value="sections">
              <SquareStack className="mr-2 h-5 w-5" /> {t('sections')} {/* Add to JSON */}
            </TabsTrigger>
          </TabsList>
          <TabsContent value="halls">
            <h2 className="text-2xl font-semibold text-foreground mb-6 text-center">{t('ourAvailableHall')}</h2> {/* Add to JSON */}
            <HallList halls={sampleHalls} />
          </TabsContent>
          <TabsContent value="sections">
            <h2 className="text-2xl font-semibold text-foreground mb-6 text-center">{t('ourAvailableSections')}</h2> {/* Add to JSON */}
            <HallList halls={sampleSections} />
          </TabsContent>
        </Tabs>
      </div>
    </PublicLayout>
  );
}
