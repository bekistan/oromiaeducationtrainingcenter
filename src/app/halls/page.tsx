"use client";

import { PublicLayout } from "@/components/layout/public-layout";
import { HallList } from "@/components/sections/hall-list";
import type { Hall } from "@/types";
import { useLanguage } from "@/hooks/use-language";

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
    images: [`https://placehold.co/300x200.png?text=Hall+A`]
  },
  { 
    id: "h002", 
    name: "Training Section Alpha", 
    capacity: 30, 
    isAvailable: true, 
    rentalCost: 2000, 
    refreshmentServiceCost: 80,
    description: "Ideal for workshops and training sessions.",
    images: [`https://placehold.co/300x200.png?text=Section+Alpha`]
  },
  { 
    id: "h003", 
    name: "Small Meeting Room B", 
    capacity: 15, 
    isAvailable: false, 
    rentalCost: 1000,
    description: "Comfortable room for small team meetings.",
    images: [`https://placehold.co/300x200.png?text=Room+B`]
  },
];

export default function HallsPage() {
  const { t } = useLanguage();

  // In a real app, fetch halls here
  // const [halls, setHalls] = useState<Hall[]>([]);
  // useEffect(() => { /* fetch logic */ setHalls(sampleHalls); }, []);
  
  return (
    <PublicLayout>
      <div className="container mx-auto py-12 px-4">
        <h1 className="text-3xl font-bold text-primary mb-8 text-center">
          {t('viewAvailableHalls')}
        </h1>
        <HallList halls={sampleHalls} />
      </div>
    </PublicLayout>
  );
}
