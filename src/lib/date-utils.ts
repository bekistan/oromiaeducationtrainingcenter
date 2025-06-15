
import { format as formatGregorian, parseISO as parseISOGregorian } from 'date-fns';
import * as EthiopianDateModule from 'ethiopian-date';
import type { Timestamp } from 'firebase/firestore';
import type { CalendarSystem } from '@/types';

type DateInput = string | Date | Timestamp | undefined;

export const toDateObject = (dateInput: DateInput): Date | null => {
  if (!dateInput) return null;
  if (dateInput instanceof Date) return dateInput;
  if (typeof (dateInput as Timestamp).toDate === 'function') {
    return (dateInput as Timestamp).toDate();
  }
  if (typeof dateInput === 'string') {
    try {
      const parsedIso = parseISOGregorian(dateInput);
      if (!isNaN(parsedIso.getTime())) {
        return parsedIso;
      }
    } catch (e) {
      // Ignore
    }
    const parsedDate = new Date(dateInput);
    return isNaN(parsedDate.getTime()) ? null : parsedDate;
  }
  return null;
};

export const formatGregorianDateInternal = (
    dateObj: Date,
    formatStr: string = 'MMM d, yyyy' // Default format
  ): string => {
  try {
    return formatGregorian(dateObj, formatStr);
  } catch (error) {
    console.error("Error formatting Gregorian date internally:", error, "Date Object:", dateObj);
    return "Invalid Date";
  }
};

export const formatEthiopianDateInternal = (
    dateObj: Date,
    formatStr: string = 'MMMM D, YYYY ERA' // Default format
  ): string => {
  try {
    const [year, month, day] = EthiopianDateModule.toEthiopian(dateObj.getFullYear(), dateObj.getMonth() + 1, dateObj.getDate());
    const ethiopianDateInstance = new EthiopianDateModule.EthiopianDate(year, month, day);
    return EthiopianDateModule.format(ethiopianDateInstance, formatStr);
  } catch (error) {
    console.error("Error formatting Ethiopian date internally:", error, "Date Object:", dateObj);
    return "N/A";
  }
};

/**
 * Formats a date based on the preferred calendar system.
 * @param dateInput The date to format.
 * @param preferredSystem The preferred calendar system ('gregorian' or 'ethiopian').
 * @param gregorianFormatStr Optional format string for Gregorian dates.
 * @param ethiopianFormatStr Optional format string for Ethiopian dates.
 * @returns Formatted date string or 'N/A'.
 */
export const formatDateForDisplay = (
  dateInput: DateInput,
  preferredSystem: CalendarSystem,
  gregorianFormatStr: string = 'MMM d, yyyy', // Default Gregorian format
  ethiopianFormatStr: string = 'MMMM D, YYYY ERA' // Default Ethiopian format
): string => {
  const dateObj = toDateObject(dateInput);
  if (!dateObj || isNaN(dateObj.getTime())) return 'N/A';

  if (preferredSystem === 'ethiopian') {
    return formatEthiopianDateInternal(dateObj, ethiopianFormatStr);
  }
  // Default to Gregorian
  return formatGregorianDateInternal(dateObj, gregorianFormatStr);
};


export const formatDualDate = (
    dateInput: DateInput,
    gregorianFormatStr: string = 'MMM d, yyyy',
    ethiopianFormatStr: string = 'MMMM D, YYYY ERA'
  ): string => {
  const dateObj = toDateObject(dateInput);
  if (!dateObj || isNaN(dateObj.getTime())) return 'N/A';

  try {
    const gregorianFormatted = formatGregorianDateInternal(dateObj, gregorianFormatStr);
    const ethiopianFormatted = formatEthiopianDateInternal(dateObj, ethiopianFormatStr);
    return `${gregorianFormatted} (${ethiopianFormatted})`;
  } catch (error) {
    console.error("Error formatting dual date:", error, "Input:", dateInput);
    // Fallback to Gregorian only if Ethiopian formatting failed or vice-versa
    try { return formatGregorianDateInternal(dateObj, gregorianFormatStr) + " (Eth. N/A)"; }
    catch { return "Invalid Date"; }
  }
};

// Kept for direct Gregorian formatting if needed, independent of preference
export const formatGregorianDate = (
    dateInput: DateInput,
    formatStr: string = 'PPP'
  ): string => {
  const dateObj = toDateObject(dateInput);
  if (!dateObj || isNaN(dateObj.getTime())) return 'N/A';
  return formatGregorianDateInternal(dateObj, formatStr);
};

// Kept for direct Ethiopian formatting if needed, independent of preference
export const formatEthiopianCalendarDate = (
    dateInput: DateInput,
    formatStr: string = 'dddd, MMMM DD, YYYY ERA'
  ): string => {
  const dateObj = toDateObject(dateInput);
  if (!dateObj || isNaN(dateObj.getTime())) return 'N/A';
  return formatEthiopianDateInternal(dateObj, formatStr);
};
