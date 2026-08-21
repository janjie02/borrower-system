import * as React from "react";
import { cn } from "@/lib/utils";

export interface InputProps extends React.InputHTMLAttributes<HTMLInputElement> {
  label?: string;
  error?: string;
}

const Input = React.forwardRef<HTMLInputElement, InputProps>(
  ({ className, type, label, error, id, ...props }, ref) => {
    const inputId = id ?? label?.toLowerCase().replace(/\s+/g, "-");
    return (
      <div className="space-y-1.5">
        {label && (
          <label htmlFor={inputId} className="text-sm font-medium text-muted-strong">
            {label}
          </label>
        )}
        <input
          type={type}
          id={inputId}
          className={cn(
            "flex h-11 w-full rounded-xl border border-white/12 bg-surface-2 px-3.5 py-2 text-sm text-white placeholder:text-muted/70 transition-colors focus:outline-none focus:ring-2 focus:ring-accent/70 focus:border-transparent disabled:cursor-not-allowed disabled:opacity-50",
            error && "border-red-500/70 focus:ring-red-500/70",
            className
          )}
          ref={ref}
          {...props}
        />
        {error && <p className="text-xs text-red-300">{error}</p>}
      </div>
    );
  }
);
Input.displayName = "Input";

export { Input };
