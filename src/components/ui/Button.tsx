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
          "inline-flex items-center justify-center rounded-xl font-bold transition-all focus:outline-none focus:ring-2 focus:ring-primary/40 disabled:opacity-50 disabled:pointer-events-none active:scale-95",
          {
            'bg-primary text-white hover:bg-primary-hover shadow-sm hover:shadow-[var(--shadow-glow)]': variant === 'primary',
            'bg-white text-text-main hover:bg-secondary-hover border-2 border-primary/30': variant === 'secondary',
            'bg-danger/10 text-danger hover:bg-danger/20 border border-danger/20': variant === 'danger',
            'bg-transparent text-text-muted hover:bg-primary/10 hover:text-text-main': variant === 'ghost',
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
