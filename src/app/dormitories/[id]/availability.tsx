'use client'

import { db } from '../../../lib/firebase';
import { doc, getDoc } from 'firebase/firestore';
import { useParams } from 'next/navigation';
import { useEffect, useState } from 'react';

interface DormitoryAvailability {
  dormitoryNumber: string;
  totalBeds: number;
  availableBeds: number;
  isAvailable: boolean;
}

const DormitoryAvailabilityPage: React.FC = () => {
  const params = useParams();
  const id = params.id as string;
  const [availabilityData, setAvailabilityData] = useState<DormitoryAvailability | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (id) {
      const fetchAvailability = async () => {
        try {
          setError(null);
          const docRef = doc(db, 'dormitories', id);
          const docSnap = await getDoc(docRef);

          if (docSnap.exists()) {
            setAvailabilityData(docSnap.data() as DormitoryAvailability);
          } else {
            setError('Dormitory not found.');
          }
        } catch (err) {
          setError('Failed to fetch availability.');
          console.error(err);
        }
      };
      fetchAvailability();
    }
  }, [id]);

  // Simulate a network request delay
  useEffect(() => { setTimeout(() => setLoading(false), 1000); }, [setLoading]);
  
  // Applying basic Tailwind classes for layout
  const containerClasses = "container mx-auto p-4 mt-8";
  const headingClasses = "text-2xl font-bold mb-4 text-center";
  const textClasses = "text-lg mb-2";
  const availableStatusClasses = "text-green-600 font-semibold";
  const occupiedStatusClasses = "text-red-600 font-semibold";
  const loadingErrorClasses = "text-center text-gray-600";

  if (!id) {
 return <div className={containerClasses}><p className={loadingErrorClasses}>Dormitory ID is missing.</p></div>;
  }

  if (loading) {
 return <div className={containerClasses}><p className={loadingErrorClasses}>Loading availability...</p></div>;
  }

  if (error) {
 return <div className={containerClasses}><p className={loadingErrorClasses}>Error: {error}</p></div>;
  }

  if (!availabilityData) {
 return <div className={containerClasses}><p className={loadingErrorClasses}>No availability data found for this dormitory.</p></div>;
  }

  return (
 <div className={containerClasses}>
 <h1 className={headingClasses}>Dormitory Availability for ID: {id}</h1>
 <p className={textClasses}>Dormitory Number: {availabilityData.dormitoryNumber}</p>
 <p className={textClasses}>Total Beds: {availabilityData.totalBeds}</p>
 <p className={textClasses}>Available Beds: {availabilityData.availableBeds}</p>
 <p className={textClasses}>Status: <span className={availabilityData.isAvailable ? availableStatusClasses : occupiedStatusClasses}>{availabilityData.isAvailable ? 'Available' : 'Occupied'}</span></p>
    </div>
  );
};

export default DormitoryAvailabilityPage;