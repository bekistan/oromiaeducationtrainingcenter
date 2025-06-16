
export type Locale = 'en' | 'om' | 'am';

export type Translations = {
  [key: string]: string | Translations;
};

export type CalendarSystem = 'gregorian' | 'ethiopian'; // New type

export interface BankAccountDetails {
  id?: string; // Document ID, usually 'main_bank_account'
  bankName: string;
  accountName: string;
  accountNumber: string;
  lastUpdated?: import('firebase/firestore').Timestamp | Date | string;
}


export interface Dormitory {
  id: string;
  floor: number;
  roomNumber: string;
  capacity: number;
  isAvailable: boolean;
  pricePerDay: number;
  images?: string[];
  dataAiHint?: string;
  buildingName: 'ifaboru' | 'buuraboru'; // Added buildingName
}

export interface Hall {
  id:string;
  name: string;
  capacity: number;
  isAvailable: boolean;
  rentalCost: number;
  lunchServiceCost?: number | null;
  refreshmentServiceCost?: number | null;
  ledProjectorCost?: number | null;
  images?: string[];
  description?: string;
  dataAiHint?: string;
  itemType: 'hall' | 'section';
}

export interface BookingServiceDetails {
  lunch?: 'level1' | 'level2';
  refreshment?: 'level1' | 'level2';
  ledProjector?: boolean;
}

export type BookingItem = {
  id: string;
  name: string;
  itemType: 'dormitory' | 'hall' | 'section';
  pricePerDay?: number;
  rentalCost?: number;
  ledProjectorCost?: number | null;
  capacity?: number;
};

export type AgreementStatus =
  | 'pending_admin_action'
  | 'sent_to_client'
  | 'signed_by_client'
  | 'completed';

export interface Booking {
  id: string;
  bookingCategory: 'dormitory' | 'facility';
  items: BookingItem[];
  userId?: string;
  companyId?: string;
  // Dormitory specific
  guestName?: string;
  guestEmployer?: string;
  payerBankName?: string;
  payerAccountNumber?: string;
  phone?: string;
  // Facility specific
  companyName?: string;
  contactPerson?: string;
  email?: string;
  customAgreementTerms?: string;
  // Common
  startDate: string | import('firebase/firestore').Timestamp;
  endDate: string | import('firebase/firestore').Timestamp;
  numberOfAttendees?: number;
  serviceDetails?: BookingServiceDetails;
  notes?: string;
  totalCost: number;
  paymentStatus: 'pending' | 'pending_transfer' | 'awaiting_verification' | 'paid' | 'failed';
  approvalStatus: 'pending' | 'approved' | 'rejected';
  bookedAt: string | import('firebase/firestore').Timestamp;
  // Agreement specific for facilities
  agreementStatus?: AgreementStatus;
  agreementSentAt?: string | import('firebase/firestore').Timestamp;
  agreementSignedAt?: string | import('firebase/firestore').Timestamp;
  signedAgreementUrl?: string;
  keyStatus?: KeyStatus; // Added for keyholder management
}

export type KeyStatus = 'not_issued' | 'issued' | 'returned'; // Added for keyholder

export interface User {
  id: string;
  email: string;
  role: 'admin' | 'superadmin' | 'company_representative' | 'individual' | 'keyholder';
  name?: string;
  companyId?: string;
  companyName?: string;
  approvalStatus?: 'pending' | 'approved' | 'rejected';
  phone?: string;
  createdAt?: string | import('firebase/firestore').Timestamp; // Ensure Timestamp can be handled for queries
  preferredCalendarSystem?: CalendarSystem; // Optional: if stored per user
  buildingAssignment?: 'ifaboru' | 'buuraboru'; // Added for admins
}

export interface CompanyProfile {
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
  roles?: User['role'][];
}
    
