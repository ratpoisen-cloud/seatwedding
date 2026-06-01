import React from 'react';
import { cn } from '../../utils';

interface ButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: 'primary' | 'secondary' | 'danger' | 'ghost';
  size?: 'sm' | 'md' | 'lg' | 'icon';
}

export const Button = React.forwardRef<HTMLButtonElement, ButtonProps>(
  ({ className, variant = 'primary', size = 'md', ...props }, ref) => {
    return (
      <button
        ref={ref}
        className={cn(
          "inline-flex items-center justify-center rounded-xl font-bold transition-all focus:outline-none focus:ring-2 focus:ring-primary/50 disabled:opacity-50 disabled:pointer-events-none active:scale-95",
          {
            'bg-primary text-white hover:bg-primary-hover shadow-sm': variant === 'primary',
            'bg-secondary text-text-main hover:bg-secondary-hover border border-border': variant === 'secondary',
            'bg-red-100 text-red-600 hover:bg-red-200': variant === 'danger',
            'bg-transparent text-text-muted hover:bg-secondary hover:text-text-main': variant === 'ghost',
            'h-9 px-4 text-sm': size === 'sm',
            'h-11 px-5 text-base': size === 'md',
            'h-14 px-8 text-lg': size === 'lg',
            'h-10 w-10 p-0': size === 'icon',
          },
          className
        )}
        {...props}
      />
    );
  }
);
Button.displayName = 'Button';
