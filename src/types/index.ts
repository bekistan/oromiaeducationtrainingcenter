
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
  pricePerDay?: number; // For dormitories
  rentalCost?: number; // For facilities (per booking, not per day by default)
};

export type AgreementStatus = 
  | 'pending_admin_action' // Admin needs to prepare/send
  | 'sent_to_client'       // Admin has sent, awaiting client signature
  | 'signed_by_client'     // Client has signed and returned
  | 'completed';           // Agreement process finalized

export interface Booking {
  id: string;
  bookingCategory: 'dormitory' | 'facility';
  items: BookingItem[];
  userId?: string;
  companyId?: string; // For facility bookings by companies
  // Dormitory specific
  guestName?: string;
  guestIdScanUrl?: string; // Placeholder, not implemented
  guestEmployer?: string;
  // Facility specific
  companyName?: string;
  contactPerson?: string;
  email?: string;
  phone?: string;
  numberOfAttendees?: number;
  serviceDetails?: BookingServiceDetails;
  notes?: string;
  customAgreementTerms?: string; // For admin-edited terms
  // Common
  startDate: string | import('firebase/firestore').Timestamp; 
  endDate: string | import('firebase/firestore').Timestamp;   
  totalCost: number;
  paymentStatus: 'pending' | 'paid' | 'failed';
  approvalStatus: 'pending' | 'approved' | 'rejected';
  bookedAt: string | import('firebase/firestore').Timestamp;
  // Agreement specific for facilities
  agreementStatus?: AgreementStatus;
  agreementSentAt?: string | import('firebase/firestore').Timestamp;
  agreementSignedAt?: string | import('firebase/firestore').Timestamp;
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
  createdAt?: string; // ISO string representation
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
