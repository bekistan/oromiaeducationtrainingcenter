

import { format, parseISO } from 'date-fns';
import type { Timestamp } from 'firebase/firestore';
import toEthiopian from 'ethiopian-calendar-date-converter';

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

export const formatEthiopianDate = async (
    dateInput: DateInput,
    formatStr: 'default' | 'full' = 'default'
): Promise<string> => {
    const dateObj = toDateObject(dateInput);
    if (!dateObj) return Promise.resolve('N/A');

    try {
        // The library function is asynchronous, so we must await it.
        const [year, month, day] = await toEthiopian(dateObj.getFullYear(), dateObj.getMonth() + 1, dateObj.getDate());
        
        const monthNames = [
          'Meskerem', 'Tikimt', 'Hidar', 'Tahsas', 'Tir', 'Yekatit', 
          'Megabit', 'Miyazya', 'Ginbot', 'Sene', 'Hamle', 'Nehase', 'Pagume'
        ];
        const monthName = monthNames[month - 1];

        if (formatStr === 'full') {
             return `${monthName} ${day}, ${year}`;
        }
        return `${monthName.substring(0,3)} ${day}, ${year}`;
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
