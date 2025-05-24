"use client";

import { PublicLayout } from "@/components/layout/public-layout";
import { DormitoryList } from "@/components/sections/dormitory-list";
import type { Dormitory } from "@/types";
import { useLanguage } from "@/hooks/use-language";

// Placeholder data - replace with API call
const sampleDormitories: Dormitory[] = [
  { id: "d001", floor: 1, roomNumber: "101A", capacity: 2, isAvailable: true, pricePerDay: 500, images: [`https://placehold.co/300x200.png?text=Room+101A`]},
  { id: "d002", floor: 1, roomNumber: "102B", capacity: 4, isAvailable: false, pricePerDay: 700, images: [`https://placehold.co/300x200.png?text=Room+102B`]},
  { id: "d003", floor: 2, roomNumber: "201A", capacity: 2, isAvailable: true, pricePerDay: 550, images: [`https://placehold.co/300x200.png?text=Room+201A`]},
  { id: "d004", floor: 2, roomNumber: "205C", capacity: 3, isAvailable: true, pricePerDay: 600, images: [`https://placehold.co/300x200.png?text=Room+205C`]},
  { id: "d005", floor: 3, roomNumber: "301A", capacity: 1, isAvailable: true, pricePerDay: 400, images: [`https://placehold.co/300x200.png?text=Room+301A`]},
];

export default function DormitoriesPage() {
  const { t } = useLanguage();

  // In a real app, fetch dormitories here
  // const [dormitories, setDormitories] = useState<Dormitory[]>([]);
  // useEffect(() => { /* fetch logic */ setDormitories(sampleDormitories); }, []);

  return (
    <PublicLayout>
      <div className="container mx-auto py-12 px-4">
        <h1 className="text-3xl font-bold text-primary mb-8 text-center">
          {t('viewAvailableDormitories')}
        </h1>
        <DormitoryList dormitories={sampleDormitories} />
      </div>
    </PublicLayout>
  );
}
