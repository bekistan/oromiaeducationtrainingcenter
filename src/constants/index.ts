
import type { NavItem, User } from '@/types'; // Added User import

export const SITE_NAME = "Oromia Education Training Center";
export const SITE_DESCRIPTION = "Oromia Education Research and Training Center Rental Services";

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
];

export const ADMIN_NAVS: NavItem[] = [
  { labelKey: 'dashboard', href: '/admin/dashboard', authRequired: true, roles: ['admin', 'superadmin'] },
  { labelKey: 'manageDormitories', href: '/admin/dormitories', authRequired: true, roles: ['admin', 'superadmin'] },
  { labelKey: 'manageHalls', href: '/admin/halls', authRequired: true, roles: ['admin', 'superadmin'] },
  { labelKey: 'manageBookings', href: '/admin/bookings', authRequired: true, roles: ['admin', 'superadmin'] },
  { labelKey: 'manageCompanies', href: '/admin/manage-companies', authRequired: true, roles: ['admin', 'superadmin'] }, // New
  { labelKey: 'reports', href: '/admin/reports', authRequired: true, roles: ['admin', 'superadmin'] },
  { labelKey: 'registerAdmin', href: '/admin/register-admin', authRequired: true, roles: ['superadmin'] }, // New, superadmin only
  { labelKey: 'userProfile', href: '/admin/profile', authRequired: true, roles: ['admin', 'superadmin'] },
];

export const FOOTER_LINKS = [
  { labelKey: 'privacyPolicy', href: '/privacy-policy' },
  { labelKey: 'termsOfService', href: '/terms-of-service' },
];

export const PLACEHOLDER_IMAGE_SIZE = "600x400";
export const PLACEHOLDER_THUMBNAIL_SIZE = "300x200";

