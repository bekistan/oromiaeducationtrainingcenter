
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
  images?: string[]; // URLs to images
  dataAiHint?: string; // AI hint for image generation
}

export interface Hall { // This type can represent both Halls and Sections
  id: string;
  name: string;
  capacity: number;
  isAvailable: boolean;
  rentalCost: number; // Cost for the hall/section itself
  lunchServiceCost?: number; // Cost per person for lunch (base cost, actual cost might depend on level)
  refreshmentServiceCost?: number; // Cost per person for refreshment (base cost)
  images?: string[]; // URLs to images
  description?: string;
  dataAiHint?: string; // AI hint for image generation
}

export interface BookingServiceDetails {
  lunch?: 'level1' | 'level2';
  refreshment?: 'level1' | 'level2';
}

export interface Booking {
  id: string;
  type: 'dormitory' | 'hall' | 'section';
  itemId: string; // ID of Dormitory or Hall/Section
  userId?: string; // For registered users (admin/company reps)
  guestName?: string; // For individual dormitory bookings
  guestIdScanUrl?: string; // URL to scanned ID
  guestEmployer?: string; // Employer for individual
  companyName?: string; // For hall/section bookings
  startDate: string; // ISO date string
  endDate: string; // ISO date string for dormitory, or single day for hall/section
  numberOfPeople?: number; // For hall/section services
  serviceDetails?: BookingServiceDetails; // Updated from 'services'
  totalCost: number;
  paymentStatus: 'pending' | 'paid' | 'failed';
  bookedAt: string; // ISO date string
}

export interface User {
  id: string;
  email: string;
  role: 'admin' | 'superadmin' | 'company_representative'; // Company reps might register
  name?: string;
  companyId?: string; // If representing a company
}

export interface CompanyProfile {
  id: string;
  name: string;
  contactPerson: string;
  email: string;
  phone: string;
}

export interface NavItem {
  labelKey: string; // Key for translation
  href: string;
  adminOnly?: boolean;
  authRequired?: boolean;
}
