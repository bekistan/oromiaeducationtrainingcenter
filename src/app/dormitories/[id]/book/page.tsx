
"use client";

import { PublicLayout } from "@/components/layout/public-layout";
import { BookingForm } from "@/components/sections/booking-form";
import { useLanguage } from "@/hooks/use-language";
import { useParams } from 'next/navigation'; 
import { BedDouble } from "lucide-react";
import type { BookingItem } from "@/types";

// In a real app, you'd fetch dormitory details based on ID
const getDormitoryDetails = (id: string): BookingItem | null => {
  // Placeholder: find from sample data or API
  if (id === "d001") return { id, name: "Room 101A", itemType: "dormitory" };
  if (id === "d003") return { id, name: "Room 201A", itemType: "dormitory" };
  // Fallback, ideally you'd have a not found mechanism
  const sampleDorms = [
    { id: "d001", name: "Room 101A", itemType: "dormitory" },
    { id: "d002", name: "Room 102B", itemType: "dormitory" },
    { id: "d003", name: "Room 201A", itemType: "dormitory" },
  ];
  const found = sampleDorms.find(d => d.id === id);
  if (found) return found;

  console.warn(`Dormitory with ID ${id} not found in placeholder data.`);
  return { id, name: `Dormitory ${id}`, itemType: "dormitory" }; // Or handle as not found
};

export default function BookDormitoryPage() {
  const { t } = useLanguage();
  const params = useParams();
  const dormitoryId = params.id as string;
  
  const dormitoryDetails = getDormitoryDetails(dormitoryId);

  if (!dormitoryDetails) {
    // Handle case where dormitory details are not found, e.g., redirect or show error
    return (
      <PublicLayout>
        <div className="container mx-auto py-8 px-4 text-center">
          <h1 className="text-2xl text-destructive">{t('itemNotFound')}</h1> {/* Add to JSON */}
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

