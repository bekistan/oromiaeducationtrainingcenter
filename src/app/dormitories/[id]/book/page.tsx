"use client";

import { PublicLayout } from "@/components/layout/public-layout";
import { BookingForm } from "@/components/sections/booking-form";
import { useLanguage } from "@/hooks/use-language";
import { useParams } from 'next/navigation'; // For client components
import { BedDouble } from "lucide-react";

// In a real app, you'd fetch dormitory details based on ID
const getDormitoryDetails = (id: string) => {
  // Placeholder: find from sample data or API
  if (id === "d001") return { name: "Room 101A" };
  if (id === "d003") return { name: "Room 201A" };
  return { name: `Dormitory ${id}` };
};

export default function BookDormitoryPage() {
  const { t } = useLanguage();
  const params = useParams();
  const dormitoryId = params.id as string;
  
  // Fetch dormitory details here if needed, or pass more props to BookingForm
  const dormitoryDetails = getDormitoryDetails(dormitoryId);

  return (
    <PublicLayout>
      <div className="container mx-auto py-8 px-4">
        <div className="flex flex-col items-center mb-8">
          <BedDouble className="w-12 h-12 text-primary mb-2" />
          <h1 className="text-3xl font-bold text-primary text-center">
            {t('bookDormitory')} - {dormitoryDetails.name} {/* Add 'bookDormitory' to JSON */}
          </h1>
          <p className="text-muted-foreground text-center max-w-md">{t('fillFormToBookDormitory')}</p> {/* Add to JSON */}
        </div>
        <BookingForm type="dormitory" itemId={dormitoryId} itemName={dormitoryDetails.name} />
      </div>
    </PublicLayout>
  );
}
