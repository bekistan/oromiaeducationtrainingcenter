
import { format, parseISO } from 'date-fns';
import type { Timestamp } from 'firebase/firestore';

// --- Self-contained Ethiopian Calendar Conversion Logic ---

const toEthiopian = (gregorianDate: Date): { year: number, month: number, day: number, monthName: string, dayName: string } => {
    // Function to convert Gregorian date to Julian day number
    const toJulian = (year: number, month: number, day: number): number => {
        let a = Math.floor((14 - month) / 12);
        let y = year + 4800 - a;
        let m = month + 12 * a - 3;
        return day + Math.floor((153 * m + 2) / 5) + 365 * y + Math.floor(y / 4) - Math.floor(y / 100) + Math.floor(y / 400) - 32045;
    };

    // Use UTC to avoid timezone issues for date calculations
    const jdn = toJulian(gregorianDate.getUTCFullYear(), gregorianDate.getUTCMonth() + 1, gregorianDate.getUTCDate());

    // Ethiopian calendar epoch offset in Julian days
    const ethiopianEpoch = 1724220.5;

    const r = (jdn - ethiopianEpoch) % 1461;
    const n = (r % 365) + 365 * Math.floor(r / 1460);

    let ethYear = 4 * Math.floor((jdn - ethiopianEpoch) / 1461) + Math.floor(r / 365) - Math.floor(r / 1460);
    let ethMonth = Math.floor(n / 30) + 1;
    let ethDay = (n % 30) + 1;
    
    const dayOfWeek = gregorianDate.getUTCDay();
    const monthNames = [
      'Meskerem', 'Tikimt', 'Hidar', 'Tahsas', 'Tir', 'Yekatit',
      'Megabit', 'Miyazya', 'Ginbot', 'Sene', 'Hamle', 'Nehase', 'Pagume'
    ];
    
    const dayNames = ['Ihude', 'Segno', 'Maksegno', 'Erob', 'Hamus', 'Arb', 'Kidame'];

    return {
        year: ethYear,
        month: ethMonth,
        day: ethDay,
        monthName: monthNames[ethMonth - 1],
        dayName: dayNames[dayOfWeek]
    };
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
