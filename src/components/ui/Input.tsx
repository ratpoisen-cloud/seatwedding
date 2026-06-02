import React from 'react';
import { cn } from '../../utils';

interface InputProps extends React.InputHTMLAttributes<HTMLInputElement> {}

export const Input = React.forwardRef<HTMLInputElement, InputProps>(
  ({ className, ...props }, ref) => {
    return (
      <input
        ref={ref}
        className={cn(
          "flex h-11 w-full rounded-xl border border-accent/30 bg-white px-4 py-2 text-sm transition-colors focus:outline-none focus:border-primary focus:ring-2 focus:ring-primary/20 placeholder:text-text-muted/50 disabled:opacity-50",
          className
        )}
        {...props}
      />
    );
  }
);
Input.displayName = 'Input';
