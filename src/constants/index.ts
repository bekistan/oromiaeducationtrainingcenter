
import type { NavItem, User, SiteContentSettings } from '@/types'; 

export const SITE_NAME = "Oromia Education Center";
export const SITE_DESCRIPTION = "Your premier destination for educational facilities and comfortable accommodations. Book with us for a seamless experience.";

export const STATIC_IMAGES = [
  { name: 'Ifa Boru Building', path: '/images/Ifaboru.jpg' },
  { name: 'Bu\'ura Boru Building', path: '/images/Bu\'uraboru.jpg' },
  { name: 'Conference Hall (Wide)', path: '/images/Hall.jpg' },
  { name: 'Conference Hall (Side)', path: '/images/Hall2.jpg' },
  { name: 'Hall Interior', path: '/images/Hall_inside.jpg' },
  { name: 'Hall Interior 2', path: '/images/Hall_inside_2.jpg' },
  { name: 'Hall Stage View', path: '/images/Hall_stage.jpg' },
  { name: 'Catering Service', path: '/images/catering.jpg' },
  { name: 'Meeting Section', path: '/images/Sections.jpg' },
  { name: 'Standard Dormitory Room', path: '/images/dorm_room.jpg' },
  { name: 'Main Logo', path: '/images/logo.png' },
];

export const SUPPORTED_LOCALES = [
  { code: 'en', name: 'English' },
  { code: 'om', name: 'Afan Oromo' },
  { code: 'am', name: 'Amharic' },
] as const;

export const DEFAULT_LOCALE = 'en';

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
  { labelKey: 'brochure', href: '/brochure' },
  { labelKey: 'blog', href: '/blog' },
  { labelKey: 'contactUs', href: '/contact' },
];

export const ADMIN_NAVS: NavItem[] = [
  { labelKey: 'dashboard', href: '/admin/dashboard', authRequired: true, roles: ['admin', 'superadmin'] },
  { labelKey: 'notifications', href: '/admin/notifications', authRequired: true, roles: ['admin', 'superadmin'], notificationType: ['new_dormitory_booking', 'new_facility_booking', 'company_registration', 'agreement_signed_by_client'] },
  { 
    labelKey: 'manageBookings',
    authRequired: true,
    roles: ['admin', 'superadmin'],
    children: [
      { labelKey: 'manageDormitoryBookings', href: '/admin/manage-dormitory-bookings', authRequired: true, roles: ['admin', 'superadmin'], notificationType: 'new_dormitory_booking' },
      { labelKey: 'manageFacilityBookings', href: '/admin/manage-facility-bookings', authRequired: true, roles: ['admin', 'superadmin'], generalAdminOnly: true, notificationType: ['new_facility_booking', 'agreement_signed_by_client'] },
    ]
  },
  {
    labelKey: 'siteManagement',
    authRequired: true,
    roles: ['admin', 'superadmin'],
    children: [
      { labelKey: 'manageDormitories', href: '/admin/dormitories', authRequired: true, roles: ['admin', 'superadmin'] },
      { labelKey: 'manageHalls', href: '/admin/halls', authRequired: true, roles: ['admin', 'superadmin'], generalAdminOnly: true },
      { labelKey: 'manageCompanies', href: '/admin/manage-companies', authRequired: true, roles: ['admin', 'superadmin'], generalAdminOnly: true, notificationType: 'company_registration' },
      { labelKey: 'manageEmployees', href: '/admin/employees', authRequired: true, roles: ['admin', 'superadmin'], generalAdminOnly: true },
      { labelKey: 'manageBlog', href: '/admin/blog', authRequired: true, roles: ['admin', 'superadmin'], generalAdminOnly: true },
    ]
  },
  { labelKey: 'reports', href: '/admin/reports', authRequired: true, roles: ['admin', 'superadmin'] }, 
  { 
    labelKey: 'manageSettings', 
    authRequired: true, 
    roles: ['admin', 'superadmin'], 
    generalAdminOnly: true,
    children: [
      { labelKey: 'generalSettings', href: '/admin/settings' },
      { labelKey: 'siteContent', href: '/admin/settings/site-content' },
      { labelKey: 'financialManagement', href: '/admin/financials' },
      { labelKey: 'agreementTemplate', href: '/admin/settings/agreement-template' },
      { labelKey: 'siteBrandAssets', href: '/admin/settings/brand-assets' },
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
      { labelKey: 'registerStoreManager', href: '/admin/register-store-manager' },
    ]
  },
  { labelKey: 'userProfile', href: '/admin/profile', authRequired: true, roles: ['admin', 'superadmin'] },
];


export const KEYHOLDER_NAVS: NavItem[] = [
  { labelKey: 'keyholderDashboard', href: '/keyholder/dashboard', authRequired: true, roles: ['keyholder'] },
  { labelKey: 'assignKeys', href: '/keyholder/assign-keys', authRequired: true, roles: ['keyholder'], notificationType: 'key_assignment_pending' },
  { labelKey: 'dailyReports', href: '/keyholder/daily-reports', authRequired: true, roles: ['keyholder'] },
  { labelKey: 'reports', href: '/keyholder/reports', authRequired: true, roles: ['keyholder'] },
];

export const STORE_MANAGER_NAVS: NavItem[] = [
    { labelKey: 'storeDashboard', href: '/store-manager/dashboard', authRequired: true, roles: ['store_manager'] },
    { labelKey: 'manageStock', href: '/store-manager/stock', authRequired: true, roles: ['store_manager'], notificationType: 'low_stock_warning' },
    { labelKey: 'manageTransactions', href: '/store-manager/transactions', authRequired: true, roles: ['store_manager'] },
    { labelKey: 'storeReports', href: '/store-manager/reports', authRequired: true, roles: ['store_manager'] },
];

export const FOOTER_LINKS = [
  { labelKey: 'brochure', href: '/brochure' },
  { labelKey: 'dormitories', href: '/dormitories' },
  { labelKey: 'halls', href: '/halls' },
  { labelKey: 'blog', href: '/blog' },
  { labelKey: 'contactUs', href: '/contact' },
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
export const PRICING_SETTINGS_DOC_PATH = "site_configuration/pricing_settings";
export const BRAND_ASSETS_DOC_PATH = "site_configuration/brand_assets";

export const STORE_ITEM_CATEGORIES = ["Stationery", "Cleaning Supplies", "Electronics", "Kitchen Supplies", "Maintenance", "Other"] as const;

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
  discoverSectionTitle: {
    en: "Discover OERTC",
    om: "MBLQBO Daawwadhu",
    am: "የኦትምሥማን ይጎብኙ"
  },
  discoverSectionDescription: {
    en: "Explore our state-of-the-art facilities, comfortable accommodations, and the serene environment that makes OERTC the perfect place for learning, growth, and collaboration.",
    om: "Giddugala keenya kan ammayyaa, iddoo jireenyaa mijataa, fi naannoo tasgabbii kan MBLQBO iddoo barumsaa, guddinaa, fi wal-tumsaaf mijataa taasisu daawwadhaa.",
    am: "ዘመናዊ ተቋሞቻችንን፣ ምቹ ማረፊያዎቻችንን እና የኦሮሚያ ትምህርት ማዕከልን ለመማር、ለማደግ እና ለትብብር ምቹ ቦታ የሚያደርገውን ሰላማዊ አካባቢ ያስሱ።"
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
      description: { 
        en: "Our modern and secure dormitories provide a restful and productive environment for trainees and guests. Each room is designed for comfort, ensuring you have a pleasant stay while focusing on your educational and training goals.", 
        om: "Doormitoriiwwan ammayyaa fi nageenyi isaanii eegame keenya, naannoo boqonnaa fi bu'aa qabeessa ta'e leenjifamtootaa fi keessummootaaf ni kenna. Kutaan hundi akkaataa mijaa'ina qabuun kan dizayinii ta'e yoo ta'u, galma barumsaa fi leenjii keessan irratti xiyyeeffattanii akka turtan isin gargaara.", 
        am: "ዘመናዊ እና ደህንነታቸው የተጠበቀ መኝታ ክፍሎቻችን ለሰልጣኞች እና ለእንግዶች ምቹ እና ውጤታማ አካባቢን ይሰጣሉ። እያንዳንዱ ክፍል ለምቾት የተነደፈ ሲሆን በትምህርት እና በስልጠና ግቦችዎ ላይ በማተኮር አስደሳች ቆይታ እንዲኖርዎት ያደርጋል።" 
      },
      image: "/images/dorm_room.jpg",
      dataAiHint: "dormitory bedroom"
    },
    {
      id: "halls",
      title: { en: "Halls & Sections", om: "Galmawwanii fi Kutaa Addaa", am: "አዳራሾች እና ክፍሎች" },
      description: { 
        en: "From large-scale conferences to intimate meetings, our versatile halls and sections are equipped with the latest technology to facilitate any event. We provide flexible seating arrangements and support to ensure your gathering is a success.", 
        om: "Gamaaggama gurguddoo irraa kaasee hanga walgahiiwwan xixiqqootti, galmawwanii fi kutaaleen keenya kan hedduu hojjetan, sagantaa kamiyyuu mijeessuuf teeknooloojii ammayyaatiin kan guutamanidha. Walgahii keessan milkaa'ina akka qabaatuuf qophii teessumaa salphaatti jijjiiramuu danda'uu fi deeggarsa ni kennina.", 
        am: "ከትላልቅ ኮንፈረንሶች እስከ ትናንሽ ስብሰባዎች ድረስ ሁለገብ አዳራሾቻችን እና ክፍሎቻችን ማንኛውንም ዝግጅት ለማመቻቸት በዘመናዊ ቴክኖሎጂ የታጠቁ ናቸው። ስብሰባዎ ስኬታማ እንዲሆን ተለዋዋጭ የመቀመጫ ዝግጅቶችን እና ድጋፍን እንሰጣለን።" 
      },
      image: "/images/conference_hall.jpg",
      dataAiHint: "conference hall"
    },
    {
      id: "catering",
      title: { en: "Catering Services", om: "Tajaajila Nyaataa", am: "የምግብ አቅርቦት አገልግሎቶች" },
      description: { 
        en: "Enhance your event with our professional catering services. We offer a diverse menu, from coffee breaks and refreshments to full-course lunches, all prepared with fresh, high-quality ingredients to delight your attendees.", 
        om: "Tajaajila nyaataa piroofeeshinaalaa keenyaan sagantaa keessan fooyyessaa. Buna dhuguu fi qabbanaa'uu irraa kaasee hanga laaqana guutuutti, menu adda addaa kan qopheessinu yoo ta'u, hundi isaaniis qabiyyee haarayaa fi qulqullina olaanaa qabuun kan qophaa'anidha.", 
        am: "ዝግጅትዎን በሙያዊ የምግብ አቅርቦት አገልግሎታችን ያሳድጉ። ከቡና እረፍት እና ከመጠጥ ጀምሮ እስከ ሙሉ የምሳ ምግቦች ድረስ የተለያዩ ምናሌዎችን እናቀርባለን፣ ሁሉም በተሰብሳቢዎችዎ እንዲደሰቱ በአዲስ እና ከፍተኛ ጥራት ባላቸው ንጥረ ነገሮች ይዘጋጃሉ።" 
      },
      image: "/images/catering.jpg",
      dataAiHint: "catering food"
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
