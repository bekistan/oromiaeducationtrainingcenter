
"use client";

import React, { useState } from 'react';
import { PublicLayout } from "@/components/layout/public-layout";
import { HallList } from "@/components/sections/hall-list";
import type { Hall } from "@/types";
import { useLanguage } from "@/hooks/use-language";
import { useAuth } from "@/hooks/use-auth";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Button } from "@/components/ui/button";
import { Building, SquareStack, CalendarPlus } from "lucide-react";
import { useRouter } from "next/navigation";

// Placeholder data - replace with API call
const sampleHalls: Hall[] = [
  { 
    id: "h001", 
    name: "Grand Meeting Hall A", 
    itemType: "hall",
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
    itemType: "section",
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
    itemType: "section",
    capacity: 20, 
    isAvailable: true, 
    rentalCost: 1500,
    description: "Flexible space for collaborative workshops.",
    images: [`https://placehold.co/600x400.png`],
    dataAiHint: "workshop space"
  },
   { 
    id: "s003", 
    name: "Seminar Room Gamma", 
    itemType: "section",
    capacity: 50, 
    isAvailable: false, 
    rentalCost: 2500,
    refreshmentServiceCost: 90,
    lunchServiceCost: 250,
    description: "Well-equipped room for seminars and presentations.",
    images: [`https://placehold.co/600x400.png`],
    dataAiHint: "seminar room"
  },
];


export default function HallsAndSectionsPage() {
  const { t } = useLanguage();
  const { user, loading } = useAuth();
  const router = useRouter();
  const [selectedSections, setSelectedSections] = useState<Hall[]>([]);

  const handleSelectionChange = (newSelection: Hall[]) => {
    setSelectedSections(newSelection);
  };

  const handleBookSelectedSections = () => {
    if (loading) return;
    if (!user || user.role !== 'company_representative') {
      alert(t('loginAsCompanyToBook')); // Add to JSON
      // router.push('/auth/login?redirect=/halls/book-multiple'); // Example redirect
      return;
    }
    if (selectedSections.length === 0) {
      alert(t('pleaseSelectSectionsToBook')); // Add to JSON
      return;
    }

    const itemsQuery = selectedSections
      .map(s => `item=${encodeURIComponent(s.id)}:${encodeURIComponent(s.name)}:${encodeURIComponent(s.itemType)}`)
      .join('&');
    
    router.push(`/halls/book-multiple?${itemsQuery}`);
  };


  return (
    <PublicLayout>
      <div className="container mx-auto py-12 px-4">
        <h1 className="text-3xl font-bold text-primary mb-8 text-center">
          {t('viewAvailableHallsAndSections')}
        </h1>
        
        <Tabs defaultValue="halls" className="w-full">
          <TabsList className="grid w-full grid-cols-2 md:w-1/2 mx-auto mb-8">
            <TabsTrigger value="halls">
              <Building className="mr-2 h-5 w-5" /> {t('halls')}
            </TabsTrigger>
            <TabsTrigger value="sections">
              <SquareStack className="mr-2 h-5 w-5" /> {t('sections')}
            </TabsTrigger>
          </TabsList>
          <TabsContent value="halls">
            <h2 className="text-2xl font-semibold text-foreground mb-6 text-center">{t('ourAvailableHall')}</h2>
            <HallList halls={sampleHalls} />
          </TabsContent>
          <TabsContent value="sections">
            <div className="flex flex-col items-center">
              <h2 className="text-2xl font-semibold text-foreground mb-6 text-center">{t('ourAvailableSections')}</h2>
              {selectedSections.length > 0 && (
                <Button onClick={handleBookSelectedSections} className="mb-6" disabled={loading}>
                  <CalendarPlus className="mr-2 h-5 w-5" /> 
                  {loading ? t('loading') : `${t('bookSelected')} (${selectedSections.length})`} {/* Add 'bookSelected' to JSON */}
                </Button>
              )}
              <HallList 
                halls={sampleSections} 
                selectable={true}
                selectedItems={selectedSections}
                onSelectionChange={handleSelectionChange}
              />
            </div>
          </TabsContent>
        </Tabs>
      </div>
    </PublicLayout>
  );
}

