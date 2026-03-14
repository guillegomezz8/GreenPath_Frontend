import { forwardRef } from 'react';
import { cn } from '@/components/Utils';

const Input = forwardRef(({ className, type, ...props }, ref) => {
  const isDateInput = type === 'date';

  return (
    <input
      type={type}
      className={cn(
        'flex h-10 w-full rounded-md border border-input bg-background/90 px-3 py-2 text-base ring-offset-background file:border-0 file:bg-transparent file:text-sm file:font-medium file:text-foreground placeholder:text-muted-foreground shadow-sm transition-all duration-200 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 focus-visible:border-primary/60 disabled:cursor-not-allowed disabled:opacity-50 md:text-sm',
        isDateInput && 'h-11 min-h-11 pr-11 [color-scheme:light] [&::-webkit-calendar-picker-indicator]:cursor-pointer [&::-webkit-calendar-picker-indicator]:opacity-90 [&::-webkit-date-and-time-value]:text-left [&::-webkit-date-and-time-value]:min-h-[1.5rem] [&::-webkit-datetime-edit]:inline-flex [&::-webkit-datetime-edit]:items-center',
        className
      )}
      ref={ref}
      {...props}
    />
  );
});
Input.displayName = 'Input';


export {
  Input
};
