
import type { NavItem, User } from '@/types'; // Added User import

export const SITE_NAME = "Oromia Education Training Center";
export const SITE_DESCRIPTION = "Oromia Education Research and Training Center Rental Services";

// Bank Account Details for Admin Reference
export const BANK_NAME_VALUE = "Commercial Bank of Ethiopia (CBE)";
export const BANK_ACCOUNT_NAME_VALUE = SITE_NAME; // Or a specific account name if different
export const BANK_ACCOUNT_NUMBER_VALUE = "1000123456789"; // Placeholder - REPLACE WITH ACTUAL

export const SUPPORTED_LOCALES = [
  { code: 'en', name: 'English' },
  { code: 'om', name: 'Oromo' },
  { code: 'am', name: 'Amharic' },
] as const;

export const DEFAULT_LOCALE = 'en';

export const PUBLIC_NAVS: NavItem[] = [
  { labelKey: 'home', href: '/' },
  { labelKey: 'dormitories', href: '/dormitories' },
  { labelKey: 'halls', href: '/halls' },
  { labelKey: 'myDormitoryNav', href: '/check-my-booking' },
  { labelKey: 'contactUs', href: '/contact' },
];

export const ADMIN_NAVS: NavItem[] = [
  { labelKey: 'dashboard', href: '/admin/dashboard', authRequired: true, roles: ['admin', 'superadmin'] },
  { labelKey: 'manageDormitories', href: '/admin/dormitories', authRequired: true, roles: ['admin', 'superadmin'] },
  { labelKey: 'manageHalls', href: '/admin/halls', authRequired: true, roles: ['admin', 'superadmin'] },
  { labelKey: 'manageDormitoryBookings', href: '/admin/manage-dormitory-bookings', authRequired: true, roles: ['admin', 'superadmin'] },
  { labelKey: 'manageFacilityBookings', href: '/admin/manage-facility-bookings', authRequired: true, roles: ['admin', 'superadmin'] },
  { labelKey: 'manageCompanies', href: '/admin/manage-companies', authRequired: true, roles: ['admin', 'superadmin'] },
  { labelKey: 'reports', href: '/admin/reports', authRequired: true, roles: ['admin', 'superadmin'] },
  { labelKey: 'registerAdmin', href: '/admin/register-admin', authRequired: true, roles: ['superadmin'] },
  { labelKey: 'registerKeyholder', href: '/admin/register-keyholder', authRequired: true, roles: ['admin', 'superadmin'] },
  { labelKey: 'userProfile', href: '/admin/profile', authRequired: true, roles: ['admin', 'superadmin'] },
];

export const KEYHOLDER_NAVS: NavItem[] = [
  { labelKey: 'keyholderDashboard', href: '/keyholder/dashboard', authRequired: true, roles: ['keyholder'] },
  { labelKey: 'assignKeys', href: '/keyholder/assign-keys', authRequired: true, roles: ['keyholder'] },
  { labelKey: 'dailyReports', href: '/keyholder/daily-reports', authRequired: true, roles: ['keyholder'] },
];


export const FOOTER_LINKS = [
  { labelKey: 'privacyPolicy', href: '/privacy-policy' },
  { labelKey: 'termsOfService', href: '/terms-of-service' },
];

export const PLACEHOLDER_IMAGE_SIZE = "600x400";
export const PLACEHOLDER_THUMBNAIL_SIZE = "300x200";

export const ETHIOPIAN_BANKS = [
  "Awash Bank",
  "Bank of Abyssinia",
  "Commercial Bank of Ethiopia",
  "Dashen Bank",
  "Nib International Bank",
  "United Bank",
  "Wegagen Bank",
  "Zemen Bank",
  "Lion International Bank",
  "Oromia International Bank",
  "Cooperative Bank of Oromia",
  "Buna International Bank",
  "Berhan Bank",
  "Abay Bank",
  "Addis International Bank",
  "Debub Global Bank",
  "Enat Bank",
  "Amhara Bank",
  "Tsehay Bank",
  "Hijra Bank",
  "ZamZam Bank",
  "Siinqee Bank",
  "Ahadu Bank",
  "Other",
];


    
