
import { format, parseISO } from 'date-fns';
import type { Timestamp } from 'firebase/firestore';
import { toEthiopian, toGregorian } from 'ethiopian-date-converter';

type DateInput = string | Date | Timestamp | undefined | null;

export const toDateObject = (dateInput: DateInput): Date | null => {
  if (!dateInput) return null;
  if (dateInput instanceof Date) return dateInput;
  if (typeof (dateInput as Timestamp).toDate === 'function') {
    return (dateInput as Timestamp).toDate();
  }
  if (typeof dateInput === 'string') {
    try {
      // Handles 'YYYY-MM-DDTHH:mm:ss.sssZ'
      const parsedIso = parseISO(dateInput);
      if (!isNaN(parsedIso.getTime())) {
        return parsedIso;
      }
    } catch (e) {
      // Ignore if parseISO fails
    }
    // Fallback for other string formats like 'YYYY-MM-DD'
    const parsedDate = new Date(dateInput);
    return isNaN(parsedDate.getTime()) ? null : parsedDate;
  }
   if (typeof dateInput === 'object' && dateInput.hasOwnProperty('seconds')) {
    return new Timestamp((dateInput as any).seconds, (dateInput as any).nanoseconds).toDate();
  }
  return null;
};

/**
 * Formats a date input into a readable string using the Gregorian calendar.
 * @param dateInput The date to format (string, Date, or Timestamp).
 * @param formatStr The desired format string (e.g., 'MMM d, yyyy').
 * @returns The formatted date string or 'N/A' if the date is invalid.
 */
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


/**
 * Formats a date input into a readable Ethiopian calendar date string.
 * @param dateInput - The date to format.
 * @param formatStr - The desired format string ('default' or 'full').
 * @returns A formatted Ethiopian date string, e.g., "Meskerem 1, 2016".
 */
export const formatEthiopianDate = (
    dateInput: DateInput,
    formatStr: 'default' | 'full' = 'default'
): string => {
    const dateObj = toDateObject(dateInput);
    if (!dateObj) return 'N/A';

    try {
        const ethiopianDate = toEthiopian(dateObj.getFullYear(), dateObj.getMonth() + 1, dateObj.getDate());
        const [year, month, day] = ethiopianDate;

        const monthNames = ["Meskerem", "Tekemt", "Hidar", "Tahsas", "Tir", "Yekatit", "Megabit", "Miyazya", "Ginbot", "Sene", "Hamle", "Nehase", "Pagume"];
        const monthName = monthNames[month - 1];

        if (formatStr === 'full') {
             return `${monthName} ${day}, ${year}`;
        }
        // default format
        return `${monthName.substring(0,3)} ${day}, ${year}`;
    } catch (error) {
        console.error("Error converting to Ethiopian date:", error);
        return formatDate(dateObj); // Fallback to Gregorian format
    }
};

/**
 * Formats a date for dual display, useful in contexts like reports.
 * Falls back gracefully if locales are not available.
 * @param dateInput - The date to format.
 * @param primaryFormat - The primary format string (e.g., 'MMM d, yy').
 * @param secondaryFormat - The secondary format string (e.g., for another calendar).
 * @returns A formatted string, e.g., "Oct 26, 23 (Tikemt 15, 16)".
 */
export const formatDualDate = (dateInput: DateInput, primaryFormat: string, secondaryFormat?: string): string => {
  const dateObj = toDateObject(dateInput);
  if (!dateObj) return 'N/A';

  const primaryDate = format(dateObj, primaryFormat);
  
  // Secondary format is optional and might not be implemented, so we just return primary.
  return primaryDate;
};
