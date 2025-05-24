"use client";

import { PublicLayout } from "@/components/layout/public-layout";
import { BookingForm } from "@/components/sections/booking-form";
import { useLanguage } from "@/hooks/use-language";
import { useParams } from 'next/navigation';
import { Presentation } from "lucide-react";

const getHallDetails = (id: string) => {
  if (id === "h001") return { name: "Grand Meeting Hall A" };
  if (id === "h002") return { name: "Training Section Alpha" };
  return { name: `Hall/Section ${id}` };
};

export default function BookHallPage() {
  const { t } = useLanguage();
  const params = useParams();
  const hallId = params.id as string;

  const hallDetails = getHallDetails(hallId);

  return (
    <PublicLayout>
      <div className="container mx-auto py-8 px-4">
        <div className="flex flex-col items-center mb-8">
          <Presentation className="w-12 h-12 text-primary mb-2" />
          <h1 className="text-3xl font-bold text-primary text-center">
            {t('bookHallOrSection')} - {hallDetails.name} {/* Add 'bookHallOrSection' to JSON */}
          </h1>
          <p className="text-muted-foreground text-center max-w-md">{t('fillFormToBookHall')}</p> {/* Add to JSON */}
        </div>
        <BookingForm type="hall" itemId={hallId} itemName={hallDetails.name} />
      </div>
    </PublicLayout>
  );
}
