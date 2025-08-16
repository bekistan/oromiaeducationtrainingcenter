
import { format, parseISO } from 'date-fns';
import type { Timestamp } from 'firebase/firestore';
import { convertToEthiopianDate } from '@/ai/flows/convert-date-flow';

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
    if (!dateObj) return 'N/A';

    try {
        const gregorianDateString = format(dateObj, 'yyyy-MM-dd');
        const ethiopianDateString = await convertToEthiopianDate({ gregorianDate: gregorianDateString });
        
        if (formatStr === 'default') {
            const parts = ethiopianDateString.split(' ');
            if (parts.length >= 2) {
                return `${parts[0].substring(0, 3)} ${parts[1]} ${parts[2]}`;
            }
        }
        return ethiopianDateString;

    } catch (error) {
        console.error("Error converting to Ethiopian date via AI flow:", error);
        return formatDate(dateObj); // Fallback to Gregorian format
    }
};

export const formatDualDate = (dateInput: DateInput, primaryFormat: string, secondaryFormat?: string): string => {
  const dateObj = toDateObject(dateInput);
  if (!dateObj) return 'N/A';

  const primaryDate = format(dateObj, primaryFormat);
  return primaryDate;
};
