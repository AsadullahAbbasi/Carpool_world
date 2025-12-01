import * as React from "react";
import { cva, type VariantProps } from "class-variance-authority";

import { cn } from "@/lib/utils";

/* Mobile-first alert with responsive padding and text */
const alertVariants = cva(
  "relative w-full rounded-lg border p-[1rem] sm:p-[1rem] [&>svg~*]:pl-[2rem] sm:[&>svg~*]:pl-[1.75rem] [&>svg+div]:translate-y-[-0.1875rem] [&>svg]:absolute [&>svg]:left-[1rem] [&>svg]:top-[1rem] [&>svg]:text-foreground [&>svg]:size-[1.25rem] sm:[&>svg]:size-[1rem]",
  {
    variants: {
      variant: {
        default: "bg-background text-foreground",
        destructive: "border-destructive/50 text-destructive dark:border-destructive [&>svg]:text-destructive",
      },
    },
    defaultVariants: {
      variant: "default",
    },
  },
);

const Alert = React.forwardRef<
  HTMLDivElement,
  React.HTMLAttributes<HTMLDivElement> & VariantProps<typeof alertVariants>
>(({ className, variant, ...props }, ref) => (
  <div ref={ref} role="alert" className={cn(alertVariants({ variant }), className)} {...props} />
));
Alert.displayName = "Alert";

const AlertTitle = React.forwardRef<HTMLParagraphElement, React.HTMLAttributes<HTMLHeadingElement>>(
  ({ className, ...props }, ref) => (
    <h5 ref={ref} className={cn("mb-[0.5rem] font-medium leading-tight tracking-tight text-base sm:text-sm", className)} {...props} />
  ),
);
AlertTitle.displayName = "AlertTitle";

const AlertDescription = React.forwardRef<HTMLParagraphElement, React.HTMLAttributes<HTMLParagraphElement>>(
  ({ className, ...props }, ref) => (
    <div ref={ref} className={cn("text-base leading-relaxed sm:text-sm sm:leading-normal [&_p]:leading-relaxed", className)} {...props} />
  ),
);
AlertDescription.displayName = "AlertDescription";

export { Alert, AlertTitle, AlertDescription };
