
import type { NavItem, User, SiteContentSettings } from '@/types'; 

export const SITE_NAME = "Oromia Education Center";
export const SITE_DESCRIPTION = "Your premier destination for educational facilities and comfortable accommodations. Book with us for a seamless experience.";

export const SUPPORTED_LOCALES = [
  { code: 'en', name: 'English' },
  { code: 'om', name: 'Afan Oromo' },
  { code: 'am', name: 'Amharic' },
] as const;

export const DEFAULT_LOCALE = 'en';
export const DEFAULT_CALENDAR_SYSTEM = 'gregorian'; 

export const PUBLIC_NAVS: NavItem[] = [
  { labelKey: 'home', href: '/' },
  { 
    labelKey: 'dormitories', 
    children: [
      { labelKey: 'bookADorm', href: '/dormitories' },
      { labelKey: 'checkMyBooking', href: '/check-my-booking' }
    ]
  },
  { labelKey: 'halls', href: '/halls' },
  { labelKey: 'blog', href: '/blog' },
  { labelKey: 'contactUs', href: '/contact' },
];

export const ADMIN_NAVS: NavItem[] = [
  { labelKey: 'dashboard', href: '/admin/dashboard', authRequired: true, roles: ['admin', 'superadmin'] },
  { labelKey: 'notifications', href: '/admin/notifications', authRequired: true, roles: ['admin', 'superadmin'] },
  { labelKey: 'manageDormitoryBookings', href: '/admin/manage-dormitory-bookings', authRequired: true, roles: ['admin', 'superadmin'] },
  { labelKey: 'manageFacilityBookings', href: '/admin/manage-facility-bookings', authRequired: true, roles: ['admin', 'superadmin'], generalAdminOnly: true },
  { labelKey: 'manageDormitories', href: '/admin/dormitories', authRequired: true, roles: ['admin', 'superadmin'] },
  { labelKey: 'manageHalls', href: '/admin/halls', authRequired: true, roles: ['admin', 'superadmin'], generalAdminOnly: true },
  { labelKey: 'manageCompanies', href: '/admin/manage-companies', authRequired: true, roles: ['admin', 'superadmin'], generalAdminOnly: true },
  { labelKey: 'manageBlog', href: '/admin/blog', authRequired: true, roles: ['admin', 'superadmin'], generalAdminOnly: true },
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
    authRequired: true,
    roles: ['superadmin'],
    children: [
      { labelKey: 'listAllUsers', href: '/admin/user-management' },
      { labelKey: 'registerAdmin', href: '/admin/register-admin' },
      { labelKey: 'registerKeyholder', href: '/admin/register-keyholder' },
    ]
  },
  { labelKey: 'userProfile', href: '/admin/profile', authRequired: true, roles: ['admin', 'superadmin'] },
];

export const KEYHOLDER_NAVS: NavItem[] = [
  { labelKey: 'keyholderDashboard', href: '/keyholder/dashboard', authRequired: true, roles: ['keyholder'] },
  { labelKey: 'assignKeys', href: '/keyholder/assign-keys', authRequired: true, roles: ['keyholder'] },
  { labelKey: 'dailyReports', href: '/keyholder/daily-reports', authRequired: true, roles: ['keyholder'] },
  { labelKey: 'reports', href: '/keyholder/reports', authRequired: true, roles: ['keyholder'] },
];

export const FOOTER_LINKS = [
  { labelKey: 'privacyPolicy', href: '/privacy-policy' },
  { labelKey: 'termsOfService', href: '/terms-of-service' },
  { labelKey: 'contactUs', href: '/contact' },
  { labelKey: 'blog', href: '/blog' },
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
export const PRICING_SETTINGS_DOC_PATH = "site_configuration/pricing_settings";

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
    en: "Together we can.",
    om: "Waloon dandeenya.",
    am: "አብረን እንችላለን።"
  },
  featuredDormitoriesTitle: {
    en: "Featured Dormitories",
    om: "Dormitoriiwwan Filataman",
    am: "ተመራጭ የመኝታ ክፍሎች"
  },
  featuredDormitoriesSubtitle: {
    en: "A selection of our finest rooms, offering comfort and convenience.",
    om: "Qulqullinaa fi mijaa'ina kan qaban, kutaa filatamaa keenya.",
    am: "ምቾት እና ምቾት የሚሰጡ ምርጥ ክፍሎቻችን ምርጫ።"
  },
  featuredHallsTitle: {
    en: "Featured Halls & Sections",
    om: "Galmawwanii fi Kutaa Addaa Filataman",
    am: "ተመራጭ አዳራሾች እና ክፍሎች"
  },
  featuredHallsSubtitle: {
    en: "Versatile spaces perfect for your next meeting, conference, or event.",
    om: "Bakkeewwan adda addaa walgahii, koonfaransii fi sagantaaleef mijatoo.",
    am: "ለቀጣይ ስብሰባዎ፣ ኮንፈረንስዎ ወይም ዝግጅትዎ ተስማሚ የሆኑ ሁለገብ ቦታዎች።"
  },
  servicesSectionTitle: {
    en: "Our Services",
    om: "Tajaajila Keenya",
    am: "የእኛ አገልግሎቶች"
  },
  services: [
    {
      id: "dormitories",
      title: { en: "Dormitories", om: "Dormitoriiwwan", am: "የመኝታ ክፍሎች" },
      description: { en: "Comfortable and secure accommodation for individuals and groups.", om: "Jireenyaaf mijataa fi nageenyi isaa eegamaadha.", am: "ለግለሰቦች እና ለቡድኖች ምቹ እና ደህንነቱ የተጠበቀ ማረፊያ።" },
      image: "https://placehold.co/800x600/b8c6db/333333?text=Dormitory"
    },
    {
      id: "halls",
      title: { en: "Halls & Sections", om: "Galmawwanii fi Kutaa Addaa", am: "አዳራሾች እና ክፍሎች" },
      description: { en: "Versatile spaces for meetings, conferences, and events of all sizes.", om: "Bakkeewwan adda addaa walgahii, koonfaransii fi sagantaaleef.", am: "ለሁሉም መጠን ላላቸው ስብሰባዎች፣ ኮንፈረንሶች እና ዝግጅቶች ሁለገብ ቦታዎች።" },
      image: "https://placehold.co/800x600/f5d0a9/333333?text=Hall"
    },
    {
      id: "catering",
      title: { en: "Catering Services", om: "Tajaajila Nyaataa", am: "የምግብ አቅርቦት አገልግሎቶች" },
      description: { en: "Delicious and customizable catering options to complement your event.", om: "Filannoowwan nyaataa mi'aawaa fi akka barbaadetti kan qophaa'u.", am: "ዝግጅትዎን የሚያሟሉ ጣፋጭ እና ሊበጁ የሚችሉ የምግብ አማራጮች።" },
      image: "https://placehold.co/800x600/a9f5d0/333333?text=Catering"
    }
  ],
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
