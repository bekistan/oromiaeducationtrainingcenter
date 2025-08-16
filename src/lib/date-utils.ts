
import { format, parseISO } from 'date-fns';
import type { Timestamp } from 'firebase/firestore';

// --- Self-contained Ethiopian Calendar Conversion Logic ---

const toEthiopian = (gregorianDate: Date): { year: number, month: number, day: number, monthName: string, dayName: string } => {
    // To avoid timezone issues, we'll work with UTC values
    const gregYear = gregorianDate.getUTCFullYear();
    const gregMonth = gregorianDate.getUTCMonth() + 1;
    const gregDay = gregorianDate.getUTCDate();
    const dayOfWeek = gregorianDate.getUTCDay();

    // The Ethiopian calendar is 7-8 years behind the Gregorian calendar.
    // The new year starts on September 11th (or 12th in a leap year).
    let ethYear = (gregMonth > 9 || (gregMonth === 9 && gregDay >= 12)) ? gregYear - 7 : gregYear - 8;

    // The Ethiopian calendar has 12 months of 30 days and 1 month of 5 or 6 days (Pagume).
    // The start of the Ethiopian year (Meskerem 1) corresponds to September 11th or 12th.
    
    // To calculate the day of the year in the Gregorian calendar
    const startOfYear = new Date(Date.UTC(gregYear, 0, 1));
    const dayOfYear = Math.floor((gregorianDate.getTime() - startOfYear.getTime()) / 86400000) + 1;

    // The Ethiopian new year in the Gregorian calendar (day number)
    const newYearDay = new Date(Date.UTC(gregYear, 8, 11)).getUTCFullYear() % 4 === 3 ? 255 : 254;

    let ethDayOfYear;
    if (dayOfYear > newYearDay) {
        ethDayOfYear = dayOfYear - newYearDay;
    } else {
        ethYear = ethYear - 1; // It's still the previous Ethiopian year
        const prevNewYearDay = new Date(Date.UTC(gregYear - 1, 8, 11)).getUTCFullYear() % 4 === 3 ? 255 : 254;
        ethDayOfYear = dayOfYear + (365 - prevNewYearDay);
    }
    
    const ethMonth = Math.floor((ethDayOfYear - 1) / 30) + 1;
    const ethDay = ((ethDayOfYear - 1) % 30) + 1;

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
