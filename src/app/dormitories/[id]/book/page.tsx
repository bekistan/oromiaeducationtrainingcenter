
"use client";

import { PublicLayout } from "@/components/layout/public-layout";
import { BookingForm } from "@/components/sections/booking-form";
import { useLanguage } from "@/hooks/use-language";
import { useParams } from 'next/navigation'; 
import { BedDouble } from "lucide-react";
import type { BookingItem, Dormitory } from "@/types";

// In a real app, you'd fetch dormitory details based on ID
// Placeholder data
const sampleDormitories: Dormitory[] = [
  { id: "d001", floor: 1, roomNumber: "101A", capacity: 2, isAvailable: true, pricePerDay: 500, images: [`https://placehold.co/300x200.png?text=Room+101A`]},
  { id: "d002", floor: 1, roomNumber: "102B", capacity: 4, isAvailable: false, pricePerDay: 700, images: [`https://placehold.co/300x200.png?text=Room+102B`]},
  { id: "d003", floor: 2, roomNumber: "201A", capacity: 2, isAvailable: true, pricePerDay: 550, images: [`https://placehold.co/300x200.png?text=Room+201A`]},
  { id: "d004", floor: 2, roomNumber: "205C", capacity: 3, isAvailable: true, pricePerDay: 600, images: [`https://placehold.co/300x200.png?text=Room+205C`]},
  { id: "d005", floor: 3, roomNumber: "301A", capacity: 1, isAvailable: true, pricePerDay: 400, images: [`https://placehold.co/300x200.png?text=Room+301A`]},
];

const getDormitoryDetails = (id: string): BookingItem | null => {
  const foundDorm = sampleDormitories.find(d => d.id === id);
  if (foundDorm) {
    return { 
      id: foundDorm.id, 
      name: `${foundDorm.roomNumber} (Floor ${foundDorm.floor})`, 
      itemType: "dormitory", 
      pricePerDay: foundDorm.pricePerDay 
    };
  }
  console.warn(`Dormitory with ID ${id} not found in placeholder data.`);
  return null;
};

export default function BookDormitoryPage() {
  const { t } = useLanguage();
  const params = useParams();
  const dormitoryId = params.id as string;
  
  const dormitoryDetails = getDormitoryDetails(dormitoryId);

  if (!dormitoryDetails) {
    return (
      <PublicLayout>
        <div className="container mx-auto py-8 px-4 text-center">
          <h1 className="text-2xl text-destructive">{t('itemNotFound')}</h1>
        </div>
      </PublicLayout>
    );
  }

  return (
    <PublicLayout>
      <div className="container mx-auto py-8 px-4">
        <div className="flex flex-col items-center mb-8">
          <BedDouble className="w-12 h-12 text-primary mb-2" />
          <h1 className="text-3xl font-bold text-primary text-center">
            {t('bookDormitory')}
          </h1>
          <p className="text-muted-foreground text-center max-w-md">{t('fillFormToBookDormitory')}</p>
        </div>
        <BookingForm bookingCategory="dormitory" itemsToBook={[dormitoryDetails]} />
      </div>
    </PublicLayout>
  );
}
