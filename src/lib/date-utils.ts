
import { format, parseISO } from 'date-fns';
import type { Timestamp } from 'firebase/firestore';

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
        
        const response = await fetch('/api/convert-date', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ gregorianDate: gregorianDateString }),
        });

        if (!response.ok) {
            const errorData = await response.json().catch(() => ({error: 'API request failed'}));
            console.error("Ethiopian date API error:", errorData.error);
            return formatDate(dateObj); // Fallback on API error
        }

        const data = await response.json();
        const ethiopianDateString: string = data.ethiopianDate; // e.g., "2016-12-25"
        
        if (!ethiopianDateString) return formatDate(dateObj); // Fallback if format is unexpected

        const [year, month, day] = ethiopianDateString.split('-');
        
        // Return date in DD-MM-YYYY format
        return `${String(day).padStart(2, '0')}-${String(month).padStart(2, '0')}-${year}`;

    } catch (error) {
        console.error("Error converting to Ethiopian date via API:", error);
        return formatDate(dateObj); // Fallback to Gregorian format
    }
};


export const formatDualDate = (dateInput: DateInput, primaryFormat: string, secondaryFormat?: string): string => {
  const dateObj = toDateObject(dateInput);
  if (!dateObj) return 'N/A';

  const primaryDate = format(dateObj, primaryFormat);
  return primaryDate;
};
