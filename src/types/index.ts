
export type Locale = 'en' | 'om' | 'am';

export type Translations = {
  [key: string]: string | Translations;
};

export interface Dormitory {
  id: string;
  floor: number;
  roomNumber: string;
  capacity: number;
  isAvailable: boolean;
  pricePerDay: number;
  images?: string[];
  dataAiHint?: string;
}

export interface Hall {
  id:string;
  name: string;
  capacity: number;
  isAvailable: boolean;
  rentalCost: number;
  lunchServiceCost?: number;
  refreshmentServiceCost?: number;
  images?: string[];
  description?: string;
  dataAiHint?: string;
  itemType: 'hall' | 'section';
}

export interface BookingServiceDetails {
  lunch?: 'level1' | 'level2';
  refreshment?: 'level1' | 'level2';
}

export type BookingItem = {
  id: string;
  name: string;
  itemType: 'dormitory' | 'hall' | 'section';
  pricePerDay?: number;
  rentalCost?: number;
};

export interface Booking {
  id: string;
  bookingCategory: 'dormitory' | 'facility';
  items: BookingItem[];
  userId?: string;
  companyId?: string;
  guestName?: string;
  guestIdScanUrl?: string;
  guestEmployer?: string;
  companyName?: string;
  contactPerson?: string;
  email?: string;
  phone?: string;
  startDate: string | import('firebase/firestore').Timestamp; // Allow Timestamp for writing
  endDate: string | import('firebase/firestore').Timestamp;   // Allow Timestamp for writing
  numberOfAttendees?: number;
  serviceDetails?: BookingServiceDetails;
  totalCost: number;
  paymentStatus: 'pending' | 'paid' | 'failed';
  approvalStatus: 'pending' | 'approved' | 'rejected';
  bookedAt: string | import('firebase/firestore').Timestamp; // Allow Timestamp for writing
}

export interface User {
  id: string;
  email: string;
  role: 'admin' | 'superadmin' | 'company_representative' | 'individual';
  name?: string;
  companyId?: string;
  companyName?: string;
  approvalStatus?: 'pending' | 'approved' | 'rejected'; // For company users
  phone?: string;
  createdAt?: string | import('firebase/firestore').FieldValue; // FieldValue for serverTimestamp
}

export interface CompanyProfile { // This might be merged or related to User type for companies
  id: string;
  name: string;
  contactPerson: string;
  email: string;
  phone: string;
  approvalStatus: 'pending' | 'approved' | 'rejected';
}

export interface NavItem {
  labelKey: string;
  href: string;
  adminOnly?: boolean;
  authRequired?: boolean;
  roles?: User['role'][]; // Specify which roles can see this nav item
}
