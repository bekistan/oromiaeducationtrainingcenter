
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
import { formatDateForDisplay } from "@/lib/date-utils"; // Import the new formatter

interface DatePickerWithRangeProps extends React.HTMLAttributes<HTMLDivElement> {
  date?: DateRange;
  onDateChange?: (date: DateRange | undefined) => void;
}

export function DatePickerWithRange({
  className,
  date: initialDate,
  onDateChange,
}: DatePickerWithRangeProps) {
  const { t, preferredCalendarSystem } = useLanguage(); // Get preferredCalendarSystem
  const [date, setDate] = React.useState<DateRange | undefined>(initialDate);

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
  }

  const displayFormat = preferredCalendarSystem === 'ethiopian' ? 'MMMM D, YYYY' : 'LLL dd, y';


  return (
    <div className={cn("grid gap-2", className)}>
      <Popover>
        <PopoverTrigger asChild>
          <Button
            id="date"
            variant={"outline"}
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
          />
        </PopoverContent>
      </Popover>
    </div>
  )
}
