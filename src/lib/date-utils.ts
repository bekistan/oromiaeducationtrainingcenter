
import { format, parseISO } from 'date-fns';
import type { Timestamp } from 'firebase/firestore';

// START: Vendored code from abushakir-date library to remove dependency
const JDN_EPOCH_OFFSET = 1721425.5;
const ETHIOPIAN_EPOCH = JDN_EPOCH_OFFSET + 2796; 
const GREGORIAN_EPOCH = JDN_EPOCH_OFFSET;

const fixedFromEthiopic = (year: number, month: number, day: number): number => {
  return (
    ETHIOPIAN_EPOCH +
    365 * (year - 1) +
    Math.floor((year + 2) / 4) +
    30 * (month - 1) +
    day -
    31
  );
};

const fixedFromGregorian = (year: number, month: number, day: number): number => {
  const month_correction =
    month <= 2 ? year - 1 : year;
  const leap_correction =
    month <= 2
      ? 0
      : Math.floor(month_correction / 4) -
        Math.floor(month_correction / 100) +
        Math.floor(month_correction / 400);
  return (
    GREGORIAN_EPOCH -
    1 +
    365 * (year - 1) +
    leap_correction +
    Math.floor((367 * month - 362) / 12) +
    day
  );
};

class EthiopianDate {
  private moment: Date;
  private _year: number;
  private _month: number;
  private _date: number;
  private dayOfWeek: number;
  private static monthNames = [
    'Meskerem', 'Tikimt', 'Hidar', 'Tahsas', 'Tir', 'Yekatit', 
    'Megabit', 'Miyazya', 'Ginbot', 'Sene', 'Hamle', 'Nehase', 'Pagume'
  ];

  constructor(...args: [Date] | [number, number, number]) {
    if (args.length === 1 && args[0] instanceof Date) {
      this.moment = args[0];
      const fixed = fixedFromGregorian(
        this.moment.getFullYear(),
        this.moment.getMonth() + 1,
        this.moment.getDate()
      );
      this._year = Math.floor((4 * (fixed - ETHIOPIAN_EPOCH) + 1463) / 1461);
      this._month = Math.floor(((fixed - fixedFromEthiopic(this._year, 1, 1)) / 30) + 1);
      this._date = fixed - fixedFromEthiopic(this._year, this._month, 1) + 1;
      this.dayOfWeek = fixed % 7;
    } else if (args.length === 3) {
        this._year = args[0];
        this._month = args[1];
        this._date = args[2];
        const fixed = fixedFromEthiopic(this._year, this._month, this._date);
        this.moment = new Date(this._toGregorian());
        this.dayOfWeek = fixed % 7;
    } else {
        throw new Error('Invalid arguments for EthiopianDate constructor');
    }
  }

  get year() { return this._year; }
  get month() { return this._month; }
  get date() { return this._date; }
  get monthName() { return EthiopianDate.monthNames[this._month - 1]; }
  
  private _toGregorian = (): Date => {
    const fixed = fixedFromEthiopic(this._year, this._month, this._date);
    const approx = Math.floor((fixed - GREGORIAN_EPOCH) / 365.2425);
    const year =
      fixed >= fixedFromGregorian(approx + 1, 1, 1) ? approx + 1 : approx;

    const month_day_prior = fixed - fixedFromGregorian(year, 1, 1);
    const month_correction =
      fixed < fixedFromGregorian(year, 3, 1) ? 0 : this._isGregorianLeap(year) ? 1 : 2;
    const month = Math.floor((12 * (month_day_prior + month_correction) + 373) / 367);
    const day = fixed - fixedFromGregorian(year, month, 1) + 1;
    
    return new Date(year, month - 1, day);
  };
  
  private _isGregorianLeap = (year: number): boolean => {
    return year % 4 === 0 && (year % 100 !== 0 || year % 400 === 0);
  };
}
// END: Vendored code

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
        const ethiopianDate = new EthiopianDate(dateObj);
        const monthName = ethiopianDate.monthName;
        const day = ethiopianDate.date;
        const year = ethiopianDate.year;

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
