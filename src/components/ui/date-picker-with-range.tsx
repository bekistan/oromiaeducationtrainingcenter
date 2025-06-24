
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
import { formatDateForDisplay } from "@/lib/date-utils";

interface DatePickerWithRangeProps extends React.HTMLAttributes<HTMLDivElement> {
  date?: DateRange;
  onDateChange?: (date: DateRange | undefined) => void;
  disabled?: boolean;
}

export function DatePickerWithRange({
  className,
  date: initialDate,
  onDateChange,
  disabled: propDisabled
}: DatePickerWithRangeProps) {
  const { t, preferredCalendarSystem } = useLanguage();
  const [date, setDate] = React.useState<DateRange | undefined>(initialDate);
  const [isPopoverOpen, setIsPopoverOpen] = React.useState(false);

  React.useEffect(() => {
    if (initialDate) {
      setDate(initialDate);
    }
  }, [initialDate]);

  const handleSelect = (selectedDate: DateRange | undefined) => {
    setDate(selectedDate);
    if (onDateChange) {
      onDateChange(selectedDate);
    }
    if (selectedDate?.from && selectedDate?.to) {
        setIsPopoverOpen(false);
    }
  }

  const displayFormat = preferredCalendarSystem === 'ethiopian' ? 'MMMM D, YYYY' : 'LLL dd, y';
  const today = new Date();
  today.setHours(0,0,0,0);


  return (
    <div className={cn("grid gap-2", className)}>
      <Popover open={isPopoverOpen} onOpenChange={setIsPopoverOpen}>
        <PopoverTrigger asChild>
          <Button
            id="date"
            variant={"outline"}
            disabled={propDisabled}
            className={cn(
              "w-[300px] justify-start text-left font-normal",
              !date && "text-muted-foreground"
            )}
          >
            <CalendarIcon className="mr-2 h-4 w-4" />
            {date?.from ? (
              date.to ? (
                <>
                  {formatDateForDisplay(date.from, preferredCalendarSystem, displayFormat, 'MMMM D, YYYY')} -{" "}
                  {formatDateForDisplay(date.to, preferredCalendarSystem, displayFormat, 'MMMM D, YYYY')}
                </>
              ) : (
                formatDateForDisplay(date.from, preferredCalendarSystem, displayFormat, 'MMMM D, YYYY')
              )
            ) : (
              <span>{t('pickADateRange')}</span>
            )}
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
            disabled={{ before: today }}
          />
        </PopoverContent>
      </Popover>
    </div>
  )
}
