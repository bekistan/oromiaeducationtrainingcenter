

"use client"

import * as React from "react"
import { Calendar as CalendarIcon } from "lucide-react"
import type { DateRange } from "react-day-picker"

import { cn } from "@/lib/utils"
import { Button } from "@/components/ui/button"
import { Calendar } from "@/components/ui/calendar"
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover"
import { useLanguage } from "@/hooks/use-language"
import { formatEthiopianDate, formatDate } from "@/lib/date-utils"

interface DatePickerWithRangeProps extends React.HTMLAttributes<HTMLDivElement> {
  date?: DateRange;
  onDateChange?: (date: DateRange | undefined) => void;
  disabled?: boolean;
  disableFuture?: boolean;
  disablePast?: boolean;
}

export function DatePickerWithRange({
  className,
  date: initialDate,
  onDateChange,
  disabled: propDisabled,
  disableFuture = false,
  disablePast = false,
}: DatePickerWithRangeProps) {
  const { t } = useLanguage();
  const [date, setDate] = React.useState<DateRange | undefined>(initialDate);
  const [isPopoverOpen, setIsPopoverOpen] = React.useState(false);
  const [ethiopianDisplay, setEthiopianDisplay] = React.useState<string>("");

  React.useEffect(() => {
    if (initialDate) {
      setDate(initialDate);
    }
  }, [initialDate]);

  React.useEffect(() => {
    const generateDisplay = async () => {
        if (date?.from && date?.to) {
            const fromEth = await formatEthiopianDate(date.from, 'full');
            const toEth = await formatEthiopianDate(date.to, 'full');
            setEthiopianDisplay(`${fromEth} - ${toEth}`);
        } else if (date?.from) {
            const fromEth = await formatEthiopianDate(date.from, 'full');
            setEthiopianDisplay(fromEth);
        } else {
            setEthiopianDisplay("");
        }
    };
    generateDisplay();
  }, [date]);


  const handleSelect = (selectedDate: DateRange | undefined) => {
    setDate(selectedDate);
    if (onDateChange) {
      onDateChange(selectedDate);
    }
    if (selectedDate?.from && selectedDate?.to) {
        setIsPopoverOpen(false);
    }
  }

  const today = new Date();
  today.setHours(0,0,0,0);
  
  const calendarDisabledDays = {
    ...(disableFuture && { after: today }),
    ...(disablePast && { before: today }),
  };

  const renderDateDisplay = () => {
    if (date?.from) {
        const gregFrom = formatDate(date.from, 'MMM d, yyyy');
        const gregTo = date.to ? formatDate(date.to, 'MMM d, yyyy') : '';
        const gregDisplay = gregTo ? `${gregFrom} - ${gregTo}` : gregFrom;
        
        return (
          <div className="flex flex-col items-start text-left">
            <span className="text-xs font-semibold">{ethiopianDisplay || t('loading')}...</span>
            <span className="text-xs text-muted-foreground">({t('gregorianAbbr')}: {gregDisplay})</span>
          </div>
        )
    }
    return <span>{t('pickADateRange')}</span>
  }

  return (
    <div className={cn("grid gap-2", className)}>
      <Popover open={isPopoverOpen} onOpenChange={setIsPopoverOpen}>
        <PopoverTrigger asChild>
          <Button
            id="date"
            variant={"outline"}
            disabled={propDisabled}
            className={cn(
              "w-full justify-start text-left font-normal h-auto",
              !date && "text-muted-foreground"
            )}
          >
            <CalendarIcon className="mr-2 h-4 w-4" />
            {renderDateDisplay()}
          </Button>
        </PopoverTrigger>
        <PopoverContent className="w-auto p-0" align="start">
          <Calendar
            initialFocus
            mode="range"
            defaultMonth={date?.from}
            selected={date}
            onSelect={handleSelect}
            numberOfMonths={2}
            disabled={calendarDisabledDays}
          />
        </PopoverContent>
      </Popover>
    </div>
  )
}
