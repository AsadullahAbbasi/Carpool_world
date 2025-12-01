import * as React from "react";

import { cn } from "@/lib/utils";

export interface TextareaProps extends React.TextareaHTMLAttributes<HTMLTextAreaElement> {}

const Textarea = React.forwardRef<HTMLTextAreaElement, TextareaProps>(({ className, ...props }, ref) => {
  return (
    <textarea
      className={cn(
        /* Mobile-first: readable text, comfortable line height, adequate padding */
        "flex min-h-[6rem] w-full rounded-md border border-input bg-background px-[1rem] py-[0.75rem] text-base leading-relaxed ring-offset-background",
        "placeholder:text-muted-foreground",
        "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2",
        "disabled:cursor-not-allowed disabled:opacity-50",
        /* Tablet and up */
        "sm:min-h-[5rem] sm:px-[0.875rem] sm:py-[0.625rem] sm:text-sm sm:leading-normal",
        className,
      )}
      ref={ref}
      {...props}
    />
  );
});
Textarea.displayName = "Textarea";

export { Textarea };
