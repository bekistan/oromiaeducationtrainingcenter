import type { NavItem } from '@/types';

export const SITE_NAME = "OromiaEduRent";
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
  { labelKey: 'dashboard', href: '/admin/dashboard', adminOnly: true, authRequired: true },
  { labelKey: 'manageDormitories', href: '/admin/dormitories', adminOnly: true, authRequired: true },
  { labelKey: 'manageHalls', href: '/admin/halls', adminOnly: true, authRequired: true },
  { labelKey: 'manageBookings', href: '/admin/bookings', adminOnly: true, authRequired: true },
  { labelKey: 'reports', href: '/admin/reports', adminOnly: true, authRequired: true },
  { labelKey: 'userProfile', href: '/admin/profile', adminOnly: true, authRequired: true },
];

export const FOOTER_LINKS = [
  { labelKey: 'privacyPolicy', href: '/privacy-policy' },
  { labelKey: 'termsOfService', href: '/terms-of-service' },
];

export const PLACEHOLDER_IMAGE_SIZE = "600x400";
export const PLACEHOLDER_THUMBNAIL_SIZE = "300x200";
