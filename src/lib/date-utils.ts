
import { format, parseISO } from 'date-fns';
import type { Timestamp } from 'firebase/firestore';

// --- Self-contained Ethiopian Calendar Conversion Logic ---

const isGregorianLeap = (year: number): boolean => {
  return year % 4 === 0 && (year % 100 !== 0 || year % 400 === 0);
};

const toEthiopian = (gregorianDate: Date): { year: number, month: number, day: number, monthName: string, dayName: string } => {
    const gregYear = gregorianDate.getFullYear();
    const gregMonth = gregorianDate.getMonth() + 1;
    const gregDay = gregorianDate.getDate();

    let ethYear = gregYear - 8;
    if (gregMonth < 9 || (gregMonth === 9 && gregDay < 11)) {
        ethYear = gregYear - 8;
    } else {
        ethYear = gregYear - 7;
    }

    const startOfEthiopianYear = new Date(gregYear, 8, isGregorianLeap(gregYear) ? 12 : 11);
    if (gregorianDate < startOfEthiopianYear) {
       startOfEthiopianYear.setFullYear(gregYear - 1);
       startOfEthiopianYear.setDate(isGregorianLeap(gregYear - 1) ? 12 : 11);
    }
    
    const diffInDays = Math.floor((gregorianDate.getTime() - startOfEthiopianYear.getTime()) / (1000 * 60 * 60 * 24));
    
    let ethMonth = Math.floor(diffInDays / 30) + 1;
    let ethDay = (diffInDays % 30) + 1;
    
    if (ethMonth > 13) {
      ethMonth = 13;
      ethDay = diffInDays - 360 + 1;
    }

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
        dayName: dayNames[gregorianDate.getDay()]
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
