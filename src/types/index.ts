
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
  lunchServiceCost?: number | null; 
  refreshmentServiceCost?: number | null; 
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
  rentalCost?: number; // For facilities, this is the per-day rental cost for the item.
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
  guestIdScanUrl?: string; 
  guestEmployer?: string;
  payerBankName?: string;
  payerAccountNumber?: string;
  // Facility specific
  companyName?: string;
  contactPerson?: string;
  email?: string;
  phone?: string;
  numberOfAttendees?: number;
  serviceDetails?: BookingServiceDetails;
  notes?: string;
  customAgreementTerms?: string; 
  // Common
  startDate: string | import('firebase/firestore').Timestamp; 
  endDate: string | import('firebase/firestore').Timestamp;   
  totalCost: number;
  paymentStatus: 'pending' | 'pending_transfer' | 'awaiting_verification' | 'paid' | 'failed';
  transactionProofDetails?: string; 
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
  approvalStatus?: 'pending' | 'approved' | 'rejected'; 
  phone?: string;
  createdAt?: string; 
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

