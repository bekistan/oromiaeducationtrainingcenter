
export type Locale = 'en' | 'om' | 'am';

export type Translations = {
  [key: string]: string | Translations;
};

export type CalendarSystem = 'gregorian' | 'ethiopian'; 

export interface BankAccountDetails {
  id?: string; 
  bankName: string;
  accountName: string;
  accountNumber: string;
  lastUpdated?: import('firebase/firestore').Timestamp | Date | string;
}

export interface SiteSettings {
  id?: string;
  siteAnnouncementMessage?: string;
  isAnnouncementVisible?: boolean;
  lastUpdated?: import('firebase/firestore').Timestamp | Date | string;
}

export interface AgreementTemplateSettings {
  id?: string;
  defaultTerms: string;
  lastUpdated?: import('firebase/firestore').Timestamp | Date | string;
}

export interface PricingSettings {
  id?: string; // Typically 'global_pricing' or similar
  defaultDormitoryPricePerDay: number;
  defaultHallRentalCostPerDay: number;
  defaultSectionRentalCostPerDay: number;
  lunchServiceCostLevel1: number;
  lunchServiceCostLevel2: number;
  refreshmentServiceCostLevel1: number;
  refreshmentServiceCostLevel2: number;
  defaultLedProjectorCostPerDay: number; // For sections
  lastUpdated?: import('firebase/firestore').Timestamp | Date | string;
}


export interface Dormitory {
  id: string;
  floor: number;
  roomNumber: string;
  capacity: number;
  isAvailable: boolean;
  pricePerDay?: number; 
  images?: string[];
  dataAiHint?: string;
  imageAirtableRecordId?: string; // Added for Airtable integration
  buildingName: 'ifaboru' | 'buuraboru'; 
}

export interface Hall {
  id:string;
  name: string;
  capacity: number;
  isAvailable: boolean;
  rentalCost?: number; 
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
  phone?: string;
  paymentScreenshotUrl?: string; // For admin verification
  paymentScreenshotAirtableRecordId?: string; // For admin verification
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
  keyStatus?: KeyStatus; 
}

export type KeyStatus = 'not_issued' | 'issued' | 'returned'; 

export interface User {
  id: string;
  email: string;
  role: 'admin' | 'superadmin' | 'company_representative' | 'individual' | 'keyholder';
  name?: string;
  position?: string;
  companyId?: string;
  companyName?: string;
  approvalStatus?: 'pending' | 'approved' | 'rejected';
  phone?: string;
  createdAt?: string | import('firebase/firestore').Timestamp; 
  preferredCalendarSystem?: CalendarSystem; 
  buildingAssignment?: 'ifaboru' | 'buuraboru' | null; 
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
  href?: string;
  adminOnly?: boolean;
  authRequired?: boolean;
  roles?: User['role'][];
  generalAdminOnly?: boolean;
  children?: NavItem[];
}

export type NotificationType = 'new_facility_booking' | 'new_dormitory_booking' | 'company_registration' | 'payment_verification_needed';

export interface AdminNotification {
    id: string;
    message: string;
    type: NotificationType;
    relatedId?: string; 
    recipientRole: 'admin' | 'superadmin'; 
    isRead: boolean;
    createdAt: import('firebase/firestore').Timestamp | Date | string;
    link?: string; 
}

export interface FAQItem {
  id: string;
  question: { [key in Locale]?: string };
  answer: { [key in Locale]?: string };
}

export interface SiteContentSettings {
  id?: string;
  welcomeMessage: { [key in Locale]?: string };
  tagline: { [key in Locale]?: string };
  faqs: FAQItem[];
  privacyPolicy: { [key in Locale]?: string };
  termsOfService: { [key in Locale]?: string };
  lastUpdated?: import('firebase/firestore').Timestamp | Date | string;
}
