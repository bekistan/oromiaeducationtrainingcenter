
import type { NavItem, User, SiteContentSettings } from '@/types'; 

export const SITE_NAME = "Oromia Education Research and Training Center";
export const SITE_DESCRIPTION = "together we can";

export const SUPPORTED_LOCALES = [
  { code: 'en', name: 'English' },
  { code: 'om', name: 'Oromo' },
  { code: 'am', name: 'Amharic' },
] as const;

export const DEFAULT_LOCALE = 'en';
export const DEFAULT_CALENDAR_SYSTEM = 'gregorian'; 

export const PUBLIC_NAVS: NavItem[] = [
  { labelKey: 'home', href: '/' },
  {
    labelKey: 'dormitories',
    children: [
      { labelKey: 'bookDorm', href: '/dormitories' },
      { labelKey: 'checkMyBooking', href: '/check-my-booking' },
    ]
  },
  { labelKey: 'halls', href: '/halls' },
  { labelKey: 'contactUs', href: '/contact' },
];

export const ADMIN_NAVS: NavItem[] = [
  { labelKey: 'dashboard', href: '/admin/dashboard', authRequired: true, roles: ['admin', 'superadmin'] },
  { labelKey: 'notifications', href: '/admin/notifications', authRequired: true, roles: ['admin', 'superadmin'] },
  { labelKey: 'manageDormitories', href: '/admin/dormitories', authRequired: true, roles: ['admin', 'superadmin'] },
  { labelKey: 'manageHalls', href: '/admin/halls', authRequired: true, roles: ['admin', 'superadmin'], generalAdminOnly: true }, 
  { labelKey: 'manageDormitoryBookings', href: '/admin/manage-dormitory-bookings', authRequired: true, roles: ['admin', 'superadmin'] },
  { labelKey: 'manageFacilityBookings', href: '/admin/manage-facility-bookings', authRequired: true, roles: ['admin', 'superadmin'], generalAdminOnly: true }, 
  { labelKey: 'manageCompanies', href: '/admin/manage-companies', authRequired: true, roles: ['admin', 'superadmin'], generalAdminOnly: true }, 
  { labelKey: 'reports', href: '/admin/reports', authRequired: true, roles: ['admin', 'superadmin'] }, 
  { 
    labelKey: 'manageSettings', 
    href: '/admin/settings', 
    authRequired: true, 
    roles: ['admin', 'superadmin'], 
    generalAdminOnly: true,
    children: [
      { labelKey: 'generalSettings', href: '/admin/settings' },
      { labelKey: 'siteContent', href: '/admin/settings/site-content' },
      { labelKey: 'financialManagement', href: '/admin/financials' },
      { labelKey: 'agreementTemplate', href: '/admin/settings/agreement-template' },
    ]
  },
  { 
    labelKey: 'userManagement',
    href: '/admin/register-admin',
    authRequired: true,
    roles: ['superadmin'],
    children: [
      { labelKey: 'registerAdmin', href: '/admin/register-admin' },
      { labelKey: 'registerKeyholder', href: '/admin/register-keyholder' },
    ]
  },
  { labelKey: 'userProfile', href: '/admin/profile', authRequired: true, roles: ['admin', 'superadmin'] },
];

export const KEYHOLDER_NAVS: NavItem[] = [
  { labelKey: 'keyholderDashboard', href: '/keyholder/dashboard', authRequired: true, roles: ['keyholder'] },
  { labelKey: 'assignKeys', href: '/keyholder/assign-keys', authRequired: true, roles: ['keyholder'] },
  { labelKey: 'reports', href: '/keyholder/reports', authRequired: true, roles: ['keyholder'] },
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
  "Sidama Bank",
];

export const BANK_DETAILS_DOC_PATH = "site_configuration/bank_account_details";
export const SITE_SETTINGS_DOC_PATH = "site_configuration/general_settings";
export const AGREEMENT_TEMPLATE_DOC_PATH = "site_configuration/agreement_template_settings";
export const SITE_CONTENT_DOC_PATH = "site_configuration/site_content";

export const DEFAULT_SITE_SETTINGS = {
  siteAnnouncementMessage: "",
  isAnnouncementVisible: false,
};

export const DEFAULT_PRICING_SETTINGS = {
  defaultDormitoryPricePerDay: 500,
  defaultHallRentalCostPerDay: 3000,
  defaultSectionRentalCostPerDay: 1500,
  lunchServiceCostLevel1: 150,
  lunchServiceCostLevel2: 250,
  refreshmentServiceCostLevel1: 50,
  refreshmentServiceCostLevel2: 100,
  defaultLedProjectorCostPerDay: 500,
};

export const DEFAULT_AGREEMENT_TERMS = "These are the default terms and conditions. Please replace this text in the admin settings with your organization's official rental agreement terms.";

export const DEFAULT_SITE_CONTENT: SiteContentSettings = {
  welcomeMessage: {
    en: "Welcome to Oromia Education Center",
    om: "Gara Mana Barumsaa Oromiyaatti Nagaan Dhuftan",
    am: "ወደ ኦሮሚያ ትምህርት ማዕከል እንኳን በደህና መጡ"
  },
  tagline: {
    en: "Your one-stop solution for booking facilities and dormitories with ease.",
    om: "Iddoo jireenyaa fi galmawwan haala salphaan itti qabsiifattu.",
    am: "ተቋማትን እና መኝታ ቤቶችን በቀላሉ ለማስያዝ የእርስዎ መፍትሄ።"
  },
  faqs: [
    {
      id: "faq1",
      question: { en: "How do I book a dormitory room?", om: "Akkamittan kutaa ciisichaa qabsiifachuu danda'a?", am: "የመኝታ ክፍል እንዴት ነው መያዝ የምችለው?" },
      answer: { en: "Navigate to the 'Dormitories' page, select your desired dates, choose an available room, and fill out the booking form.", om: "Fuula 'Dormitories' deemi, guyyaa barbaaddu filadhu, kutaa banaa ta'e filadhu, fi unka guuti.", am: "ወደ 'መኝታ ክፍሎች' ገጽ ይሂዱ፣ የሚፈልጉትን ቀን ይምረጡ፣ ያለውን ክፍል ይምረጡ እና የማስያዣ ቅጹን ይሙሉ።"}
    },
     {
      id: "faq2",
      question: { en: "Can companies book facilities?", om: "Dhaabbanni iddoo kireeffachuu danda'aa?", am: "ኩባንያዎች ቦታዎችን መያዝ ይችላሉ?" },
      answer: { en: "Yes, companies can register for an account. Once approved by an admin, they can book halls and sections for meetings and events.", om: "Eeyyee, dhaabbileen galmaa'uu ni danda'u. Adminiin erga hayyameefii booda, walgahii fi ayyaanotaaf galmawwanii fi kutaa addaa qabsiifachuu danda'u.", am: "አዎ ኩባንያዎች መለያ መመዝገብ ይችላሉ። በአስተዳዳሪ ከጸደቀ በኋላ ለአዳራሾች እና ለክፍሎች ለስብሰባ እና ለዝግጅቶች መያዝ ይችላሉ።"}
    }
  ],
  privacyPolicy: {
    en: "",
    om: "",
    am: ""
  },
  termsOfService: {
    en: "",
    om: "",
    am: ""
  }
};
