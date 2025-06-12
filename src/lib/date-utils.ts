
import { format as formatGregorian, parseISO as parseISOGregorian } from 'date-fns';
import { format as formatEthiopian, toEthiopian } from 'ethiopian-date';
import type { Timestamp } from 'firebase/firestore';

/**
 * Converts a date input (string, Date, or Firebase Timestamp) to a Date object.
 */
export const toDateObject = (dateInput: string | Date | Timestamp | undefined): Date | null => {
  if (!dateInput) return null;
  if (dateInput instanceof Date) return dateInput;
  // Check if it's a Firestore Timestamp
  if (typeof (dateInput as Timestamp).toDate === 'function') {
    return (dateInput as Timestamp).toDate();
  }
  // Try parsing as ISO string
  if (typeof dateInput === 'string') {
    try {
      const parsedIso = parseISOGregorian(dateInput);
      if (!isNaN(parsedIso.getTime())) {
        return parsedIso;
      }
    } catch (e) {
      // Ignore if parseISO fails, try new Date()
    }
    // Fallback for other string formats or if parseISO failed
    const parsedDate = new Date(dateInput);
    return isNaN(parsedDate.getTime()) ? null : parsedDate;
  }
  return null;
};

/**
 * Formats a date into a dual string "Gregorian (Ethiopian)".
 * Example: "Jun 12, 2024 (Sene 5, 2016 A.M.)"
 */
export const formatDualDate = (
    dateInput: string | Date | Timestamp | undefined,
    gregorianFormatStr: string = 'MMM d, yyyy', 
    ethiopianFormatStr: string = 'MMM d, yyyy GGG'
  ): string => {
  const dateObj = toDateObject(dateInput);
  if (!dateObj || isNaN(dateObj.getTime())) return 'N/A';

  try {
    const gregorianFormatted = formatGregorian(dateObj, gregorianFormatStr);
    
    const [year, month, day] = toEthiopian(dateObj.getFullYear(), dateObj.getMonth() + 1, dateObj.getDate());
    // Create a Date object for ethiopian-date-fns's format function.
    // Month is 0-indexed for JS Date, toEthiopian returns 1-indexed month.
    const ethiopianDateObjForFormatting = new Date(year, month - 1, day); 
    const ethiopianFormatted = formatEthiopian(ethiopianDateObjForFormatting, ethiopianFormatStr);
    
    return `${gregorianFormatted} (${ethiopianFormatted})`;
  } catch (error) {
    console.error("Error formatting dual date:", error, "Input:", dateInput, "Date Object:", dateObj);
    try {
      return formatGregorian(dateObj, gregorianFormatStr) + " (Eth. N/A)";
    } catch {
      return "Invalid Date";
    }
  }
};

/**
 * Formats a date into Gregorian string.
 */
export const formatGregorianDate = (
    dateInput: string | Date | Timestamp | undefined,
    formatStr: string = 'PPP' // e.g., June 12, 2024
  ): string => {
  const dateObj = toDateObject(dateInput);
  if (!dateObj || isNaN(dateObj.getTime())) return 'N/A';
  try {
    return formatGregorian(dateObj, formatStr);
  } catch (error) {
    console.error("Error formatting Gregorian date:", error, "Input:", dateInput);
    return "Invalid Date";
  }
};

/**
 * Formats a date into Ethiopian string.
 */
export const formatEthiopianDate = (
    dateInput: string | Date | Timestamp | undefined,
    formatStr: string = 'PPP GGG' // e.g., Sene 5, 2016 A.M.
  ): string => {
  const dateObj = toDateObject(dateInput);
  if (!dateObj || isNaN(dateObj.getTime())) return 'N/A';
  try {
    const [year, month, day] = toEthiopian(dateObj.getFullYear(), dateObj.getMonth() + 1, dateObj.getDate());
    const ethiopianDateObjForFormatting = new Date(year, month - 1, day);
    return formatEthiopian(ethiopianDateObjForFormatting, formatStr);
  } catch (error) {
    console.error("Error formatting Ethiopian date:", error, "Input:", dateInput);
    return "N/A";
  }
};
