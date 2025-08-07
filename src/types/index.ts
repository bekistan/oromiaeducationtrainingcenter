
import { STORE_ITEM_CATEGORIES } from '@/constants';

export type Locale = 'en' | 'om' | 'am';

export type Translations = {
  [key: string]: string | Translations;
};

export interface BankAccountDetails {
  id?: string; 
  bankName: string;
  accountName: string;
  accountNumber: string;
  lastUpdated?: import('firebase/firestore').Timestamp | Date | string;
}

export interface BrandAssets {
    id?: string;
    signatureUrl?: string;
    stampUrl?: string;
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
  date?: string; // Used for advanced booking schedule
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
  paymentScreenshotUrl?: string;
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
  // For advanced scheduling
  schedule?: BookingItem[];
}

export type KeyStatus = 'not_issued' | 'issued' | 'returned'; 

export interface User {
  id: string;
  email: string;
  role: 'admin' | 'superadmin' | 'company_representative' | 'individual' | 'keyholder' | 'store_manager';
  name?: string;
  position?: string;
  companyId?: string;
  companyName?: string;
  approvalStatus?: 'pending' | 'approved' | 'rejected';
  phone?: string;
  createdAt?: string | import('firebase/firestore').Timestamp; 
  buildingAssignment?: 'ifaboru' | 'buuraboru' | null;
  fcmToken?: string; // For push notifications
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
  notificationType?: NotificationType | NotificationType[];
}

export type NotificationType = 
  | 'new_facility_booking' 
  | 'new_dormitory_booking' 
  | 'company_registration' 
  | 'payment_verification_needed'
  | 'agreement_ready_for_client'
  | 'agreement_signed_by_client'
  | 'key_assignment_pending' // For keyholders
  | 'low_stock_warning'; // For store managers

export interface AdminNotification {
    id: string;
    message: string;
    type: NotificationType;
    relatedId?: string; 
    recipientRole: 'admin' | 'superadmin' | 'company_representative' | 'keyholder' | 'store_manager';
    recipientId?: string; // For company-specific notifications
    isRead: boolean;
    createdAt: any; 
    link?: string; 
}

export interface BlogPost {
  id: string;
  title: string;
  slug: string;
  content: string; // Markdown content
  excerpt?: string;
  imageUrl?: string;
  authorName: string;
  authorId: string;
  isPublished: boolean;
  createdAt: string | import('firebase/firestore').Timestamp;
  updatedAt: string | import('firebase/firestore').Timestamp;
  dataAiHint?: string;
}


export interface FAQItem {
  id: string;
  question: { [key in Locale]?: string };
  answer: { [key in Locale]?: string };
}

export interface ServiceItem {
  id: string;
  title: { [key in Locale]?: string };
  description: { [key in Locale]?: string };
  image: string;
  dataAiHint?: string;
}

export interface SiteContentSettings {
  id?: string;
  welcomeMessage: { [key in Locale]?: string };
  tagline: { [key in Locale]?: string };
  featuredDormitoriesTitle: { [key in Locale]?: string };
  featuredDormitoriesSubtitle: { [key in Locale]?: string };
  featuredHallsTitle: { [key in Locale]?: string };
  featuredHallsSubtitle: { [key in Locale]?: string };
  discoverSectionTitle: { [key in Locale]?: string };
  discoverSectionDescription: { [key in Locale]?: string };
  servicesSectionTitle: { [key in Locale]?: string };
  services: ServiceItem[];
  faqs: FAQItem[];
  privacyPolicy: { [key in Locale]?: string };
  termsOfService: { [key in Locale]?: string };
  lastUpdated?: import('firebase/firestore').Timestamp | Date | string;
}

// Store Management Types
export type StoreItemCategory = typeof STORE_ITEM_CATEGORIES[number];

export interface StoreItem {
  id: string;
  name: string;
  category: StoreItemCategory;
  quantity: number;
  unit: string; // e.g., 'pcs', 'kg', 'liters'
  lastUpdated: import('firebase/firestore').Timestamp;
  notes?: string;
}

export interface StoreTransaction {
  id: string;
  itemId: string;
  itemName: string;
  type: 'in' | 'out'; // 'in' for restocking, 'out' for usage
  quantityChange: number;
  reason: string;
  transactionDate: import('firebase/firestore').Timestamp;
  recordedBy: string; // User ID of the store manager
  responsibleEmployeeId?: string;
  responsibleEmployeeName?: string;
}

export interface Employee {
    id: string;
    name: string;
    position: string;
    employeeId: string;
}
