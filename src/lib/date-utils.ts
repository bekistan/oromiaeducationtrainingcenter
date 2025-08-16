
import { format, parseISO } from 'date-fns';
import type { Timestamp } from 'firebase/firestore';

// --- Self-contained Ethiopian Calendar Conversion Logic ---

const GREGORIAN_EPOCH = 1721425.5;
const ETHIOPIC_EPOCH = 2796;

const toEthiopian = (gregorianDate: Date): { year: number, month: number, day: number, monthName: string, dayName: string } => {
  const year = gregorianDate.getFullYear();
  const month = gregorianDate.getMonth() + 1;
  const day = gregorianDate.getDate();

  const jd = GREGORIAN_EPOCH - 1 + 365 * (year - 1) + Math.floor((year - 1) / 4) - Math.floor((year - 1) / 100) + Math.floor((year - 1) / 400) + Math.floor((367 * month - 362) / 12 + (month <= 2 ? 0 : isGregorianLeap(year) ? -1 : -2) + day);
  const r = (jd - ETHIOPIC_EPOCH) % 1461;
  const n = (r % 365) + 365 * Math.floor(r / 1461);
  let eYear = 4 * Math.floor((jd - ETHIOPIC_EPOCH) / 1461) + Math.floor(r / 365) - Math.floor(r / 1460);
  let eMonth = Math.floor(n / 30) + 1;
  let eDay = (n % 30) + 1;
  
  if (eMonth > 13) {
      eYear += 1;
      eMonth = 1;
  }

  const monthNames = [
    'Meskerem', 'Tikimt', 'Hidar', 'Tahsas', 'Tir', 'Yekatit', 
    'Megabit', 'Miyazya', 'Ginbot', 'Sene', 'Hamle', 'Nehase', 'Pagume'
  ];

  const dayNames = ['Ihude', 'Segno', 'Maksegno', 'Erob', 'Hamus', 'Arb', 'Kidame'];

  return { 
      year: eYear, 
      month: eMonth, 
      day: eDay,
      monthName: monthNames[eMonth - 1],
      dayName: dayNames[gregorianDate.getDay()]
  };
};

const isGregorianLeap = (year: number) => {
  return year % 4 === 0 && (year % 100 !== 0 || year % 400 === 0);
};

// --- Original Date Utility Functions ---

type DateInput = string | Date | Timestamp | undefined | null;

export const toDateObject = (dateInput: DateInput): Date | null => {
  if (!dateInput) return null;
  if (dateInput instanceof Date) return dateInput;
  if (typeof (dateInput as Timestamp).toDate === 'function') {
    return (dateInput as Timestamp).toDate();
  }
  if (typeof dateInput === 'string') {
    try {
      const parsedIso = parseISO(dateInput);
      if (!isNaN(parsedIso.getTime())) {
        return parsedIso;
      }
    } catch (e) {
      // Ignore if parseISO fails
    }
    const parsedDate = new Date(dateInput);
    return isNaN(parsedDate.getTime()) ? null : parsedDate;
  }
   if (typeof dateInput === 'object' && dateInput.hasOwnProperty('seconds')) {
    return new Timestamp((dateInput as any).seconds, (dateInput as any).nanoseconds).toDate();
  }
  return null;
};

export const formatDate = (
  dateInput: DateInput,
  formatStr: string = 'MMM d, yyyy'
): string => {
  const dateObj = toDateObject(dateInput);
  if (!dateObj || isNaN(dateObj.getTime())) return 'N/A';

  try {
    return format(dateObj, formatStr);
  } catch (error) {
    console.error("Error formatting date:", error, "Date Object:", dateObj);
    return "Invalid Date";
  }
};

export const formatEthiopianDate = (
    dateInput: DateInput,
    formatStr: 'default' | 'full' = 'default'
): string => {
    const dateObj = toDateObject(dateInput);
    if (!dateObj) return 'N/A';

    try {
        const ethiopianDate = toEthiopian(dateObj);
        const monthName = ethiopianDate.monthName;

        if (formatStr === 'full') {
             return `${monthName} ${ethiopianDate.day}, ${ethiopianDate.year}`;
        }
        return `${monthName.substring(0,3)} ${ethiopianDate.day}, ${ethiopianDate.year}`;
    } catch (error) {
        console.error("Error converting to Ethiopian date:", error);
        return formatDate(dateObj); // Fallback to Gregorian format
    }
};

export const formatDualDate = (dateInput: DateInput, primaryFormat: string, secondaryFormat?: string): string => {
  const dateObj = toDateObject(dateInput);
  if (!dateObj) return 'N/A';

  const primaryDate = format(dateObj, primaryFormat);
  return primaryDate;
};
