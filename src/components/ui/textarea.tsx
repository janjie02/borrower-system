import * as React from "react";
import { cn } from "@/lib/utils";

export interface TextareaProps extends React.TextareaHTMLAttributes<HTMLTextAreaElement> {
  label?: string;
  error?: string;
}

const Textarea = React.forwardRef<HTMLTextAreaElement, TextareaProps>(
  ({ className, label, error, id, ...props }, ref) => {
    const inputId = id ?? label?.toLowerCase().replace(/\s+/g, "-");
    return (
      <div className="space-y-1.5">
        {label && (
          <label htmlFor={inputId} className="text-sm font-medium text-muted-strong">
            {label}
          </label>
        )}
        <textarea
          id={inputId}
          className={cn(
            "flex min-h-[80px] w-full rounded-xl border border-white/12 bg-surface-2 px-3.5 py-2.5 text-sm text-white placeholder:text-muted/70 transition-colors focus:outline-none focus:ring-2 focus:ring-accent/70 focus:border-transparent disabled:opacity-50",
            error && "border-red-500/70",
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
Textarea.displayName = "Textarea";

export { Textarea };
