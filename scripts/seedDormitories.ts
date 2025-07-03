
import * as dotenv from 'dotenv';
import * as path from 'path';
dotenv.config({ path: path.resolve(process.cwd(), '.env.local') });

import { db } from '../src/lib/firebase'; // Adjust the import path if necessary
import { collection, addDoc } from 'firebase/firestore';

const seedDormitories = async () => {
  if (!db) {
    console.error("Firebase is not configured. Aborting seed. Ensure your .env.local file is correctly set up in the project root.");
    return;
  }
  try {
    const dormitoriesRef = collection(db, 'dormitories');

    const sampleDormitories = [
      { dormitoryNumber: '101', totalBeds: 4, availableBeds: 2, isAvailable: true },
      { dormitoryNumber: '102', totalBeds: 4, availableBeds: 0, isAvailable: false },
      { dormitoryNumber: '103', totalBeds: 4, availableBeds: 4, isAvailable: true },
      { dormitoryNumber: '201', totalBeds: 4, availableBeds: 1, isAvailable: true },
      { dormitoryNumber: '202', totalBeds: 4, availableBeds: 0, isAvailable: false },
    ];

    console.log('Seeding dormitory data...');

    for (const dormitory of sampleDormitories) {
      await addDoc(dormitoriesRef, dormitory);
      console.log(`Added dormitory ${dormitory.dormitoryNumber}`);
    }

    console.log('Dormitory data seeding complete.');
  } catch (error) {
    console.error('Error seeding dormitory data:', error);
  }
};

seedDormitories();
