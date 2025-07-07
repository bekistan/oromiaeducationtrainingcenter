
'use client'

import { db } from '../../../lib/firebase';
import { doc, getDoc } from 'firebase/firestore';
import { useParams } from 'next/navigation';
import { useEffect, useState } from 'react';
import { useLanguage } from '@/hooks/use-language'; // Import useLanguage

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
  const { t } = useLanguage(); // Initialize useLanguage

  useEffect(() => {
    if (id) {
      const fetchAvailability = async () => {
        if (!db) {
          setError(t('databaseConnectionError'));
          return;
        }
        try {
          setError(null);
          const docRef = doc(db, 'dormitories', id);
          const docSnap = await getDoc(docRef);

          if (docSnap.exists()) {
            setAvailabilityData(docSnap.data() as DormitoryAvailability);
          } else {
            setError(t('dormitoryNotFound'));
          }
        } catch (err) {
          setError(t('failedToFetchAvailability'));
          console.error(err);
        }
      };
      fetchAvailability();
    }
  }, [id, t]);

  // Simulate a network request delay
  useEffect(() => { setTimeout(() => setLoading(false), 1000); }, [setLoading]);
  
  const containerClasses = "container mx-auto p-4 mt-8";
  const headingClasses = "text-2xl font-bold mb-4 text-center";
  const textClasses = "text-lg mb-2";
  const availableStatusClasses = "text-green-600 font-semibold";
  const occupiedStatusClasses = "text-red-600 font-semibold";
  const loadingErrorClasses = "text-center text-gray-600";

  if (!id) {
 return <div className={containerClasses}><p className={loadingErrorClasses}>{t('dormitoryIdMissing')}</p></div>;
  }

  if (loading) {
 return <div className={containerClasses}><p className={loadingErrorClasses}>{t('loadingAvailability')}</p></div>;
  }

  if (error) {
 return <div className={containerClasses}><p className={loadingErrorClasses}>{t('errorPrefixWithVar', { error: error })}</p></div>;
  }

  if (!availabilityData) {
 return <div className={containerClasses}><p className={loadingErrorClasses}>{t('noAvailabilityData')}</p></div>;
  }

  return (
 <div className={containerClasses}>
 <h1 className={headingClasses}>{t('dormitoryAvailabilityForId', { id: id })}</h1>
 <p className={textClasses}>{t('dormitoryNumberLabel', { number: availabilityData.dormitoryNumber })}</p>
 <p className={textClasses}>{t('totalBedsLabel', { count: availabilityData.totalBeds })}</p>
 <p className={textClasses}>{t('availableBedsLabel', { count: availabilityData.availableBeds })}</p>
 <p className={textClasses}>{t('statusLabel')} <span className={availabilityData.isAvailable ? availableStatusClasses : occupiedStatusClasses}>{availabilityData.isAvailable ? t('available') : t('occupied')}</span></p>
    </div>
  );
};

export default DormitoryAvailabilityPage;
